from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, Text, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class ItemType(str, enum.Enum):
    VEHICLE = "vehicle"
    PROPERTY = "property"
    EQUIPMENT = "equipment"
    INVENTORY = "inventory"
    BANK_ACCOUNT = "bank_account"
    FINANCIAL_RECORD = "financial_record"
    OTHER = "other"


class VerificationStatus(str, enum.Enum):
    PENDING = "pending"
    EVIDENCE_SUBMITTED = "evidence_submitted"
    VERIFIED = "verified"
    REJECTED = "rejected"


class VerificationItem(Base):
    __tablename__ = "verification_items"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    item_type = Column(Enum(ItemType), default=ItemType.OTHER)
    reference_value = Column(Text, nullable=True)  # what client's books claim
    status = Column(Enum(VerificationStatus), default=VerificationStatus.PENDING, index=True)
    ca_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    is_ai_parsed = Column(Boolean, default=False)  # True when created via Gemini parse
    # Tally/Zoho bridge fields
    transaction_id = Column(String, nullable=True, index=True)
    ledger_name = Column(String, nullable=True)
    vendor_name = Column(String, nullable=True)
    transaction_date = Column(DateTime, nullable=True)
    is_tally_import = Column(Boolean, default=False)
    is_high_risk = Column(Boolean, default=False, index=True)
    risk_reason = Column(Text, nullable=True)
    workspace_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    audit = relationship("Audit", back_populates="verification_items")
    evidence = relationship("Document", back_populates="verification_item", cascade="all, delete-orphan")
