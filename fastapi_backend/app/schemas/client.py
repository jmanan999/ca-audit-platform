from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ClientBase(BaseModel):
    company_name: str
    gst_number: str
    pan_number: Optional[str] = None
    cin_number: Optional[str] = None
    industry: str
    contact_person: str
    contact_email: str
    contact_phone: str
    financial_year: str
    address: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None

class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
