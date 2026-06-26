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
    skills_text: Optional[str] = None

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
            "skills_text": user.skills_text,
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


from sqlalchemy import delete as sql_delete

@router.post("/me/skills")
async def update_skills(data: dict, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Update skills_text directly — no email needed."""
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.skills_text = data.get("skills_text", "")
    await db.commit()
    return {"status": "ok"}


@router.post("/me/import-cv")
async def import_cv(data: dict, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Bulk import from CV upload — clears existing education and certs first to avoid duplicates."""
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()

    # Create user if doesn't exist
    if not user:
        user = User(
            clerk_id=clerk_id,
            email=data.get("email", ""),
            full_name=data.get("full_name", ""),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Update profile — skip email to avoid unique constraint violations
    for field in ["full_name", "phone", "address", "linkedin_url", "github_url", "portfolio_url"]:
        if data.get(field):
            setattr(user, field, data[field])

    # Clear existing education and certs to avoid duplicates
    await db.execute(sql_delete(Education).where(Education.user_id == user.id))
    await db.execute(sql_delete(Certification).where(Certification.user_id == user.id))

    # Add fresh education
    for i, e in enumerate(data.get("education", [])):
        db.add(Education(
            user_id=user.id,
            institution=e.get("institution", ""),
            degree=e.get("degree", ""),
            field=e.get("field", ""),
            location=e.get("location", ""),
            start_date=e.get("start_date", ""),
            end_date=e.get("end_date", ""),
            display_order=i,
        ))

    # Add fresh certifications
    for i, c in enumerate(data.get("certifications", [])):
        db.add(Certification(
            user_id=user.id,
            name=c.get("name", ""),
            issuer=c.get("issuer", ""),
            date_obtained=c.get("date_obtained", ""),
            display_order=i,
        ))

    await db.commit()
    return {"status": "ok", "user_id": str(user.id)}


@router.delete("/me/education/{edu_id}")
async def delete_education(edu_id: str, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user(clerk_id, db)
    await db.execute(sql_delete(Education).where(Education.id == edu_id, Education.user_id == user.id))
    await db.commit()
    return {"status": "deleted"}


@router.delete("/me/certifications/{cert_id}")
async def delete_certification(cert_id: str, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user(clerk_id, db)
    await db.execute(sql_delete(Certification).where(Certification.id == cert_id, Certification.user_id == user.id))
    await db.commit()
    return {"status": "deleted"}


async def _get_user(clerk_id: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found — complete onboarding first")
    return user