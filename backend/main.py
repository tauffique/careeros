"""
main.py — CareerOS FastAPI backend
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from dotenv import load_dotenv
from routers import users, projects, applications
from routers.try_router import router as try_router
from routers.export import router as export_router

load_dotenv()

app = FastAPI(title="CareerOS API", version="1.0.0")

@app.middleware("http")
async def cors_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return Response(status_code=200, headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
        })
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    return response

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
