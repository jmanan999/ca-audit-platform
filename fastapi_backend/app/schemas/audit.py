from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.audit import AuditStatus, RiskLevel

class AuditBase(BaseModel):
    client_id: int
    audit_type: str
    risk_level: RiskLevel = RiskLevel.MEDIUM
    scope: Optional[str] = None
    deadline: datetime
    description: Optional[str] = None

class AuditCreate(AuditBase):
    assigned_to: Optional[int] = None

class AuditUpdate(BaseModel):
    status: Optional[AuditStatus] = None
    risk_level: Optional[RiskLevel] = None
    scope: Optional[str] = None
    deadline: Optional[datetime] = None
    assigned_to: Optional[int] = None

class AuditResponse(AuditBase):
    id: int
    assigned_to: Optional[int] = None
    status: AuditStatus
    start_date: Optional[datetime] = None
    completion_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
