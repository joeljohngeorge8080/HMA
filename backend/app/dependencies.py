import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.core.security import decode_token
from app.database import get_session
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    session: Annotated[Session, Depends(get_session)],
) -> User:
    payload = decode_token(credentials.credentials)
    user_id = payload.get('user_id')
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid token')

    user = session.get(User, uuid.UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='User inactive or not found')
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole):
    def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f'Role {user.role} is not authorized for this action',
            )
        return user
    return checker


def require_hr(user: CurrentUser) -> User:
    if user.role != UserRole.HR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='HR role required')
    return user


def require_not_project_officer(user: CurrentUser) -> User:
    if user.role == UserRole.PROJECT_OFFICER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Access denied')
    return user


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.client.host if request.client else '0.0.0.0'
