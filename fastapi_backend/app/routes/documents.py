import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.document import DocumentCreate, DocumentUpdate, DocumentResponse
from app.models.document import Document, VerificationStatus as DocStatus, DocumentCategory
from app.models.verification_item import VerificationItem, VerificationStatus as ItemStatus
from app.models.audit import Audit
from app.models.client import Client
from app.models.user import User
from app.routes.auth import get_current_user
from app.utils.s3 import upload_file_to_s3, delete_file_from_s3
from app.utils.audit_log import log_action
from app.services.ocr_service import ocr_service
from datetime import datetime
import os

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])

@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    audit_id: Optional[int] = None,
    verification_status: Optional[DocStatus] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(Document.workspace_id == current_user.workspace_id)

    if audit_id:
        query = query.filter(Document.audit_id == audit_id)
    if verification_status:
        query = query.filter(Document.verification_status == verification_status)

    return query.offset(skip).limit(limit).all()

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.workspace_id == current_user.workspace_id
    ).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    audit_id: int,
    file: UploadFile = File(...),
    verification_item_id: Optional[int] = Form(None),
    document_category: str = Form("evidence"),
    executive_notes: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    device_timestamp: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload evidence from a field executive with GSTIN validation on invoices."""
    try:
        file_content = await file.read()
        file_size = len(file_content)

        s3_key = f"audits/{audit_id}/evidence/{int(datetime.utcnow().timestamp())}_{file.filename}"
        file_url = await upload_file_to_s3(file_content, s3_key)

        parsed_dt = None
        if device_timestamp:
            try:
                parsed_dt = datetime.fromisoformat(device_timestamp.replace("Z", "+00:00"))
            except Exception:
                pass

        # Attempt GSTIN extraction and validation for image/PDF evidence
        gstin_validation: Optional[dict] = None
        is_high_risk_gstin = False
        ext = (file.filename or "").rsplit(".", 1)[-1].lower()
        if ext in ("jpg", "jpeg", "png", "pdf", "webp"):
            try:
                ocr_result = await ocr_service.process_document_from_bytes(file_content, ext.upper())
                if ocr_result.get("status") == "COMPLETED":
                    extracted_gstin = ocr_service.extract_gstin(ocr_result.get("text", ""))
                    if extracted_gstin:
                        audit = db.query(Audit).filter(Audit.id == audit_id).first()
                        client_gstin = None
                        if audit:
                            client = db.query(Client).filter(Client.id == audit.client_id).first()
                            client_gstin = client.gst_number if client else None
                        gstin_validation = ocr_service.validate_gstin_against_client(extracted_gstin, client_gstin)
                        is_high_risk_gstin = bool(gstin_validation.get("gstin_mismatch"))
            except Exception:
                pass  # OCR is best-effort; don't fail the upload

        db_document = Document(
            audit_id=audit_id,
            verification_item_id=verification_item_id,
            uploaded_by=current_user.id,
            file_name=file.filename,
            file_path=file_url,
            file_size=file_size,
            document_category=document_category,
            executive_notes=executive_notes,
            latitude=latitude,
            longitude=longitude,
            device_timestamp=parsed_dt,
            workspace_id=current_user.workspace_id,
            extracted_data=json.dumps(gstin_validation) if gstin_validation else None,
        )
        db.add(db_document)

        # Advance item status: pending → evidence_submitted
        if verification_item_id:
            item = db.query(VerificationItem).filter(
                VerificationItem.id == verification_item_id,
                VerificationItem.workspace_id == current_user.workspace_id,
            ).first()
            if item and item.status == ItemStatus.PENDING:
                item.status = ItemStatus.EVIDENCE_SUBMITTED
                item.updated_at = datetime.utcnow()

            # Flag item as high-risk if GSTIN mismatch
            if item and is_high_risk_gstin and not item.is_high_risk:
                item.is_high_risk = True
                item.risk_reason = (
                    f"GSTIN on uploaded document ({gstin_validation.get('extracted_gstin')}) "
                    f"does not match client master ({gstin_validation.get('client_gstin')})"
                )

        db.flush()
        log_action(
            db,
            action="created",
            entity_type="document",
            entity_id=db_document.id,
            audit_id=audit_id,
            description=(
                f"Evidence uploaded: {file.filename}"
                + (" [GSTIN MISMATCH — flagged High Risk]" if is_high_risk_gstin else "")
            ),
            user_id=current_user.id,
            user_name=current_user.name,
            workspace_id=current_user.workspace_id,
        )
        db.commit()
        db.refresh(db_document)
        return db_document
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Upload failed: {str(e)}")

@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: int,
    document_update: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_document = db.query(Document).filter(
        Document.id == document_id,
        Document.workspace_id == current_user.workspace_id
    ).first()

    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")

    update_data = document_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_document, field, value)

    log_action(
        db,
        action="updated",
        entity_type="document",
        entity_id=document_id,
        audit_id=db_document.audit_id,
        description=f"Document updated: {', '.join(update_data.keys())}",
        user_id=current_user.id,
        user_name=current_user.name,
        workspace_id=current_user.workspace_id,
    )
    db.commit()
    db.refresh(db_document)
    return db_document

@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_document = db.query(Document).filter(
        Document.id == document_id,
        Document.workspace_id == current_user.workspace_id
    ).first()

    if not db_document:
        raise HTTPException(status_code=404, detail="Document not found")

    log_action(
        db,
        action="deleted",
        entity_type="document",
        entity_id=document_id,
        audit_id=db_document.audit_id,
        description=f"Evidence deleted: {db_document.file_name}",
        user_id=current_user.id,
        user_name=current_user.name,
        workspace_id=current_user.workspace_id,
    )
    await delete_file_from_s3(db_document.file_path)
    db.delete(db_document)
    db.commit()
    return {"status": "success"}
