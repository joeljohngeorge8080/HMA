import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlmodel import Session

from app.models.audit import ActionType, AuditLog
from app.models.user import User


def write_audit(
    session: Session,
    actor: User,
    module_name: str,
    action_type: ActionType,
    record_id: Optional[str] = None,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    remarks: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> None:
    log = AuditLog(
        user_id=actor.id,
        role=actor.role.value,
        module_name=module_name,
        action_type=action_type,
        record_id=record_id,
        old_value=old_value,
        new_value=new_value,
        remarks=remarks,
        ip_address=ip_address,
        created_at=datetime.now(timezone.utc),
    )
    session.add(log)
    # Caller is responsible for session.commit()
