import google.generativeai as genai
from app.core.config import settings
from typing import List, Dict, Any
import json
import logging

logger = logging.getLogger(__name__)

ITEM_TYPES = ["vehicle", "property", "equipment", "inventory", "bank_account", "financial_record", "other"]

BRIEF_PARSE_PROMPT = """You are a CA audit assistant. Extract all physical assets and verification items from this audit brief document.
For each item return an object with exactly these keys:
- "title": short name of the asset (e.g. "Toyota Camry", "Office at MG Road")
- "item_type": one of: vehicle, property, equipment, inventory, bank_account, financial_record, other
- "description": additional details about the item
- "reference_value": what the client's books claim (registration numbers, values, account numbers, quantities, etc.)

Return ONLY a JSON array. No preamble, no explanation.

Document text:
{text}"""


async def parse_brief_with_gemini(text: str) -> List[Dict[str, str]]:
    """Extract verification items from brief text using Gemini with strict JSON output."""
    if not settings.GEMINI_API_KEY:
        logger.warning("Gemini API key not configured — cannot parse brief")
        return []
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        response = model.generate_content(BRIEF_PARSE_PROMPT.format(text=text[:8000]))
        items = json.loads(response.text)
        if not isinstance(items, list):
            items = items.get("items", [])
        valid = []
        for item in items:
            if not isinstance(item, dict) or "title" not in item:
                continue
            valid.append({
                "title": str(item.get("title", "Untitled")),
                "item_type": item.get("item_type", "other") if item.get("item_type") in ITEM_TYPES else "other",
                "description": str(item.get("description", "")),
                "reference_value": str(item.get("reference_value", "")),
            })
        return valid
    except Exception as e:
        logger.error("Gemini brief parse failed: %s", e)
        return []


class AuditAIService:
    """Service for AI-powered audit analysis using Gemini API"""
    
    def __init__(self):
        """Initialize Gemini API client"""
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None
    
    async def generate_audit_insights(self, audit_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate AI insights from audit data using Gemini
        
        Args:
            audit_data: Dictionary containing audit information
            
        Returns:
            List of insights with recommendations
        """
        if not self.model:
            logger.warning("Gemini API not configured")
            return []
        
        try:
            prompt = self._build_audit_analysis_prompt(audit_data)
            
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.7,
                    "top_p": 0.95,
                    "max_output_tokens": 2048,
                }
            )
            
            insights = self._parse_insights_response(response.text)
            return insights
            
        except Exception as e:
            logger.error(f"Error generating audit insights: {str(e)}")
            return []
    
    async def analyze_audit_data_for_anomalies(self, audit_items: List[Dict]) -> Dict[str, Any]:
        """
        Detect anomalies and patterns in audit data
        
        Args:
            audit_items: List of audit transaction items
            
        Returns:
            Dictionary with anomalies and patterns detected
        """
        if not self.model:
            return {"anomalies": [], "patterns": [], "risk_score": 0.0}
        
        try:
            prompt = f"""
            Analyze the following audit transaction items for anomalies and suspicious patterns.
            Focus on:
            1. Duplicate transactions
            2. Round-amount transactions
            3. Off-cycle transactions
            4. Unusual timing patterns
            5. Amount threshold breaches
            
            Transaction data:
            {json.dumps(audit_items[:100], indent=2)}
            
            Return a JSON response with:
            {{
                "anomalies": [
                    {{
                        "type": "anomaly_type",
                        "description": "description",
                        "items": [indices],
                        "risk_level": "HIGH|MEDIUM|LOW",
                        "recommendation": "what to do"
                    }}
                ],
                "patterns": [
                    {{
                        "type": "pattern_type",
                        "description": "description",
                        "count": count,
                        "impact": "impact_description"
                    }}
                ],
                "overall_risk_score": 0.0
            }}
            """
            
            response = self.model.generate_content(prompt)
            result = json.loads(response.text)
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing anomalies: {str(e)}")
            return {"anomalies": [], "patterns": [], "risk_score": 0.0}
    
    async def extract_compliance_findings(self, audit_data: Dict, standards: List[str]) -> List[Dict]:
        """
        Extract compliance findings against specified standards
        
        Args:
            audit_data: Audit information
            standards: List of compliance standards (e.g., IFRS, GAAP)
            
        Returns:
            List of compliance findings
        """
        if not self.model:
            return []
        
        try:
            prompt = f"""
            Based on the audit data provided, identify compliance gaps against these standards: {', '.join(standards)}
            
            Audit Data:
            {json.dumps(audit_data, indent=2)}
            
            For each finding, provide:
            1. Specific standard/requirement violated
            2. Description of the gap
            3. Severity (CRITICAL, HIGH, MEDIUM, LOW)
            4. Recommendation for remediation
            
            Return as JSON array of findings.
            """
            
            response = self.model.generate_content(prompt)
            findings = json.loads(response.text)
            return findings if isinstance(findings, list) else []
            
        except Exception as e:
            logger.error(f"Error extracting compliance findings: {str(e)}")
            return []
    
    async def generate_audit_summary(self, audit_details: Dict) -> str:
        """
        Generate executive summary of audit
        
        Args:
            audit_details: Complete audit information
            
        Returns:
            Executive summary text
        """
        if not self.model:
            return ""
        
        try:
            prompt = f"""
            Generate a concise executive summary (max 500 words) of the following audit:
            
            {json.dumps(audit_details, indent=2)}
            
            Include:
            1. Overall audit scope and objectives
            2. Key findings (max 5)
            3. Main risks identified
            4. Overall risk assessment
            5. Key recommendations (max 5)
            """
            
            response = self.model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            logger.error(f"Error generating audit summary: {str(e)}")
            return ""
    
    def _build_audit_analysis_prompt(self, audit_data: Dict) -> str:
        """Build prompt for Gemini for audit analysis"""
        return f"""
        Analyze this audit data and provide insights:
        
        {json.dumps(audit_data, indent=2)}
        
        Provide insights in JSON format with:
        {{
            "insights": [
                {{
                    "type": "PATTERN|ANOMALY|COMPLIANCE_GAP|EFFICIENCY|RISK",
                    "title": "insight title",
                    "description": "detailed description",
                    "confidence": 0.0,
                    "recommendation": "what to do",
                    "impact_level": "HIGH|MEDIUM|LOW"
                }}
            ]
        }}
        """
    
    def _parse_insights_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse AI response into insights"""
        try:
            # Extract JSON from response
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start >= 0 and end > start:
                json_str = response_text[start:end]
                data = json.loads(json_str)
                return data.get('insights', [])
        except Exception as e:
            logger.error(f"Error parsing insights: {str(e)}")
        return []


class DocumentProcessingAIService:
    """Service for document processing with Gemini"""
    
    def __init__(self):
        """Initialize Gemini API client"""
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-pro')
        else:
            self.model = None
    
    async def classify_document(self, ocr_text: str) -> Dict[str, Any]:
        """Classify document type from OCR text"""
        if not self.model:
            return {"type": "UNKNOWN", "confidence": 0.0}
        
        try:
            prompt = f"""
            Classify this document based on the text content. 
            Possible types: INVOICE, RECEIPT, REPORT, EMAIL, BANK_STATEMENT, EXPENSE_CLAIM, OTHER
            
            Text:
            {ocr_text[:1000]}
            
            Return JSON: {{"type": "TYPE", "confidence": 0.0}}
            """
            
            response = self.model.generate_content(prompt)
            result = json.loads(response.text)
            return result
        except Exception as e:
            logger.error(f"Error classifying document: {str(e)}")
            return {"type": "UNKNOWN", "confidence": 0.0}
    
    async def extract_entities(self, ocr_text: str) -> Dict[str, Any]:
        """Extract key entities from document text"""
        if not self.model:
            return {}
        
        try:
            prompt = f"""
            Extract key entities from this document text.
            Include: vendor/supplier, amount, date, description, reference number, account code.
            
            Text:
            {ocr_text[:2000]}
            
            Return as JSON object with extracted fields.
            """
            
            response = self.model.generate_content(prompt)
            result = json.loads(response.text)
            return result
        except Exception as e:
            logger.error(f"Error extracting entities: {str(e)}")
            return {}


# Global service instances
audit_ai_service = AuditAIService()
document_ai_service = DocumentProcessingAIService()
