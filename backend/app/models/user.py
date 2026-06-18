import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class UserRole(str, Enum):
    CEO = 'CEO'
    HEADS = 'Heads'
    HR = 'HR'
    FINANCE = 'Finance'
    PROJECT_OFFICER = 'Project Officer'


class User(SQLModel, table=True):
    __tablename__ = 'users'

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    employee_id: str = Field(unique=True, nullable=False, index=True, max_length=20)
    password_hash: str = Field(nullable=False)
    role: UserRole = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(nullable=False)
    updated_at: datetime = Field(nullable=False)
    last_login_at: Optional[datetime] = Field(default=None)
