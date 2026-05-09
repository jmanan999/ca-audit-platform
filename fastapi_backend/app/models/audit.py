from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class AuditStatus(str, enum.Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    UNDER_REVIEW = "under_review"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"

class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Audit(Base):
    __tablename__ = "audits"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), index=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    audit_type = Column(String)
    status = Column(Enum(AuditStatus), default=AuditStatus.PLANNED, index=True)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.MEDIUM)
    scope = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=True)
    deadline = Column(DateTime)
    completion_date = Column(DateTime, nullable=True)
    description = Column(Text, nullable=True)
    workspace_id = Column(Integer, nullable=True, index=True)  # For multi-tenancy
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    client = relationship("Client", back_populates="audits")
    assigned_user = relationship("User", back_populates="assigned_audits")
    tasks = relationship("Task", back_populates="audit", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="audit", cascade="all, delete-orphan")
