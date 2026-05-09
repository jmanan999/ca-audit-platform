from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True)
    gst_number = Column(String, unique=True, index=True)
    pan_number = Column(String, nullable=True)
    cin_number = Column(String, nullable=True)
    industry = Column(String)
    contact_person = Column(String)
    contact_email = Column(String)
    contact_phone = Column(String)
    financial_year = Column(String)
    address = Column(Text, nullable=True)
    workspace_id = Column(Integer, nullable=True, index=True)  # For multi-tenancy
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    audits = relationship("Audit", back_populates="client", cascade="all, delete-orphan")
