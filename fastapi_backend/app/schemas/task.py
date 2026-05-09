from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.task import TaskStatus, TaskPriority

class TaskBase(BaseModel):
    audit_id: int
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    deadline: datetime
    estimated_hours: Optional[int] = None

class TaskCreate(TaskBase):
    assigned_to: Optional[int] = None

class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    deadline: Optional[datetime] = None
    assigned_to: Optional[int] = None
    time_spent: Optional[int] = None

class TaskResponse(TaskBase):
    id: int
    assigned_to: Optional[int] = None
    status: TaskStatus
    time_spent: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
