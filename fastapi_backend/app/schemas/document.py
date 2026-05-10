from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.document import DocumentType, VerificationStatus, DocumentCategory


class DocumentBase(BaseModel):
    audit_id: int
    document_type: DocumentType = DocumentType.OTHER
    document_category: DocumentCategory = DocumentCategory.EVIDENCE
    file_name: str


class DocumentCreate(DocumentBase):
    verification_item_id: Optional[int] = None
    executive_notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    device_timestamp: Optional[datetime] = None


class DocumentUpdate(BaseModel):
    verification_status: Optional[VerificationStatus] = None
    rejection_reason: Optional[str] = None
    executive_notes: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: int
    uploaded_by: Optional[int] = None
    verification_item_id: Optional[int] = None
    file_path: str        # presigned URL when returned from evidence endpoints; S3 key elsewhere
    file_size: int
    verification_status: VerificationStatus
    extracted_data: Optional[str] = None
    ai_insights: Optional[str] = None
    executive_notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    device_timestamp: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
