from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from app.core.database import get_db
from app.models.audit import Audit
from app.models.document import Document
from app.services.ai_service import generate_document_request

router = APIRouter()


@router.get("/audits/{audit_id}/request-list")
async def get_request_list(audit_id: int, db: Session = Depends(get_db)):
    """Generate an AI-powered list of missing documents needed for this audit."""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    uploaded_docs = db.query(Document).filter(Document.audit_id == audit_id).all()
    uploaded_names = [d.file_name for d in uploaded_docs if d.file_name]

    requirements = await generate_document_request(
        audit_type=audit.audit_type or "Statutory",
        scope=audit.scope or "",
        uploaded_doc_names=uploaded_names,
    )

    return {
        "audit_id": audit_id,
        "audit_type": audit.audit_type,
        "last_requested_at": audit.last_requested_at,
        "uploaded_count": len(uploaded_names),
        "requirements": requirements,
    }


@router.post("/audits/{audit_id}/mark-requested")
def mark_requested(audit_id: int, db: Session = Depends(get_db)):
    """Stamp last_requested_at so the CA can see when they last chased the client."""
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    audit.last_requested_at = datetime.utcnow()
    db.commit()
    db.refresh(audit)
    return {"last_requested_at": audit.last_requested_at}
