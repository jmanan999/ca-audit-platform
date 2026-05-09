from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"

class DocumentType(str, enum.Enum):
    GST_INVOICE = "gst_invoice"
    BANK_STATEMENT = "bank_statement"
    PURCHASE_ORDER = "purchase_order"
    EXPENSE_RECEIPT = "expense_receipt"
    OTHER = "other"

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    file_name = Column(String)
    file_path = Column(String)  # S3 path
    file_size = Column(Integer)
    document_type = Column(Enum(DocumentType), default=DocumentType.OTHER)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING)
    extracted_data = Column(Text, nullable=True)  # JSON string from OCR
    ai_insights = Column(Text, nullable=True)  # Gemini AI analysis
    rejection_reason = Column(Text, nullable=True)
    workspace_id = Column(Integer, nullable=True, index=True)  # For multi-tenancy
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    audit = relationship("Audit", back_populates="documents")
    uploaded_by_user = relationship("User", back_populates="uploaded_documents")
