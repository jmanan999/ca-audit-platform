from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.verification_item import ItemType, VerificationStatus


class VerificationItemCreate(BaseModel):
    audit_id: int
    title: str
    description: Optional[str] = None
    item_type: ItemType = ItemType.OTHER
    reference_value: Optional[str] = None
    is_ai_parsed: bool = False


class VerificationItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    item_type: Optional[ItemType] = None
    reference_value: Optional[str] = None
    status: Optional[VerificationStatus] = None
    ca_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class BulkVerifyRequest(BaseModel):
    item_ids: List[int]
    ca_notes: Optional[str] = None


class VerificationItemResponse(BaseModel):
    id: int
    audit_id: int
    title: str
    description: Optional[str] = None
    item_type: ItemType
    reference_value: Optional[str] = None
    status: VerificationStatus
    ca_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    is_ai_parsed: bool
    workspace_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
