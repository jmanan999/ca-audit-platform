from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.document import DocumentType, VerificationStatus

class DocumentBase(BaseModel):
    audit_id: int
    document_type: DocumentType = DocumentType.OTHER
    file_name: str

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    verification_status: Optional[VerificationStatus] = None
    rejection_reason: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: int
    uploaded_by: Optional[int] = None
    file_path: str
    file_size: int
    verification_status: VerificationStatus
    extracted_data: Optional[str] = None
    ai_insights: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
