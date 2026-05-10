from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.user import UserResponse
from app.models.user import User, UserRole, CA_ROLES, EXECUTIVE_ROLES
from app.routes.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/api/v1/executives", tags=["executives"])


def _require_ca(current_user: User):
    if current_user.role not in CA_ROLES:
        raise HTTPException(status_code=403, detail="Only CA or Admin can manage executives")


@router.get("/", response_model=List[UserResponse])
def list_executives(
    is_approved: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_ca(current_user)
    query = db.query(User).filter(User.role.in_(EXECUTIVE_ROLES))
    if is_approved is not None:
        query = query.filter(User.is_approved == is_approved)
    return query.order_by(User.created_at.desc()).all()


@router.put("/{exec_id}/approve", response_model=UserResponse)
def approve_executive(
    exec_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_ca(current_user)
    exec_user = db.query(User).filter(
        User.id == exec_id,
        User.role.in_(EXECUTIVE_ROLES),
    ).first()
    if not exec_user:
        raise HTTPException(status_code=404, detail="Executive not found")
    exec_user.is_approved = True
    exec_user.is_active = True
    exec_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(exec_user)
    return exec_user


@router.put("/{exec_id}/reject", response_model=UserResponse)
def reject_executive(
    exec_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_ca(current_user)
    exec_user = db.query(User).filter(
        User.id == exec_id,
        User.role.in_(EXECUTIVE_ROLES),
    ).first()
    if not exec_user:
        raise HTTPException(status_code=404, detail="Executive not found")
    exec_user.is_approved = False
    exec_user.is_active = False
    exec_user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(exec_user)
    return exec_user


@router.delete("/{exec_id}")
def delete_executive(
    exec_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_ca(current_user)
    exec_user = db.query(User).filter(
        User.id == exec_id,
        User.role.in_(EXECUTIVE_ROLES),
    ).first()
    if not exec_user:
        raise HTTPException(status_code=404, detail="Executive not found")
    db.delete(exec_user)
    db.commit()
    return {"status": "success"}
