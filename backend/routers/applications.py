"""
routers/applications.py — Match, ATS score, generate, tracker
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from db.database import get_db
from models.models import User, Application, Project, Education, Certification
from auth import get_current_user
from chromadb_client import query_projects
import anthropic
import os
import json

router = APIRouter(prefix="/applications", tags=["applications"])
client = anthropic.Anthropic()

# ── Schemas ───────────────────────────────────────────────────────────────────

class ExtractJDMeta(BaseModel):
    job_description: str

class MatchRequest(BaseModel):
    job_description: str
    company: str = ""
    role: str = ""
    n_results: int = 3

class ATSRequest(BaseModel):
    application_id: str
    stage: str = "before"
    cv_text_override: str = ""  # optional direct CV text from frontend

class GenerateRequest(BaseModel):
    application_id: str
    doc_type: str           # "cv" or "cl"
    language: str = "English"

class UpdateStatus(BaseModel):
    status: str

# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/extract-meta")
async def extract_jd_meta(req: ExtractJDMeta, clerk_id: str = Depends(get_current_user)):
    """Auto-extract company, role, location from JD."""
    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=200,
        messages=[{"role": "user", "content": f"""Extract from this job description. Return ONLY valid JSON, no other text:
{{"company_name": "...", "role_title": "...", "location": "...", "job_type": "internship|fulltime|werkstudent|parttime"}}

JD: {req.job_description[:1000]}"""}]
    )
    try:
        return json.loads(msg.content[0].text)
    except:
        return {"company_name": "", "role_title": "", "location": "", "job_type": ""}


@router.post("/match")
async def match_jd(req: MatchRequest, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """RAG match + create application draft."""
    user = await _get_user(clerk_id, db)

    # Semantic search over user's ChromaDB collection
    projects = await query_projects(str(user.id), req.job_description, n_results=req.n_results)

    project_context = "\n\n---\n\n".join(
        f"PROJECT: {p['title']}\n{p['content']}" for p in projects
    )

    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=1200,
        messages=[{"role": "user", "content": f"""Tailor CV bullets for this candidate applying to {req.company} for: {req.role}.

RETRIEVED PROJECTS:
{project_context}

JD: {req.job_description[:1500]}

Return:
## Recommended Project Order
1. [name] — [reason]

## Tailored CV Bullets
### [Project]
• bullet
• bullet

## Fit Summary
2 sentences."""}]
    )

    # Save application draft
    app = Application(
        user_id=user.id, company=req.company, role=req.role,
        jd_text=req.job_description, status="draft"
    )
    db.add(app)
    await db.commit()
    await db.refresh(app)

    return {
        "application_id": str(app.id),
        "retrieved_projects": projects,
        "tailored_output": msg.content[0].text,
    }


@router.post("/ats-score")
async def ats_score(req: ATSRequest, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Score CV against JD — before or after tailoring."""
    user = await _get_user(clerk_id, db)
    result = await db.execute(select(Application).where(Application.id == req.application_id, Application.user_id == user.id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Get user's projects for CV content
    proj_result = await db.execute(select(Project).where(Project.user_id == user.id, Project.is_active == True))
    projects = proj_result.scalars().all()
    cv_text = " ".join([f"{p.title} {p.description} {' '.join(p.stack or [])}" for p in projects])
    # Also include skills if available
    try:
        if hasattr(user, 'skills_text') and user.skills_text:
            cv_text += " " + user.skills_text
    except Exception:
        pass

    print(f"ATS scoring: {len(projects)} projects, cv_text length: {len(cv_text)}, stage: {req.stage}")

    latex_text = app.generated_cv_latex or ""
    content_to_score = latex_text if req.stage == "after" and latex_text else cv_text

    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=400,
        messages=[{"role": "user", "content": f"""ATS keyword analysis. Return ONLY valid JSON:
{{"score": 0-100, "matched_keywords": ["kw1","kw2",...], "missing_keywords": ["kw1","kw2",...]}}

CV CONTENT: {content_to_score[:2000]}
JD: {app.jd_text[:1500]}"""}]
    )

    try:
        text = msg.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        data = json.loads(text)
    except Exception as e:
        print(f"ATS JSON parse error: {e}, raw: {msg.content[0].text[:200]}")
        data = {"score": 0, "matched_keywords": [], "missing_keywords": []}

    if req.stage == "before":
        app.ats_score_before = data["score"]
        app.matched_keywords_before = data.get("matched_keywords", [])
        app.missing_keywords_before = data.get("missing_keywords", [])
    else:
        app.ats_score_after = data["score"]
        app.missing_keywords_after = data.get("missing_keywords", [])

    await db.commit()
    return data


@router.post("/generate")
async def generate_doc(req: GenerateRequest, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Generate CV or cover letter LaTeX for an application."""
    user = await _get_user(clerk_id, db)
    result = await db.execute(select(Application).where(Application.id == req.application_id, Application.user_id == user.id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Get full user profile for the document
    edu_result = await db.execute(select(Education).where(Education.user_id == user.id))
    cert_result = await db.execute(select(Certification).where(Certification.user_id == user.id))
    education = edu_result.scalars().all()
    certifications = cert_result.scalars().all()

    candidate = f"""
Name: {user.full_name}
Email: {user.email}
Phone: {user.phone or ''}
Address: {user.address or ''}
LinkedIn: {user.linkedin_url or ''}
GitHub: {user.github_url or ''}
Education: {'; '.join([f"{e.degree} {e.field}, {e.institution}, {e.start_date}–{e.end_date}" for e in education])}
Certifications: {'; '.join([f"{c.name} — {c.issuer}, {c.date_obtained}" for c in certifications])}
"""

    if req.doc_type == "cv":
        prompt = f"""Generate a one-page LaTeX CV. Return ONLY raw LaTeX, no markdown fences.

CANDIDATE: {candidate}
COMPANY: {app.company}, ROLE: {app.role}
OUTPUT LANGUAGE: {req.language}

FORMAT RULES (follow exactly):
- documentclass 10.5pt a4paper, margins 1.8cm all sides
- \\section headings: bold uppercase with horizontal rule below
- PROFILE section: 2-3 sentences tailored to the JD, no bullets
- TECHNICAL SKILLS: tabularx with \\textbf{{Category:}} inline, comma-separated, NO bullet points
  Example row: \\textbf{{AI / LLMs:}} & LangChain, ChromaDB, Claude API \\\\
- PROJECTS: \\textbf{{Title}} | \\textit{{stack · stack}}\\hfill date, then 2-3 bullet points
- EDUCATION: institution bold left, degree italic below, location+date right
- CERTIFICATIONS: tabularx two columns, cert name bold left, date right
- One page only, 10.5pt, hypersetup colorlinks=false hidelinks

JD CONTEXT (for profile tailoring):
{app.jd_text[:600] if app.jd_text else ''}"""

        msg = client.messages.create(model="claude-sonnet-4-6", max_tokens=2500,
            messages=[{"role": "user", "content": prompt}])
        app.generated_cv_latex = msg.content[0].text.strip()

    else:
        prompt = f"""Generate a one-page LaTeX cover letter. Return ONLY raw LaTeX, no markdown fences.

CANDIDATE: {candidate}
COMPANY: {app.company}, ROLE: {app.role}
JD: {app.jd_text[:1000] if app.jd_text else ''}
OUTPUT LANGUAGE: {req.language}

RULES: 3 paragraphs max, subject line "Bewerbung: {app.role} — {app.company}", formal register, closing "Mit freundlichen Grüßen,"."""

        msg = client.messages.create(model="claude-sonnet-4-6", max_tokens=1500,
            messages=[{"role": "user", "content": prompt}])
        app.generated_cl_latex = msg.content[0].text.strip()

    await db.commit()
    return {"latex": app.generated_cv_latex if req.doc_type == "cv" else app.generated_cl_latex}


@router.get("/")
async def list_applications(clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user(clerk_id, db)
    result = await db.execute(select(Application).where(Application.user_id == user.id).order_by(Application.created_at.desc()))
    apps = result.scalars().all()
    return [_serialize(a) for a in apps]


@router.delete("/{app_id}")
async def delete_application(app_id: str, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user(clerk_id, db)
    result = await db.execute(select(Application).where(Application.id == app_id, Application.user_id == user.id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Not found")
    await db.delete(app)
    await db.commit()
    return {"status": "deleted"}


@router.patch("/{app_id}/status")
async def update_status(app_id: str, req: UpdateStatus, clerk_id: str = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    user = await _get_user(clerk_id, db)
    result = await db.execute(select(Application).where(Application.id == app_id, Application.user_id == user.id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Not found")
    app.status = req.status
    await db.commit()
    return {"status": "ok"}


def _serialize(a: Application):
    return {
        "id": str(a.id), "company": a.company, "role": a.role,
        "location": a.location, "job_type": a.job_type, "status": a.status,
        "ats_score_before": a.ats_score_before, "ats_score_after": a.ats_score_after,
        "output_language": a.output_language,
        "created_at": str(a.created_at), "applied_at": str(a.applied_at),
    }

async def _get_user(clerk_id: str, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Complete onboarding first")
    return user