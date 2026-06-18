"""
routers/projects.py — Project CRUD + per-user ChromaDB sync
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from db.database import get_db
from models.models import User, Project
from auth import get_current_user
from chromadb_client import upsert_project, delete_project
import uuid

router = APIRouter(prefix="/projects", tags=["projects"])

class ProjectCreate(BaseModel):
    title: str
    category: Optional[str] = None
    stack: Optional[List[str]] = []
    description: str
    date_range: Optional[str] = None
    display_order: int = 0

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    stack: Optional[List[str]] = None
    description: Optional[str] = None
    date_range: Optional[str] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None


@router.get("/")
async def list_projects(clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user(clerk_id, db)
    result = await db.execute(
        select(Project).where(Project.user_id == user.id).order_by(Project.display_order)
    )
    projects = result.scalars().all()
    return [_serialize(p) for p in projects]


@router.post("/")
async def create_project(project: ProjectCreate, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user(clerk_id, db)
    record = Project(user_id=user.id, **project.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)

    # Sync to ChromaDB
    await upsert_project(str(user.id), record)
    record.chroma_synced = True
    await db.commit()

    return _serialize(record)


@router.put("/{project_id}")
async def update_project(project_id: str, updates: ProjectUpdate, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user(clerk_id, db)
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for key, val in updates.model_dump(exclude_none=True).items():
        setattr(project, key, val)

    project.chroma_synced = False
    await db.commit()

    # Re-sync to ChromaDB with updated content
    await upsert_project(str(user.id), project)
    project.chroma_synced = True
    await db.commit()

    return _serialize(project)


@router.delete("/{project_id}")
async def remove_project(project_id: str, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user(clerk_id, db)
    result = await db.execute(select(Project).where(Project.id == project_id, Project.user_id == user.id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Remove from ChromaDB
    await delete_project(str(user.id), project_id)

    await db.delete(project)
    await db.commit()
    return {"status": "deleted"}


def _serialize(p: Project):
    return {
        "id": str(p.id), "title": p.title, "category": p.category,
        "stack": p.stack or [], "description": p.description,
        "date_range": p.date_range, "is_active": p.is_active,
        "chroma_synced": p.chroma_synced, "display_order": p.display_order,
        "created_at": str(p.created_at), "updated_at": str(p.updated_at),
    }

async def _get_user(clerk_id: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Complete onboarding first")
    return user
