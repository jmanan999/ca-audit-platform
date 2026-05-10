from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Enum, Float
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


class DocumentCategory(str, enum.Enum):
    BRIEF = "brief"      # uploaded by CA as the audit checklist/brief
    EVIDENCE = "evidence"  # uploaded by executive in the field


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), index=True)
    verification_item_id = Column(Integer, ForeignKey("verification_items.id"), nullable=True, index=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    file_name = Column(String)
    file_path = Column(String)  # S3 key/path (NOT a public URL)
    file_size = Column(Integer)
    document_type = Column(Enum(DocumentType), default=DocumentType.OTHER)
    document_category = Column(Enum(DocumentCategory), default=DocumentCategory.EVIDENCE)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING)
    extracted_data = Column(Text, nullable=True)
    ai_insights = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    executive_notes = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)   # GPS at photo capture
    longitude = Column(Float, nullable=True)
    device_timestamp = Column(DateTime, nullable=True)  # device clock when captured
    workspace_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    audit = relationship("Audit", back_populates="documents")
    verification_item = relationship("VerificationItem", back_populates="evidence")
    uploaded_by_user = relationship("User", back_populates="uploaded_documents")
