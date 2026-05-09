from sqlalchemy import Column, String, Integer, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    CA_PARTNER = "ca_partner"
    AUDITOR = "auditor"
    ARTICLE_TRAINEE = "article_trainee"
    CLIENT = "client"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    phone = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.AUDITOR)
    department = Column(String, nullable=True)
    workspace_id = Column(Integer, nullable=True, index=True)  # For multi-tenancy
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assigned_audits = relationship("Audit", back_populates="assigned_user")
    assigned_tasks = relationship("Task", back_populates="assigned_user")
    uploaded_documents = relationship("Document", back_populates="uploaded_by_user")
