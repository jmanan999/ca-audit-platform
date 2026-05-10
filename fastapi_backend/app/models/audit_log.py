from sqlalchemy import Column, String, Integer, DateTime, Text
from datetime import datetime
from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_id = Column(Integer, nullable=True)
    user_name = Column(String, nullable=True)
    action = Column(String)  # created | updated | deleted | status_changed | finalized | imported | exported
    entity_type = Column(String)  # audit | verification_item | document
    entity_id = Column(Integer, nullable=True)
    audit_id = Column(Integer, nullable=True, index=True)
    description = Column(Text, nullable=True)  # human-readable summary
    changes = Column(Text, nullable=True)      # JSON: {"field": [old, new], ...}
    workspace_id = Column(Integer, nullable=True, index=True)
