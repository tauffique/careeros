"""
main.py — CareerOS FastAPI backend
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import users, projects, applications
from routers.try_router import router as try_router

load_dotenv()

app = FastAPI(title="CareerOS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict to your Vercel domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(projects.router)
app.include_router(applications.router)
app.include_router(try_router)

@app.get("/")
def root():
    return {"status": "ok", "app": "CareerOS API v1.0"}
@app.on_event("startup")
async def startup_reindex():
    """On every startup, re-ingest all user projects into ChromaDB from PostgreSQL."""
    try:
        from db.database import AsyncSessionLocal
        from models.models import Project
        from sqlalchemy import select
        from chromadb_client import upsert_project

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Project).where(Project.is_active == True))
            projects = result.scalars().all()
            for p in projects:
                await upsert_project(str(p.user_id), p)
        print(f"✅ Re-indexed {len(projects)} projects on startup")
    except Exception as e:
        print(f"⚠️ Startup reindex failed: {e}")