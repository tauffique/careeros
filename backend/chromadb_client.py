
import chromadb
from chromadb.utils import embedding_functions
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder
import os
import re

CHROMA_PATH = os.environ.get("CHROMA_PATH", "./chroma_db")

# ── 1. Better embedding model (BGE > MiniLM for technical text) ───────────────
ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="BAAI/bge-large-en-v1.5"
)

# ── 5. Cross-encoder for reranking (loaded once at startup) ──────────────────
_reranker = None

def get_reranker():
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    return _reranker


# ── Helpers ───────────────────────────────────────────────────────────────────

def _tokenize(text: str) -> list[str]:
    """Simple tokenizer for BM25 — lowercase, split on non-alphanumeric."""
    return re.findall(r"[a-z0-9]+", text.lower())

def _build_full_text(project) -> str:
    """Consistent text representation for embedding and BM25."""
    stack = ", ".join(project.stack or []) if hasattr(project, "stack") else project.get("stack", "")
    title = project.title if hasattr(project, "title") else project.get("title", "")
    category = project.category if hasattr(project, "category") else project.get("category", "")
    desc = project.description if hasattr(project, "description") else project.get("description", "")
    return f"{title}\nCategory: {category}\nStack: {stack}\n\n{desc}"


# ── ChromaDB collection management ───────────────────────────────────────────

def get_client():
    return chromadb.PersistentClient(path=CHROMA_PATH)

def get_collection(user_id: str):
    client = get_client()
    return client.get_or_create_collection(
        name=f"cv_{user_id.replace('-', '_')}",
        embedding_function=ef,
        metadata={"hnsw:space": "cosine"},
    )

async def upsert_project(user_id: str, project):
    collection = get_collection(user_id)
    full_text = _build_full_text(project)
    collection.upsert(
        ids=[str(project.id)],
        documents=[full_text],
        metadatas=[{
            "title": project.title,
            "category": project.category or "",
            "stack": ", ".join(project.stack or []),
        }],
    )

async def delete_project(user_id: str, project_id: str):
    collection = get_collection(user_id)
    collection.delete(ids=[project_id])

async def ingest_all_projects(user_id: str, projects: list):
    collection = get_collection(user_id)
    ids, documents, metadatas = [], [], []
    for p in projects:
        ids.append(str(p.id))
        documents.append(_build_full_text(p))
        metadatas.append({
            "title": p.title,
            "category": p.category or "",
            "stack": ", ".join(p.stack or []),
        })
    if ids:
        collection.upsert(ids=ids, documents=documents, metadatas=metadatas)


# ── Core hybrid query ─────────────────────────────────────────────────────────

async def query_projects(user_id: str, query: str, n_results: int = 3) -> list[dict]:
    """
    Hybrid retrieval pipeline:
    1. Fetch top-N candidates via ChromaDB (semantic)
    2. Re-score all candidates with BM25 (keyword)
    3. Fuse scores (RRF — Reciprocal Rank Fusion)
    4. Rerank top candidates with cross-encoder
    5. Return top n_results
    """
    collection = get_collection(user_id)
    total_docs = collection.count()
    if total_docs == 0:
        return []

    # ── Step 1: Semantic search — fetch wider candidate pool ─────────────────
    candidate_count = min(total_docs, max(n_results * 3, 6))
    semantic_results = collection.query(
        query_texts=[query],
        n_results=candidate_count,
        include=["documents", "metadatas", "distances"],
    )

    if not semantic_results["ids"][0]:
        return []

    candidates = []
    for i in range(len(semantic_results["ids"][0])):
        candidates.append({
            "id": semantic_results["ids"][0][i],
            "title": semantic_results["metadatas"][0][i]["title"],
            "category": semantic_results["metadatas"][0][i]["category"],
            "content": semantic_results["documents"][0][i],
            "semantic_score": round(1 - semantic_results["distances"][0][i], 4),
            "semantic_rank": i,
        })

    # ── Step 2: BM25 keyword search over the same candidates ─────────────────
    corpus = [_tokenize(c["content"]) for c in candidates]
    bm25 = BM25Okapi(corpus)
    query_tokens = _tokenize(query)
    bm25_scores = bm25.get_scores(query_tokens)

    # Rank by BM25
    bm25_ranked = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)
    bm25_rank_map = {idx: rank for rank, idx in enumerate(bm25_ranked)}

    for i, c in enumerate(candidates):
        c["bm25_score"] = round(float(bm25_scores[i]), 4)
        c["bm25_rank"] = bm25_rank_map[i]

    # ── Step 3: Reciprocal Rank Fusion ────────────────────────────────────────
    # RRF formula: score = 1/(k + rank)  where k=60 is standard
    k = 60
    for c in candidates:
        rrf = (1 / (k + c["semantic_rank"])) + (1 / (k + c["bm25_rank"]))
        c["rrf_score"] = round(rrf, 6)

    # Sort by fused score, take top candidates for reranking
    candidates.sort(key=lambda x: x["rrf_score"], reverse=True)
    rerank_pool = candidates[:min(len(candidates), n_results * 2)]

    # ── Step 4: Cross-encoder reranking ──────────────────────────────────────
    if len(rerank_pool) > 1:
        reranker = get_reranker()
        pairs = [(query, c["content"]) for c in rerank_pool]
        ce_scores = reranker.predict(pairs)
        for i, c in enumerate(rerank_pool):
            c["ce_score"] = round(float(ce_scores[i]), 4)
        rerank_pool.sort(key=lambda x: x["ce_score"], reverse=True)
    else:
        for c in rerank_pool:
            c["ce_score"] = c["rrf_score"]

    # ── Step 5: Return top n_results with final relevance score ──────────────
    final = rerank_pool[:n_results]

    # Normalise ce_score to 0-1 range for display
    if final:
        max_ce = max(c["ce_score"] for c in final)
        min_ce = min(c["ce_score"] for c in final)
        rng = max_ce - min_ce if max_ce != min_ce else 1
        for c in final:
            c["relevance_score"] = round((c["ce_score"] - min_ce) / rng * 0.4 + 0.6, 3)

    return [{
        "id": c["id"],
        "title": c["title"],
        "category": c["category"],
        "content": c["content"],
        "relevance_score": c.get("relevance_score", c["semantic_score"]),
        "debug": {
            "semantic": c["semantic_score"],
            "bm25": c["bm25_score"],
            "rrf": c["rrf_score"],
            "cross_encoder": c.get("ce_score"),
        }
    } for c in final]