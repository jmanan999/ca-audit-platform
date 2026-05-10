import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(tags=["audit_trail"])


@router.get("/audits/{audit_id}/trail")
def get_audit_trail(
    audit_id: int,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the immutable audit trail for a given audit."""
    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.audit_id == audit_id,
            AuditLog.workspace_id == current_user.workspace_id,
        )
        .order_by(AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "timestamp": log.timestamp,
            "user_name": log.user_name or "System",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "description": log.description,
            "changes": json.loads(log.changes) if log.changes else None,
        }
        for log in logs
    ]
