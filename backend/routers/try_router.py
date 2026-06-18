"""
routers/try_router.py — Free trial endpoints, no auth required.
Uses hybrid retrieval (BGE + BM25 + cross-encoder) same as authenticated users.
Rate limited to 1 match per IP per 24 hours.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import anthropic
import chromadb
from chromadb.utils import embedding_functions
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder
import os, re, time, json
from collections import defaultdict

router = APIRouter(prefix="/try", tags=["try"])
client = anthropic.Anthropic()

CHROMA_PATH = os.environ.get("CHROMA_PATH", "./chroma_db")
DEMO_COLLECTION = "demo_projects"

# ── IP Rate Limiter ───────────────────────────────────────────────────────────
# In-memory store: {ip: [timestamp, ...]}
# Resets on server restart — good enough for MVP
_ip_requests: dict = defaultdict(list)
TRIAL_LIMIT = 1          # max free matches per IP
WINDOW_HOURS = 24        # per 24 hours

def check_rate_limit(ip: str):
    now = time.time()
    window = WINDOW_HOURS * 3600
    # Keep only timestamps within the window
    _ip_requests[ip] = [t for t in _ip_requests[ip] if now - t < window]
    if len(_ip_requests[ip]) >= TRIAL_LIMIT:
        hours_left = int((window - (now - _ip_requests[ip][0])) / 3600) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Free trial limit reached. Create a free account to continue, or try again in {hours_left} hour(s)."
        )
    _ip_requests[ip].append(now)

ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="BAAI/bge-large-en-v1.5"
)

_reranker = None
def get_reranker():
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _reranker

def _tokenize(text): return re.findall(r"[a-z0-9]+", text.lower())

DEMO_PROJECTS = [
    {"id": "demo-1", "title": "RAG & Multi-Agent AI Pipeline", "category": "AI Engineering",
     "content": "Production multi-agent automation system using n8n, Claude API, LangChain, ChromaDB. Deployed on Hetzner VPS. Autonomous agents for workflow automation, document retrieval, and structured output generation."},
    {"id": "demo-2", "title": "Predictive Maintenance ML Pipeline", "category": "Machine Learning",
     "content": "End-to-end ML pipeline on NASA CMAPSS dataset. KMeans clustering + XGBoost regression for Remaining Useful Life prediction. RMSE 17.59 on FD002. Optuna hyperparameter tuning. Streamlit dashboard."},
    {"id": "demo-3", "title": "Full-Stack SaaS Platform", "category": "Full-Stack",
     "content": "Production SaaS platform built with Next.js, FastAPI, PostgreSQL, Railway, Vercel. Multi-currency billing, RBAC, booking workflows. Sole developer owning full SDLC for real client."},
]

def get_demo_collection():
    chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
    col = chroma_client.get_or_create_collection(name=DEMO_COLLECTION, embedding_function=ef, metadata={"hnsw:space": "cosine"})
    if col.count() == 0:
        col.upsert(
            ids=[p["id"] for p in DEMO_PROJECTS],
            documents=[p["content"] for p in DEMO_PROJECTS],
            metadatas=[{"title": p["title"], "category": p["category"]} for p in DEMO_PROJECTS],
        )
    return col

def hybrid_search(query: str, n_results: int = 3) -> list[dict]:
    collection = get_demo_collection()
    semantic = collection.query(query_texts=[query], n_results=collection.count(), include=["documents", "metadatas", "distances"])
    candidates = [{
        "id": semantic["ids"][0][i],
        "title": semantic["metadatas"][0][i]["title"],
        "category": semantic["metadatas"][0][i]["category"],
        "content": semantic["documents"][0][i],
        "semantic_rank": i,
        "semantic_score": round(1 - semantic["distances"][0][i], 4),
    } for i in range(len(semantic["ids"][0]))]

    # BM25
    bm25 = BM25Okapi([_tokenize(c["content"]) for c in candidates])
    bm25_scores = bm25.get_scores(_tokenize(query))
    bm25_ranked = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)
    bm25_rank_map = {idx: rank for rank, idx in enumerate(bm25_ranked)}
    for i, c in enumerate(candidates):
        c["bm25_rank"] = bm25_rank_map[i]

    # RRF fusion
    k = 60
    for c in candidates:
        c["rrf"] = (1/(k+c["semantic_rank"])) + (1/(k+c["bm25_rank"]))
    candidates.sort(key=lambda x: x["rrf"], reverse=True)

    # Cross-encoder rerank
    pool = candidates[:n_results * 2]
    if len(pool) > 1:
        scores = get_reranker().predict([(query, c["content"]) for c in pool])
        for i, c in enumerate(pool): c["ce_score"] = float(scores[i])
        pool.sort(key=lambda x: x["ce_score"], reverse=True)

    final = pool[:n_results]
    if final:
        mx, mn = max(c.get("ce_score", 0) for c in final), min(c.get("ce_score", 0) for c in final)
        rng = mx - mn if mx != mn else 1
        for c in final:
            c["relevance_score"] = round((c.get("ce_score", 0) - mn) / rng * 0.35 + 0.65, 3)
    return [{"id": c["id"], "title": c["title"], "category": c["category"], "content": c["content"], "relevance_score": c.get("relevance_score", c["semantic_score"])} for c in final]


class ExtractCVRequest(BaseModel):
    pdf_base64: str  # base64 encoded PDF

class ExtractRequest(BaseModel):
    job_description: str

class TryProject(BaseModel):
    title: str
    category: str = ""
    stack: list[str] = []
    description: str
    date_range: str = ""

class TryMatchRequest(BaseModel):
    job_description: str
    company: str = ""
    role: str = ""
    projects: list[TryProject] = []  # user's own projects from CV upload

class TryGenerateRequest(BaseModel):
    job_description: str
    tailored_output: str
    company: str = ""
    role: str = ""
    language: str = "English"
    doc_type: str = "cv"
    candidate: dict = {}  # extracted CV data


@router.post("/extract-cv")
def try_extract_cv(req: ExtractCVRequest):
    """Extract all CV data from uploaded PDF — no auth, no rate limit."""
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": req.pdf_base64,
                    }
                },
                {
                    "type": "text",
                    "text": """Extract ALL information from this CV. Return ONLY valid JSON, no markdown fences, no other text:
{
  "full_name": "...",
  "email": "...",
  "phone": "...",
  "address": "...",
  "linkedin_url": "...",
  "github_url": "...",
  "portfolio_url": "...",
  "education": [
    {"institution": "...", "degree": "...", "field": "...", "location": "...", "start_date": "...", "end_date": "..."}
  ],
  "certifications": [
    {"name": "...", "issuer": "...", "date_obtained": "..."}
  ],
  "projects": [
    {"title": "...", "category": "...", "stack": ["tech1", "tech2"], "description": "detailed description of what was built, key results, and impact", "date_range": "..."}
  ],
  "skills": ["skill1", "skill2"]
}

Rules:
- For projects, write a rich 3-5 sentence description combining all bullet points
- Extract every project, education entry, certification, and skill
- Use empty string "" for missing fields, empty array [] for missing lists
- Do not invent information not present in the CV"""
                }
            ]
        }]
    )
    try:
        text = msg.content[0].text.strip()
        # Strip markdown fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse CV: {str(e)}")


@router.post("/extract-meta")
def try_extract_meta(req: ExtractRequest):
    """Extract company/role from JD — no rate limit, no auth."""
    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=150,
        messages=[{"role": "user", "content": f"""Extract from this JD. Return ONLY valid JSON, no other text:
{{"company_name": "...", "role_title": "...", "location": "...", "job_type": "internship|fulltime|werkstudent|parttime"}}
JD: {req.job_description[:800]}"""}]
    )
    try:
        return json.loads(msg.content[0].text)
    except:
        return {"company_name": "", "role_title": "", "location": "", "job_type": ""}


@router.post("/match")
def try_match(req: TryMatchRequest, request: Request):
    """Free trial match — rate limited to 1 per IP per 24h."""
    ip = request.client.host
    check_rate_limit(ip)

    # Use user's own projects if provided, else fall back to demo projects
    if req.projects:
        # Build in-memory BM25 + cross-encoder search over user's projects
        candidates = []
        for i, p in enumerate(req.projects):
            text = f"{p.title}\nCategory: {p.category}\nStack: {', '.join(p.stack)}\n\n{p.description}"
            candidates.append({
                "id": f"user-{i}",
                "title": p.title,
                "category": p.category,
                "content": text,
                "semantic_rank": i,
            })

        # BM25 over user projects
        bm25 = BM25Okapi([_tokenize(c["content"]) for c in candidates])
        bm25_scores = bm25.get_scores(_tokenize(req.job_description))
        bm25_ranked = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)
        bm25_rank_map = {idx: rank for rank, idx in enumerate(bm25_ranked)}
        for i, c in enumerate(candidates):
            c["bm25_rank"] = bm25_rank_map[i]
            c["bm25_score"] = round(float(bm25_scores[i]), 4)

        # RRF fusion
        k = 60
        for c in candidates:
            c["rrf"] = (1/(k+c["semantic_rank"])) + (1/(k+c["bm25_rank"]))
        candidates.sort(key=lambda x: x["rrf"], reverse=True)

        # Cross-encoder rerank
        pool = candidates[:min(len(candidates), 6)]
        if len(pool) > 1:
            scores = get_reranker().predict([(req.job_description, c["content"]) for c in pool])
            for i, c in enumerate(pool):
                c["ce_score"] = float(scores[i])
            pool.sort(key=lambda x: x["ce_score"], reverse=True)

        n = min(3, len(pool))
        final = pool[:n]
        if final:
            mx = max(c.get("ce_score", 0) for c in final)
            mn = min(c.get("ce_score", 0) for c in final)
            rng = mx - mn if mx != mn else 1
            for c in final:
                c["relevance_score"] = round((c.get("ce_score", 0) - mn) / rng * 0.35 + 0.65, 3)

        projects = [{
            "id": c["id"], "title": c["title"], "category": c["category"],
            "content": c["content"],
            "relevance_score": c.get("relevance_score", 0.7),
            "debug": {"bm25": c.get("bm25_score", 0)},
        } for c in final]
    else:
        projects = hybrid_search(req.job_description, n_results=3)

    context = "\n\n".join(f"PROJECT: {p['title']}\n{p['content']}" for p in projects)

    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=1000,
        messages=[{"role": "user", "content": f"""Generate tailored CV bullets for applying to {req.company or 'a company'} for: {req.role or 'this role'}.

RETRIEVED PROJECTS:
{context}

JD: {req.job_description[:1200]}

Format:
## Recommended Project Order
1. [name] — [reason]

## Tailored CV Bullets
### [Project]
• bullet
• bullet

## Fit Summary
2 sentences."""}]
    )
    return {"retrieved_projects": projects, "tailored_output": msg.content[0].text}


class TryATSRequest(BaseModel):
    job_description: str
    cv_text: str        # raw CV text or generated LaTeX
    stage: str = "before"

@router.post("/ats-score")
def try_ats_score(req: TryATSRequest):
    """ATS score for demo — no auth, no rate limit (cheap call)."""
    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=400,
        messages=[{"role": "user", "content": f"""ATS keyword analysis. Return ONLY valid JSON, no other text:
{{"score": 0-100, "matched_keywords": ["kw1","kw2",...], "missing_keywords": ["kw1","kw2",...]}}

CV CONTENT: {req.cv_text[:2000]}
JD: {req.job_description[:1500]}"""}]
    )
    try:
        return json.loads(msg.content[0].text)
    except:
        return {"score": 0, "matched_keywords": [], "missing_keywords": []}


@router.post("/generate")
def try_generate(req: TryGenerateRequest):
    """Free trial document generation — uses real candidate data if provided."""
    c = req.candidate
    candidate_info = f"""
Name: {c.get('full_name', '')}
Email: {c.get('email', '')}
Phone: {c.get('phone', '')}
Address: {c.get('address', '')}
LinkedIn: {c.get('linkedin_url', '')}
GitHub: {c.get('github_url', '')}
Education: {'; '.join([f"{e.get('degree','')} {e.get('field','')}, {e.get('institution','')}, {e.get('start_date','')}–{e.get('end_date','')}" for e in c.get('education', [])])}
Certifications: {'; '.join([f"{cert.get('name','')} — {cert.get('issuer','')}, {cert.get('date_obtained','')}" for cert in c.get('certifications', [])])}
Skills: {', '.join(c.get('skills', []))}
""" if c else "Candidate details not provided."

    if req.doc_type == "cv":
        prompt = f"""Generate a one-page LaTeX CV matching this EXACT format. Return ONLY raw LaTeX, no markdown fences.

CANDIDATE DETAILS:
{candidate_info}

TAILORED BULLETS (use for project section, keep 2-3 per project):
{req.tailored_output[:1000]}

JD CONTEXT (for profile sentence): {req.job_description[:300]}
OUTPUT LANGUAGE: {req.language}

EXACT FORMAT TO FOLLOW:
\\documentclass[10.5pt,a4paper]{{article}}
\\usepackage[T1]{{fontenc}}
\\usepackage[utf8]{{inputenc}}
\\usepackage{{lmodern}}
\\usepackage[a4paper,top=1.8cm,bottom=1.8cm,left=1.8cm,right=1.8cm]{{geometry}}
\\usepackage{{xcolor,hyperref,tabularx,enumitem,titlesec,parskip}}
\\hypersetup{{colorlinks=false,hidelinks}}
\\titleformat{{\\section}}{{\\normalfont\\bfseries\\small\\uppercase}}{{}}{{0em}}{{}}[\\vspace{{-4pt}}\\rule{{\\linewidth}}{{0.4pt}}\\vspace{{2pt}}]
\\titlespacing{{\\section}}{{0pt}}{{8pt}}{{4pt}}
\\setlist[itemize]{{noitemsep,topsep=2pt,leftmargin=1.4em}}
\\pagestyle{{empty}}
\\begin{{document}}

%% HEADER
\\begin{{center}}
{{\\LARGE\\bfseries NAME_HERE}}\\\\[4pt]
{{\\small ADDRESS | PHONE | EMAIL | linkedin.com/in/LINKEDIN | github.com/GITHUB}}
\\end{{center}}

%% PROFILE section — 2-3 sentences tailored to the JD
\\section{{Profile}}
Write a 2-3 sentence profile here tailored to the role and company from the JD.

%% SKILLS — use tabularx with inline bold categories, NO bullets
\\section{{Technical Skills}}
\\begin{{tabularx}}{{\\linewidth}}{{@{{}} l X @{{}}}}
  \\textbf{{AI / LLMs:}} & skill1, skill2, skill3 \\\\
  \\textbf{{ML \\& Data:}} & skill1, skill2 \\\\
  \\textbf{{Web \\& Backend:}} & skill1, skill2 \\\\
  \\textbf{{DevOps \\& Tools:}} & skill1, skill2 \\\\
\\end{{tabularx}}

%% PROJECTS — bold title | stack \\hfill date, then 2-3 bullets
\\section{{Projects}}
\\noindent\\textbf{{Project Title}} | \\textit{{stack · stack}}\\hfill date\\\\
\\begin{{itemize}}
  \\item bullet 1
  \\item bullet 2
\\end{{itemize}}
\\vspace{{4pt}}

%% EDUCATION
\\section{{Education}}
\\noindent\\textbf{{Institution}}\\hfill Location\\\\
\\textit{{Degree}}\\hfill Date\\\\[4pt]

%% CERTIFICATIONS — tabularx two columns
\\section{{Certifications \\& Languages}}
\\begin{{tabularx}}{{\\linewidth}}{{@{{}} X r @{{}}}}
  \\textbf{{Cert name}} — Issuer & Date \\\\
\\end{{tabularx}}
\\\\[2pt]
\\textbf{{Languages:}} English (C1), German (B1/B2)

\\end{{document}}

Now generate the COMPLETE LaTeX replacing all placeholders with the candidate's real data and tailored bullets. Profile must be 2-3 sentences. Skills must use tabularx with bold categories inline. One page only."""
        max_tok = 2500
    else:
        prompt = f"""Generate a one-page LaTeX cover letter for this candidate applying to {req.company} for: {req.role}.

CANDIDATE: {candidate_info}
PROJECT REFERENCES: {req.tailored_output[:700]}
JD CONTEXT: {req.job_description[:600]}
OUTPUT LANGUAGE: {req.language}

RULES: 3 paragraphs max, subject line "Bewerbung: {req.role} — {req.company}", formal register, closing "Mit freundlichen Grüßen,"
Return ONLY raw LaTeX, no markdown fences."""
        max_tok = 1500

    msg = client.messages.create(
        model="claude-sonnet-4-6", max_tokens=max_tok,
        messages=[{"role": "user", "content": prompt}]
    )
    return {"latex": msg.content[0].text.strip()}