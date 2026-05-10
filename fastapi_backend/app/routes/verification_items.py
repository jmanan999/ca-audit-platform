from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.verification_item import (
    VerificationItemCreate, VerificationItemUpdate,
    VerificationItemResponse, BulkVerifyRequest,
)
from app.schemas.document import DocumentResponse
from app.models.verification_item import VerificationItem, VerificationStatus
from app.models.document import Document, DocumentCategory
from app.models.user import User
from app.routes.auth import get_current_user
from app.utils.s3 import generate_presigned_url
from app.utils.audit_log import log_action
from datetime import datetime

router = APIRouter(tags=["verification_items"])


@router.get("/audits/{audit_id}/verification-items", response_model=List[VerificationItemResponse])
def list_verification_items(
    audit_id: int,
    status: Optional[VerificationStatus] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(VerificationItem).filter(
        VerificationItem.audit_id == audit_id,
        VerificationItem.workspace_id == current_user.workspace_id,
    )
    if status:
        query = query.filter(VerificationItem.status == status)
    return query.offset(skip).limit(limit).all()


@router.post("/audits/{audit_id}/verification-items", response_model=VerificationItemResponse)
def create_verification_item(
    audit_id: int,
    item: VerificationItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_item = VerificationItem(
        audit_id=audit_id,
        title=item.title,
        description=item.description,
        item_type=item.item_type,
        reference_value=item.reference_value,
        is_ai_parsed=item.is_ai_parsed,
        workspace_id=current_user.workspace_id,
    )
    db.add(db_item)
    db.flush()
    log_action(
        db,
        action="created",
        entity_type="verification_item",
        entity_id=db_item.id,
        audit_id=audit_id,
        description=f"Item created: "{item.title}"",
        user_id=current_user.id,
        user_name=current_user.name,
        workspace_id=current_user.workspace_id,
    )
    db.commit()
    db.refresh(db_item)
    return db_item


@router.put("/verification-items/{item_id}", response_model=VerificationItemResponse)
def update_verification_item(
    item_id: int,
    update: VerificationItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(VerificationItem).filter(
        VerificationItem.id == item_id,
        VerificationItem.workspace_id == current_user.workspace_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Verification item not found")

    changes = {}
    update_data = update.dict(exclude_unset=True)
    for field, new_val in update_data.items():
        old_val = getattr(item, field, None)
        if old_val != new_val:
            changes[field] = [str(old_val), str(new_val)]
        setattr(item, field, new_val)

    item.updated_at = datetime.utcnow()

    action = "status_changed" if "status" in changes else "updated"
    description = f"Status → {update_data['status']}" if "status" in changes else f"Item updated: {', '.join(changes.keys())}"
    log_action(
        db,
        action=action,
        entity_type="verification_item",
        entity_id=item_id,
        audit_id=item.audit_id,
        description=description,
        changes=changes if changes else None,
        user_id=current_user.id,
        user_name=current_user.name,
        workspace_id=current_user.workspace_id,
    )
    db.commit()
    db.refresh(item)
    return item


@router.post("/verification-items/bulk-verify", response_model=List[VerificationItemResponse])
def bulk_verify_items(
    payload: BulkVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(VerificationItem).filter(
        VerificationItem.id.in_(payload.item_ids),
        VerificationItem.workspace_id == current_user.workspace_id,
    ).all()

    now = datetime.utcnow()
    audit_ids = set()
    for item in items:
        item.status = VerificationStatus.VERIFIED
        if payload.ca_notes:
            item.ca_notes = payload.ca_notes
        item.updated_at = now
        audit_ids.add(item.audit_id)

    for aid in audit_ids:
        log_action(
            db,
            action="status_changed",
            entity_type="verification_item",
            audit_id=aid,
            description=f"Bulk verified {sum(1 for i in items if i.audit_id == aid)} items",
            user_id=current_user.id,
            user_name=current_user.name,
            workspace_id=current_user.workspace_id,
        )

    db.commit()
    for item in items:
        db.refresh(item)
    return items


@router.delete("/verification-items/{item_id}")
def delete_verification_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.query(VerificationItem).filter(
        VerificationItem.id == item_id,
        VerificationItem.workspace_id == current_user.workspace_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Verification item not found")

    log_action(
        db,
        action="deleted",
        entity_type="verification_item",
        entity_id=item_id,
        audit_id=item.audit_id,
        description=f"Item deleted: "{item.title}"",
        user_id=current_user.id,
        user_name=current_user.name,
        workspace_id=current_user.workspace_id,
    )
    db.delete(item)
    db.commit()
    return {"status": "success"}


@router.get("/verification-items/{item_id}/evidence", response_model=List[DocumentResponse])
def get_item_evidence(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    docs = db.query(Document).filter(
        Document.verification_item_id == item_id,
        Document.document_category == DocumentCategory.EVIDENCE,
        Document.workspace_id == current_user.workspace_id,
    ).all()

    result = []
    for doc in docs:
        doc_dict = {
            "id": doc.id,
            "audit_id": doc.audit_id,
            "verification_item_id": doc.verification_item_id,
            "uploaded_by": doc.uploaded_by,
            "file_name": doc.file_name,
            "file_path": generate_presigned_url(doc.file_path),
            "file_size": doc.file_size,
            "document_type": doc.document_type,
            "document_category": doc.document_category,
            "verification_status": doc.verification_status,
            "extracted_data": doc.extracted_data,
            "ai_insights": doc.ai_insights,
            "executive_notes": doc.executive_notes,
            "latitude": doc.latitude,
            "longitude": doc.longitude,
            "device_timestamp": doc.device_timestamp,
            "created_at": doc.created_at,
            "updated_at": doc.updated_at,
        }
        result.append(doc_dict)
    return result
