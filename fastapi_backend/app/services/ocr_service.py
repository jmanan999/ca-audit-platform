import re
import boto3
import logging
from typing import Dict, Any, Optional, List
from app.core.config import settings
import base64
import io
from PIL import Image

# Official GSTIN format: 2-digit state code + PAN (10 chars) + 1 digit + Z + 1 check digit
GSTIN_RE = re.compile(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b")

logger = logging.getLogger(__name__)


class DocumentOCRService:
    """Service for OCR processing using AWS Textract"""
    
    def __init__(self):
        """Initialize AWS Textract client"""
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            self.textract_client = boto3.client(
                'textract',
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
            self.s3_client = boto3.client(
                's3',
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
            )
        else:
            self.textract_client = None
            self.s3_client = None
    
    async def process_document_from_file(self, file_path: str) -> Dict[str, Any]:
        """
        Process document file using Textract
        
        Args:
            file_path: Local file path or S3 path
            
        Returns:
            Dictionary with extracted text and metadata
        """
        if not self.textract_client:
            return {
                "text": "",
                "confidence": 0.0,
                "tables": [],
                "forms": [],
                "status": "FAILED"
            }
        
        try:
            # Process document
            response = self.textract_client.analyze_document(
                Document={
                    'S3Object': {
                        'Bucket': settings.S3_BUCKET_NAME,
                        'Name': file_path
                    }
                },
                FeatureTypes=['TABLES', 'FORMS']
            )
            
            result = self._parse_textract_response(response)
            result["status"] = "COMPLETED"
            return result
            
        except Exception as e:
            logger.error(f"Error processing document with Textract: {str(e)}")
            return {
                "text": "",
                "confidence": 0.0,
                "tables": [],
                "forms": [],
                "status": "FAILED",
                "error": str(e)
            }
    
    async def process_document_from_bytes(self, file_bytes: bytes, file_type: str = "PDF") -> Dict[str, Any]:
        """
        Process document from bytes using Textract
        
        Args:
            file_bytes: Document file bytes
            file_type: File type (PDF, JPEG, PNG)
            
        Returns:
            Dictionary with extracted content
        """
        if not self.textract_client:
            return {"text": "", "confidence": 0.0, "status": "FAILED"}
        
        try:
            response = self.textract_client.analyze_document(
                Document={'Bytes': file_bytes},
                FeatureTypes=['TABLES', 'FORMS']
            )
            
            result = self._parse_textract_response(response)
            result["status"] = "COMPLETED"
            return result
            
        except Exception as e:
            logger.error(f"Error processing document bytes: {str(e)}")
            return {"text": "", "confidence": 0.0, "status": "FAILED", "error": str(e)}
    
    def _parse_textract_response(self, response: Dict) -> Dict[str, Any]:
        """Parse Textract response into structured data"""
        extracted_text = ""
        confidence_scores = []
        tables = []
        forms = []
        key_value_pairs = {}
        
        # Extract blocks
        blocks = response.get('Blocks', [])
        
        for block in blocks:
            if block['BlockType'] == 'PAGE':
                confidence = block.get('Confidence', 0.0)
                confidence_scores.append(confidence)
                
            elif block['BlockType'] == 'LINE':
                text = block.get('Text', '')
                confidence = block.get('Confidence', 0.0)
                extracted_text += text + "\n"
                confidence_scores.append(confidence)
                
            elif block['BlockType'] == 'TABLE':
                table_data = self._extract_table(blocks, block)
                tables.append(table_data)
                
            elif block['BlockType'] == 'KEY_VALUE_SET':
                if block.get('EntityTypes', [])[0] == 'KEY':
                    key_text = block.get('Text', '')
                    key_id = block.get('Id')
                    # Find associated value
                    for rel in block.get('Relationships', []):
                        if rel['Type'] == 'VALUE':
                            key_value_pairs[key_text] = rel.get('Ids', [])
        
        # Calculate average confidence
        avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0
        
        return {
            "text": extracted_text.strip(),
            "confidence": avg_confidence,
            "tables": tables,
            "key_value_pairs": key_value_pairs,
            "character_count": len(extracted_text),
            "line_count": len(extracted_text.split('\n'))
        }
    
    def _extract_table(self, blocks: List[Dict], table_block: Dict) -> Dict[str, Any]:
        """Extract table structure from Textract response"""
        table_data = {
            "rows": [],
            "columns": 0,
            "row_count": 0
        }
        
        # Implementation would extract rows and cells from table block
        # This is a simplified version
        
        return table_data
    
    def extract_gstin(self, text: str) -> Optional[str]:
        """Find the first valid GSTIN in OCR text."""
        match = GSTIN_RE.search(text.upper())
        return match.group(0) if match else None

    def validate_gstin_against_client(
        self,
        extracted_gstin: Optional[str],
        client_gstin: Optional[str],
    ) -> Dict[str, Any]:
        """
        Compare the GSTIN extracted from a document with the client's registered GSTIN.
        Returns a validation result dict that can be stored in document.extracted_data.
        """
        if not extracted_gstin:
            return {"gstin_found": False, "gstin_valid": None, "gstin_mismatch": False}

        if not client_gstin:
            return {"gstin_found": True, "extracted_gstin": extracted_gstin, "gstin_valid": None, "gstin_mismatch": False}

        mismatch = extracted_gstin.upper() != client_gstin.upper()
        return {
            "gstin_found": True,
            "extracted_gstin": extracted_gstin,
            "client_gstin": client_gstin,
            "gstin_valid": not mismatch,
            "gstin_mismatch": mismatch,
            "risk_flag": "GSTIN_MISMATCH" if mismatch else None,
        }

    async def extract_invoices_data(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract structured invoice data from OCR result.

        The GSTIN is extracted with a strict regex rather than keyword matching,
        so it works even when the label format varies.
        """
        raw_text = ocr_result.get("text", "")
        extracted_gstin = self.extract_gstin(raw_text)
        return {
            "invoice_number": self._extract_field_value(ocr_result, "invoice", "number"),
            "date": self._extract_field_value(ocr_result, "date", "invoice date"),
            "due_date": self._extract_field_value(ocr_result, "due date", "due"),
            "vendor_name": self._extract_field_value(ocr_result, "vendor", "supplier"),
            "vendor_gstin": extracted_gstin,
            "total_amount": self._extract_field_value(ocr_result, "total", "amount"),
            "gst_amount": self._extract_field_value(ocr_result, "gst", "tax"),
            "line_items": self._extract_line_items(ocr_result),
            "confidence": ocr_result.get("confidence", 0.0),
        }
    
    def _extract_field_value(self, ocr_result: Dict, *patterns: str) -> Optional[str]:
        """Extract field value using pattern matching"""
        text = ocr_result.get("text", "").lower()
        
        for pattern in patterns:
            if pattern.lower() in text:
                # Simple extraction - find line with pattern and get value
                lines = text.split('\n')
                for line in lines:
                    if pattern.lower() in line:
                        # Extract value after pattern
                        return line
        
        return None
    
    def _extract_line_items(self, ocr_result: Dict) -> List[Dict[str, Any]]:
        """Extract line items from tables in OCR result"""
        line_items = []
        
        for table in ocr_result.get("tables", []):
            # Each row in table could be a line item
            for row in table.get("rows", []):
                line_items.append({
                    "description": row.get("description", ""),
                    "quantity": row.get("quantity", 0),
                    "unit_price": row.get("unit_price", 0.0),
                    "amount": row.get("amount", 0.0)
                })
        
        return line_items


class DocumentValidationService:
    """Service for validating and checking documents for anomalies"""
    
    @staticmethod
    async def validate_invoice(invoice_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate extracted invoice data
        
        Returns:
            Validation result with flags and confidence
        """
        validation_result = {
            "is_valid": True,
            "flags": [],
            "confidence": 0.0,
            "issues": []
        }
        
        # Check for required fields
        required_fields = ["invoice_number", "date", "vendor_name", "total_amount"]
        for field in required_fields:
            if not invoice_data.get(field):
                validation_result["is_valid"] = False
                validation_result["issues"].append(f"Missing required field: {field}")
        
        # Check for suspicious amounts
        amount = invoice_data.get("total_amount")
        if amount:
            # Check if round number (potential fraud indicator)
            if isinstance(amount, str):
                try:
                    amount = float(amount.replace(',', ''))
                except:
                    amount = None
            
            if amount and amount % 100 == 0:
                validation_result["flags"].append("ROUND_AMOUNT")
            
            if amount and amount > 1000000:  # Unusually large
                validation_result["flags"].append("LARGE_AMOUNT")
        
        # Calculate confidence
        missing_count = len(validation_result["issues"])
        validation_result["confidence"] = max(0, 100 - (missing_count * 20)) / 100
        
        return validation_result


# Global service instance
ocr_service = DocumentOCRService()
validation_service = DocumentValidationService()
