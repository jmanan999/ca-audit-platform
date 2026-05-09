from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.models.client import Client
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/v1/clients", tags=["clients"])

@router.get("/", response_model=List[ClientResponse])
def list_clients(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all clients for the workspace"""
    clients = db.query(Client).filter(
        Client.workspace_id == current_user.workspace_id
    ).offset(skip).limit(limit).all()
    return clients

@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific client"""
    client = db.query(Client).filter(
        Client.id == client_id,
        Client.workspace_id == current_user.workspace_id
    ).first()
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return client

@router.post("/", response_model=ClientResponse)
def create_client(
    client: ClientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new client"""
    # Check if GST number already exists
    existing = db.query(Client).filter(Client.gst_number == client.gst_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="GST number already exists")
    
    db_client = Client(
        **client.dict(),
        workspace_id=current_user.workspace_id
    )
    db.add(db_client)
    db.commit()
    db.refresh(db_client)
    
    return db_client

@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    client_update: ClientUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a client"""
    db_client = db.query(Client).filter(
        Client.id == client_id,
        Client.workspace_id == current_user.workspace_id
    ).first()
    
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    update_data = client_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_client, field, value)
    
    db.commit()
    db.refresh(db_client)
    
    return db_client

@router.delete("/{client_id}")
def delete_client(
    client_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a client"""
    db_client = db.query(Client).filter(
        Client.id == client_id,
        Client.workspace_id == current_user.workspace_id
    ).first()
    
    if not db_client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db.delete(db_client)
    db.commit()
    
    return {"status": "success"}
