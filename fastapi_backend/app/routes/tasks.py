from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])

@router.get("/", response_model=List[TaskResponse])
def list_tasks(
    audit_id: Optional[int] = None,
    assigned_to: Optional[int] = None,
    status: Optional[TaskStatus] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List tasks with optional filters"""
    query = db.query(Task).filter(Task.workspace_id == current_user.workspace_id)
    
    if audit_id:
        query = query.filter(Task.audit_id == audit_id)
    if assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)
    if status:
        query = query.filter(Task.status == status)
    
    tasks = query.offset(skip).limit(limit).all()
    return tasks

@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific task"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.workspace_id == current_user.workspace_id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return task

@router.post("/", response_model=TaskResponse)
def create_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task"""
    db_task = Task(
        **task.dict(),
        workspace_id=current_user.workspace_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    return db_task

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a task"""
    db_task = db.query(Task).filter(
        Task.id == task_id,
        Task.workspace_id == current_user.workspace_id
    ).first()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_task, field, value)
    
    db.commit()
    db.refresh(db_task)
    
    return db_task

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a task"""
    db_task = db.query(Task).filter(
        Task.id == task_id,
        Task.workspace_id == current_user.workspace_id
    ).first()
    
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    db.delete(db_task)
    db.commit()
    
    return {"status": "success"}
