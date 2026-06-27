import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class RegisteredUser(SQLModel, table=True):
    __tablename__ = 'registered_users'

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    google_email: str = Field(unique=True, nullable=False, index=True, max_length=255)
    full_name: str = Field(nullable=False, max_length=100)
    role: str = Field(nullable=False, max_length=50)
    added_by: str = Field(default='system', max_length=100)
    added_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)

    # Optional: link back to users table once they log in
    user_id: Optional[uuid.UUID] = Field(default=None, foreign_key='users.id')
