import json
from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    action: str,
    entity_type: str,
    description: str,
    entity_id: Optional[int] = None,
    audit_id: Optional[int] = None,
    user_id: Optional[int] = None,
    user_name: Optional[str] = None,
    changes: Optional[dict] = None,
    workspace_id: Optional[int] = None,
) -> None:
    """Add an AuditLog entry. Caller is responsible for db.commit()."""
    log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        audit_id=audit_id,
        description=description,
        changes=json.dumps(changes) if changes else None,
        user_id=user_id,
        user_name=user_name,
        workspace_id=workspace_id,
    )
    db.add(log)
