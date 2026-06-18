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