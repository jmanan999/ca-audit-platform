from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.audit import AuditCreate, AuditUpdate, AuditResponse
from app.models.audit import Audit, AuditStatus
from app.models.user import User
from app.routes.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/v1/audits", tags=["audits"])

@router.get("/", response_model=List[AuditResponse])
def list_audits(
    status: Optional[AuditStatus] = None,
    client_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List audits with optional filters"""
    query = db.query(Audit).filter(Audit.workspace_id == current_user.workspace_id)
    
    if status:
        query = query.filter(Audit.status == status)
    if client_id:
        query = query.filter(Audit.client_id == client_id)
    
    audits = query.offset(skip).limit(limit).all()
    return audits

@router.get("/{audit_id}", response_model=AuditResponse)
def get_audit(
    audit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific audit"""
    audit = db.query(Audit).filter(
        Audit.id == audit_id,
        Audit.workspace_id == current_user.workspace_id
    ).first()
    
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    return audit

@router.post("/", response_model=AuditResponse)
def create_audit(
    audit: AuditCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new audit"""
    db_audit = Audit(
        **audit.dict(),
        workspace_id=current_user.workspace_id,
        start_date=datetime.utcnow()
    )
    db.add(db_audit)
    db.commit()
    db.refresh(db_audit)
    
    return db_audit

@router.put("/{audit_id}", response_model=AuditResponse)
def update_audit(
    audit_id: int,
    audit_update: AuditUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an audit"""
    db_audit = db.query(Audit).filter(
        Audit.id == audit_id,
        Audit.workspace_id == current_user.workspace_id
    ).first()
    
    if not db_audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    update_data = audit_update.dict(exclude_unset=True)
    
    # If status changed to completed, set completion_date
    if update_data.get("status") == AuditStatus.COMPLETED:
        update_data["completion_date"] = datetime.utcnow()
    
    for field, value in update_data.items():
        setattr(db_audit, field, value)
    
    db.commit()
    db.refresh(db_audit)
    
    return db_audit

@router.delete("/{audit_id}")
def delete_audit(
    audit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an audit"""
    db_audit = db.query(Audit).filter(
        Audit.id == audit_id,
        Audit.workspace_id == current_user.workspace_id
    ).first()
    
    if not db_audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    db.delete(db_audit)
    db.commit()
    
    return {"status": "success"}
