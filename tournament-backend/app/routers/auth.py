import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.limiter import limiter
from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.user import GoogleAuthInput, TokenResponse, UserCreate, UserLogin, UserResponse
from app.utils.auth import create_access_token, get_password_hash, verify_password
from app.utils.upload import upload_player_photo

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
async def register(request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        id=uuid.uuid4(),
        name=user_data.name,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: User = Depends(get_current_user)):
    token = create_access_token({"sub": str(current_user.id), "role": current_user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/google", response_model=TokenResponse)
@limiter.limit("10/minute")
async def google_auth(request: Request, body: GoogleAuthInput, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google authentication is not configured")
    try:
        idinfo = google_id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Google token")

    google_sub = idinfo["sub"]
    email = idinfo["email"]
    name = idinfo.get("name") or email.split("@")[0]

    result = await db.execute(select(User).where(User.google_id == google_sub))
    user = result.scalar_one_or_none()

    google_avatar = idinfo.get("picture")

    if not user:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.google_id = google_sub
            if not user.avatar_url and google_avatar:
                user.avatar_url = google_avatar
        else:
            user = User(
                id=uuid.uuid4(),
                name=name,
                email=email,
                password_hash=None,
                google_id=google_sub,
                avatar_url=google_avatar,
                role="player",
                is_active=True,
            )
            db.add(user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    await db.commit()
    await db.refresh(user)
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me/role", response_model=UserResponse)
async def update_my_role(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from typing import Literal
    valid = {"player", "team_owner", "scorer"}
    role = body.get("role")
    if role not in valid:
        raise HTTPException(status_code=400, detail=f"Role must be one of: {', '.join(sorted(valid))}")
    current_user.role = role
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    name: str | None = Form(None),
    avatar: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if name is not None:
        name = name.strip()
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Name must be at least 2 characters")
        current_user.name = name

    if avatar is not None and avatar.filename:
        current_user.avatar_url = await upload_player_photo(avatar)

    await db.commit()
    await db.refresh(current_user)
    return current_user
