from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.phase2 import (
    AuditFinding, AuditEvidence, AuditInsight, ProcessedDocument
)
from app.models.audit import Audit
from app.services.ai_service import audit_ai_service, document_ai_service
from app.services.ocr_service import ocr_service, validation_service
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json

router = APIRouter(prefix="/api/v2", tags=["ai_intelligence"])


# ==================== Schemas ====================

class FindingCreate(BaseModel):
    audit_id: int
    title: str
    description: str
    severity: str
    category: str
    recommendation: Optional[str] = None
    assigned_to: Optional[int] = None
    due_date: Optional[datetime] = None


class FindingResponse(BaseModel):
    id: int
    audit_id: int
    title: str
    description: str
    severity: str
    status: str
    category: str
    ai_generated: bool
    confidence_score: float
    recommendation: Optional[str]
    assigned_to: Optional[int]
    due_date: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True


class InsightCreate(BaseModel):
    audit_id: int
    insight_type: str
    title: str
    description: str
    confidence_score: float
    recommendation: str
    impact_level: str


class InsightResponse(BaseModel):
    id: int
    audit_id: int
    insight_type: str
    title: str
    description: str
    confidence_score: float
    recommendation: str
    impact_level: str
    actionable: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class DocumentAnalysisResponse(BaseModel):
    document_id: int
    ocr_text: str
    document_type: str
    key_fields: dict
    entities: dict
    fraud_score: float
    anomalies: List[str]
    processing_status: str
    processed_at: datetime


# ==================== AI Insights Endpoints ====================

@router.post("/audits/{audit_id}/analyze")
async def analyze_audit_ai(
    audit_id: int,
    db: Session = Depends(get_db)
):
    """Generate AI insights for an audit"""
    try:
        audit = db.query(Audit).filter(Audit.id == audit_id).first()
        if not audit:
            raise HTTPException(status_code=404, detail="Audit not found")
        
        # Prepare audit data for AI analysis
        audit_data = {
            "audit_id": audit.id,
            "client_id": audit.client_id,
            "period": f"{audit.start_date} to {audit.end_date}",
            "status": audit.status,
            "objectives": audit.objectives,
            "scope": audit.scope,
            "tasks_count": len(audit.tasks) if audit.tasks else 0,
            "documents_count": len(audit.documents) if audit.documents else 0
        }
        
        # Get AI insights
        insights_data = await audit_ai_service.generate_audit_insights(audit_data)
        
        # Store insights in database
        stored_insights = []
        for insight in insights_data:
            db_insight = AuditInsight(
                audit_id=audit_id,
                insight_type=insight.get("type", "GENERAL"),
                title=insight.get("title", ""),
                description=insight.get("description", ""),
                ai_model="gemini-pro",
                confidence_score=insight.get("confidence", 0.0),
                recommendation=insight.get("recommendation", ""),
                impact_level=insight.get("impact_level", "MEDIUM"),
                actionable=insight.get("actionable", True)
            )
            db.add(db_insight)
            stored_insights.append(db_insight)
        
        db.commit()
        
        return {
            "audit_id": audit_id,
            "insights_count": len(stored_insights),
            "insights": [InsightResponse.from_orm(i) for i in stored_insights],
            "analysis_timestamp": datetime.utcnow()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing audit: {str(e)}")


@router.get("/audits/{audit_id}/insights")
async def get_audit_insights(
    audit_id: int,
    insight_type: Optional[str] = Query(None),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    db: Session = Depends(get_db)
):
    """Get AI insights for an audit"""
    query = db.query(AuditInsight).filter(AuditInsight.audit_id == audit_id)
    
    if insight_type:
        query = query.filter(AuditInsight.insight_type == insight_type)
    
    query = query.filter(AuditInsight.confidence_score >= min_confidence)
    
    insights = query.order_by(AuditInsight.confidence_score.desc()).all()
    
    return {
        "audit_id": audit_id,
        "insights_count": len(insights),
        "insights": [InsightResponse.from_orm(i) for i in insights]
    }


@router.post("/audits/{audit_id}/detect-anomalies")
async def detect_audit_anomalies(
    audit_id: int,
    db: Session = Depends(get_db)
):
    """Detect anomalies in audit data"""
    try:
        audit = db.query(Audit).filter(Audit.id == audit_id).first()
        if not audit:
            raise HTTPException(status_code=404, detail="Audit not found")
        
        # Prepare items for anomaly detection
        audit_items = []
        if audit.tasks:
            audit_items = [
                {
                    "id": task.id,
                    "status": task.status,
                    "amount": getattr(task, 'amount', 0),
                    "created_at": task.created_at.isoformat()
                }
                for task in audit.tasks
            ]
        
        # Detect anomalies
        anomaly_result = await audit_ai_service.analyze_audit_data_for_anomalies(audit_items)
        
        return {
            "audit_id": audit_id,
            "anomaly_detection": anomaly_result,
            "timestamp": datetime.utcnow()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error detecting anomalies: {str(e)}")


@router.get("/audits/{audit_id}/findings")
async def get_audit_findings(
    audit_id: int,
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get findings for an audit"""
    query = db.query(AuditFinding).filter(AuditFinding.audit_id == audit_id)
    
    if severity:
        query = query.filter(AuditFinding.severity == severity)
    
    if status:
        query = query.filter(AuditFinding.status == status)
    
    findings = query.order_by(AuditFinding.created_at.desc()).all()
    
    return {
        "audit_id": audit_id,
        "findings_count": len(findings),
        "findings": [FindingResponse.from_orm(f) for f in findings]
    }


@router.post("/audits/{audit_id}/findings")
async def create_finding(
    audit_id: int,
    finding: FindingCreate,
    db: Session = Depends(get_db)
):
    """Create a finding"""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    db_finding = AuditFinding(**finding.dict(), audit_id=audit_id)
    db.add(db_finding)
    db.commit()
    db.refresh(db_finding)
    
    return FindingResponse.from_orm(db_finding)


@router.put("/findings/{finding_id}")
async def update_finding(
    finding_id: int,
    finding: FindingCreate,
    db: Session = Depends(get_db)
):
    """Update a finding"""
    db_finding = db.query(AuditFinding).filter(AuditFinding.id == finding_id).first()
    if not db_finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    
    for field, value in finding.dict(exclude_unset=True).items():
        setattr(db_finding, field, value)
    
    db.commit()
    db.refresh(db_finding)
    
    return FindingResponse.from_orm(db_finding)


# ==================== Document Processing Endpoints ====================

@router.post("/documents/{document_id}/process")
async def process_document_ocr(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Process document with OCR and AI"""
    try:
        # Get document from database (assuming it has been uploaded to S3)
        # For now, we'll process from S3 path
        
        file_key = f"documents/{document_id}"
        
        # Process with Textract
        ocr_result = await ocr_service.process_document_from_file(file_key)
        
        if ocr_result["status"] == "FAILED":
            raise HTTPException(status_code=500, detail=f"OCR failed: {ocr_result.get('error')}")
        
        # Classify document with AI
        classification = await document_ai_service.classify_document(ocr_result["text"])
        
        # Extract entities with AI
        entities = await document_ai_service.extract_entities(ocr_result["text"])
        
        # Store processing results
        processed_doc = ProcessedDocument(
            document_id=document_id,
            ocr_text=ocr_result["text"],
            ocr_confidence=ocr_result["confidence"],
            detected_entities=entities,
            document_type=classification.get("type", "UNKNOWN"),
            key_fields=entities,
            processing_status="COMPLETED",
            processed_at=datetime.utcnow()
        )
        
        db.add(processed_doc)
        db.commit()
        db.refresh(processed_doc)
        
        return {
            "document_id": document_id,
            "processing_status": "COMPLETED",
            "document_type": classification.get("type"),
            "confidence": ocr_result["confidence"],
            "text_length": len(ocr_result["text"]),
            "entities": entities,
            "processed_at": processed_doc.processed_at
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


@router.get("/documents/{document_id}/analysis")
async def get_document_analysis(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Get analysis for a processed document"""
    processed_doc = db.query(ProcessedDocument).filter(
        ProcessedDocument.document_id == document_id
    ).first()
    
    if not processed_doc:
        raise HTTPException(status_code=404, detail="Document processing not found")
    
    return {
        "document_id": document_id,
        "ocr_confidence": processed_doc.ocr_confidence,
        "document_type": processed_doc.document_type,
        "key_fields": processed_doc.key_fields,
        "entities": processed_doc.detected_entities,
        "fraud_score": processed_doc.fraud_score,
        "anomalies": processed_doc.anomalies,
        "processing_status": processed_doc.processing_status,
        "processed_at": processed_doc.processed_at
    }


@router.post("/documents/{document_id}/validate-invoice")
async def validate_invoice_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    """Validate extracted invoice data"""
    try:
        processed_doc = db.query(ProcessedDocument).filter(
            ProcessedDocument.document_id == document_id
        ).first()
        
        if not processed_doc:
            raise HTTPException(status_code=404, detail="Document processing not found")
        
        # Extract invoice data
        invoice_data = await ocr_service.extract_invoices_data({
            "text": processed_doc.ocr_text,
            "confidence": processed_doc.ocr_confidence
        })
        
        # Validate
        validation_result = await validation_service.validate_invoice(invoice_data)
        
        return {
            "document_id": document_id,
            "invoice_data": invoice_data,
            "validation": validation_result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating invoice: {str(e)}")


@router.get("/audits/{audit_id}/audit-summary")
async def get_audit_summary(
    audit_id: int,
    db: Session = Depends(get_db)
):
    """Get AI-generated audit summary"""
    try:
        audit = db.query(Audit).filter(Audit.id == audit_id).first()
        if not audit:
            raise HTTPException(status_code=404, detail="Audit not found")
        
        audit_details = {
            "audit_id": audit.id,
            "objectives": audit.objectives,
            "scope": audit.scope,
            "period": f"{audit.start_date} to {audit.end_date}",
            "status": audit.status,
            "findings": len(db.query(AuditFinding).filter(
                AuditFinding.audit_id == audit_id
            ).all())
        }
        
        summary = await audit_ai_service.generate_audit_summary(audit_details)
        
        return {
            "audit_id": audit_id,
            "summary": summary,
            "generated_at": datetime.utcnow()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating summary: {str(e)}")
