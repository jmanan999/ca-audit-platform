from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.schemas.audit import AuditCreate, AuditUpdate, AuditResponse
from app.models.audit import Audit, AuditStatus
from app.models.user import User, CA_ROLES
from app.routes.auth import get_current_user
from app.utils.audit_log import log_action
from datetime import datetime


class FinalizeRequest(BaseModel):
    ca_approval_notes: Optional[str] = None

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
    """List audits. Executives only see audits explicitly assigned to them."""
    query = db.query(Audit).filter(Audit.workspace_id == current_user.workspace_id)

    if current_user.role not in CA_ROLES:
        query = query.filter(Audit.assigned_to == current_user.id)

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
    query = db.query(Audit).filter(
        Audit.id == audit_id,
        Audit.workspace_id == current_user.workspace_id,
    )
    if current_user.role not in CA_ROLES:
        query = query.filter(Audit.assigned_to == current_user.id)

    audit = query.first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    return audit

@router.post("/", response_model=AuditResponse)
def create_audit(
    audit: AuditCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_audit = Audit(
        **audit.dict(),
        workspace_id=current_user.workspace_id,
        start_date=datetime.utcnow()
    )
    db.add(db_audit)
    db.flush()
    log_action(
        db,
        action="created",
        entity_type="audit",
        entity_id=db_audit.id,
        audit_id=db_audit.id,
        description=f"Audit created: {audit.audit_type}",
        user_id=current_user.id,
        user_name=current_user.name,
        workspace_id=current_user.workspace_id,
    )
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
    db_audit = db.query(Audit).filter(
        Audit.id == audit_id,
        Audit.workspace_id == current_user.workspace_id
    ).first()

    if not db_audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    update_data = audit_update.dict(exclude_unset=True)

    changes = {}
    for field, new_val in update_data.items():
        old_val = getattr(db_audit, field, None)
        if str(old_val) != str(new_val):
            changes[field] = [str(old_val), str(new_val)]

    if update_data.get("status") == AuditStatus.COMPLETED:
        update_data["completion_date"] = datetime.utcnow()

    for field, value in update_data.items():
        setattr(db_audit, field, value)

    action = "status_changed" if "status" in changes else "updated"
    desc = f"Status → {update_data['status']}" if "status" in changes else f"Updated: {', '.join(changes.keys())}"
    log_action(
        db,
        action=action,
        entity_type="audit",
        entity_id=audit_id,
        audit_id=audit_id,
        description=desc,
        changes=changes if changes else None,
        user_id=current_user.id,
        user_name=current_user.name,
        workspace_id=current_user.workspace_id,
    )
    db.commit()
    db.refresh(db_audit)
    return db_audit

@router.put("/{audit_id}/finalize", response_model=AuditResponse)
def finalize_audit(
    audit_id: int,
    body: FinalizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """CA final sign-off — marks audit as completed."""
    db_audit = db.query(Audit).filter(
        Audit.id == audit_id,
        Audit.workspace_id == current_user.workspace_id,
    ).first()
    if not db_audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    db_audit.status = AuditStatus.COMPLETED
    db_audit.completion_date = datetime.utcnow()
    if body.ca_approval_notes:
        db_audit.description = (db_audit.description or "") + f"\n\nCA Approval Notes: {body.ca_approval_notes}"

    log_action(
        db,
        action="finalized",
        entity_type="audit",
        entity_id=audit_id,
        audit_id=audit_id,
        description=f"Audit finalized by {current_user.name}" + (f": {body.ca_approval_notes}" if body.ca_approval_notes else ""),
        user_id=current_user.id,
        user_name=current_user.name,
        workspace_id=current_user.workspace_id,
    )
    db.commit()
    db.refresh(db_audit)
    return db_audit


@router.delete("/{audit_id}")
def delete_audit(
    audit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_audit = db.query(Audit).filter(
        Audit.id == audit_id,
        Audit.workspace_id == current_user.workspace_id
    ).first()

    if not db_audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    log_action(
        db,
        action="deleted",
        entity_type="audit",
        entity_id=audit_id,
        audit_id=audit_id,
        description=f"Audit deleted: {db_audit.audit_type}",
        user_id=current_user.id,
        user_name=current_user.name,
        workspace_id=current_user.workspace_id,
    )
    db.delete(db_audit)
    db.commit()
    return {"status": "success"}
