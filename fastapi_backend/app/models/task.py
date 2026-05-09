from sqlalchemy import Column, String, Integer, DateTime, Enum, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"

class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), index=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING, index=True)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    deadline = Column(DateTime)
    estimated_hours = Column(Integer, nullable=True)
    time_spent = Column(Integer, default=0)
    workspace_id = Column(Integer, nullable=True, index=True)  # For multi-tenancy
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    audit = relationship("Audit", back_populates="tasks")
    assigned_user = relationship("User", back_populates="assigned_tasks")
