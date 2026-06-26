"""
main.py — CareerOS FastAPI backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import users, projects, applications
from routers.try_router import router as try_router
from routers.export import router as export_router
import os
origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # keep * for now
)

load_dotenv()

app = FastAPI(title="CareerOS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(projects.router)
app.include_router(applications.router)
app.include_router(try_router)
app.include_router(export_router)

@app.get("/")
def root():
    return {"status": "ok", "app": "CareerOS API v1.0"}

@app.on_event("startup")
async def startup_reindex():
    """Re-index all projects into ChromaDB from PostgreSQL on every startup."""
    try:
        from db.database import AsyncSessionLocal
        from models.models import Project
        from sqlalchemy import select
        from chromadb_client import upsert_project

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Project).where(Project.is_active == True))
            projects_list = result.scalars().all()
            for p in projects_list:
                await upsert_project(str(p.user_id), p)
            print(f"✅ Re-indexed {len(projects_list)} projects on startup")
    except Exception as e:
        print(f"⚠️ Startup reindex skipped: {e}")