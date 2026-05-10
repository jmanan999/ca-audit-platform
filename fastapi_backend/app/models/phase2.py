from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Boolean, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class ComplianceStandard(Base):
    """Audit compliance standards (IFRS, GAAP, etc.)"""
    __tablename__ = "compliance_standards"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, index=True)
    description = Column(Text)
    code = Column(String(20), unique=True)
    jurisdiction = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditFinding(Base):
    """Audit findings and recommendations"""
    __tablename__ = "audit_findings"
    
    id = Column(Integer, primary_key=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), index=True)
    title = Column(String(200))
    description = Column(Text)
    severity = Column(Enum("CRITICAL", "HIGH", "MEDIUM", "LOW"), default="MEDIUM")
    status = Column(Enum("OPEN", "IN_PROGRESS", "RESOLVED", "ACKNOWLEDGED"), default="OPEN")
    category = Column(String(50))
    ai_generated = Column(Boolean, default=False)
    confidence_score = Column(Float, default=0.0)  # 0-1 score for AI findings
    recommendation = Column(Text)
    assigned_to = Column(Integer, ForeignKey("users.id"))
    due_date = Column(DateTime)
    resolved_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    audit = relationship("Audit", back_populates="findings")
    assigned_user = relationship("User")


class AuditEvidence(Base):
    """Supporting evidence for audit findings"""
    __tablename__ = "audit_evidence"
    
    id = Column(Integer, primary_key=True)
    finding_id = Column(Integer, ForeignKey("audit_findings.id"), index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    evidence_type = Column(Enum("INVOICE", "RECEIPT", "REPORT", "EMAIL", "SCREENSHOT", "OTHER"))
    description = Column(Text)
    extracted_text = Column(Text)  # Extracted via OCR
    ai_analysis = Column(JSON)  # AI analysis results
    verified = Column(Boolean, default=False)
    verified_by = Column(Integer, ForeignKey("users.id"))
    verified_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    finding = relationship("AuditFinding")
    document = relationship("Document")
    verified_user = relationship("User")


class ProcessedDocument(Base):
    """OCR and AI processing results for documents"""
    __tablename__ = "processed_documents"
    
    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"), unique=True)
    ocr_text = Column(Text)  # Full text extracted via OCR
    ocr_confidence = Column(Float, default=0.0)  # 0-1 score
    detected_entities = Column(JSON)  # Named entities, amounts, dates
    document_type = Column(String(50))  # Invoice, Receipt, Report, etc.
    key_fields = Column(JSON)  # Extracted key fields
    ai_summary = Column(Text)  # AI-generated summary
    fraud_score = Column(Float, default=0.0)  # 0-1 fraud likelihood
    anomalies = Column(JSON)  # Detected anomalies
    processing_status = Column(Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED"))
    error_message = Column(Text)
    processed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    document = relationship("Document")


class AuditInsight(Base):
    """AI-generated audit insights"""
    __tablename__ = "audit_insights"
    
    id = Column(Integer, primary_key=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), index=True)
    insight_type = Column(Enum("PATTERN", "ANOMALY", "COMPLIANCE_GAP", "EFFICIENCY", "RISK"))
    title = Column(String(200))
    description = Column(Text)
    ai_model = Column(String(50))  # e.g., "gemini-pro"
    confidence_score = Column(Float, default=0.0)  # 0-1 score
    recommendation = Column(Text)
    related_findings = Column(JSON)  # IDs of related findings
    impact_level = Column(Enum("HIGH", "MEDIUM", "LOW"))
    actionable = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    audit = relationship("Audit", back_populates="insights")
