import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class ActionType(str, Enum):
    CREATE = 'Create'
    UPDATE = 'Update'
    DELETE = 'Delete'
    CORRECTION = 'Correction'
    LOGIN = 'Login'
    LOGOUT = 'Logout'
    OVERRIDE = 'Override'
    PASSWORD_RESET = 'PasswordReset'
    SALARY_INCREMENT = 'SalaryIncrement'
    STATUS_CHANGE = 'StatusChange'
    DOCUMENT_UPLOAD = 'DocumentUpload'


class AuditLog(SQLModel, table=True):
    __tablename__ = 'audit_logs'

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key='users.id', nullable=False, index=True)
    role: str = Field(nullable=False, max_length=50)
    module_name: str = Field(nullable=False, max_length=100, index=True)
    action_type: ActionType = Field(nullable=False, index=True)
    record_id: Optional[str] = Field(default=None, max_length=100)
    old_value: Optional[Any] = Field(default=None, sa_column=Column(JSONB, nullable=True))
    new_value: Optional[Any] = Field(default=None, sa_column=Column(JSONB, nullable=True))
    remarks: Optional[str] = Field(default=None)
    ip_address: Optional[str] = Field(default=None, max_length=45)
    created_at: datetime = Field(nullable=False, index=True)
