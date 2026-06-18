"""
routers/users.py — User profile endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from models.models import User, Education, Certification
from auth import get_current_user
import uuid

router = APIRouter(prefix="/users", tags=["users"])

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    ui_language: Optional[str] = "en"
    output_language: Optional[str] = "English"

class EducationCreate(BaseModel):
    institution: str
    degree: Optional[str] = None
    field: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    display_order: int = 0

class CertificationCreate(BaseModel):
    name: str
    issuer: Optional[str] = None
    date_obtained: Optional[str] = None
    display_order: int = 0

# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/me")
async def get_profile(clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    edu = await db.execute(select(Education).where(Education.user_id == user.id).order_by(Education.display_order))
    certs = await db.execute(select(Certification).where(Certification.user_id == user.id).order_by(Certification.display_order))

    return {
        "user": {
            "id": str(user.id), "email": user.email, "full_name": user.full_name,
            "phone": user.phone, "address": user.address,
            "linkedin_url": user.linkedin_url, "github_url": user.github_url,
            "portfolio_url": user.portfolio_url,
            "ui_language": user.ui_language, "output_language": user.output_language,
        },
        "education": [{"id": str(e.id), "institution": e.institution, "degree": e.degree,
                       "field": e.field, "location": e.location, "start_date": e.start_date,
                       "end_date": e.end_date} for e in edu.scalars()],
        "certifications": [{"id": str(c.id), "name": c.name, "issuer": c.issuer,
                            "date_obtained": c.date_obtained} for c in certs.scalars()],
    }


@router.post("/me")
async def upsert_profile(profile: UserProfile, email: str, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Create or update user profile. Called after Clerk sign-up."""
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()

    if user:
        for key, val in profile.model_dump(exclude_none=True).items():
            setattr(user, key, val)
    else:
        user = User(clerk_id=clerk_id, email=email, **profile.model_dump(exclude_none=True))
        db.add(user)

    await db.commit()
    return {"status": "ok", "user_id": str(user.id)}


@router.post("/me/education")
async def add_education(edu: EducationCreate, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user(clerk_id, db)
    record = Education(user_id=user.id, **edu.model_dump())
    db.add(record)
    await db.commit()
    return {"id": str(record.id)}


@router.post("/me/certifications")
async def add_certification(cert: CertificationCreate, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user(clerk_id, db)
    record = Certification(user_id=user.id, **cert.model_dump())
    db.add(record)
    await db.commit()
    return {"id": str(record.id)}


async def _get_user(clerk_id: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found — complete onboarding first")
    return user
