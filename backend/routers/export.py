"""
routers/export.py — LaTeX to PDF export (requires tectonic installed)
Returns 503 if tectonic not available.
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from pydantic import BaseModel
import subprocess, tempfile, os, shutil
from auth import get_current_user

router = APIRouter(prefix="/export", tags=["export"])

class ExportRequest(BaseModel):
    latex: str
    filename: str = "document"

def compile_latex(latex: str, filename: str) -> bytes:
    tectonic_path = shutil.which("tectonic")
    if not tectonic_path:
        raise HTTPException(status_code=503, detail="PDF export not available on this server.")
    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, f"{filename}.tex")
        pdf_path = os.path.join(tmpdir, f"{filename}.pdf")
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex)
        result = subprocess.run(["tectonic", tex_path, "--outdir", tmpdir], capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            raise HTTPException(status_code=422, detail=f"Compilation error: {result.stderr[:300]}")
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=500, detail="PDF not generated")
        with open(pdf_path, "rb") as f:
            return f.read()

@router.post("/pdf")
async def export_pdf(req: ExportRequest, clerk_id: str = Depends(get_current_user)):
    pdf_bytes = compile_latex(req.latex, req.filename)
    return Response(content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{req.filename}.pdf"'})

@router.post("/pdf/try")
async def export_pdf_try(req: ExportRequest):
    pdf_bytes = compile_latex(req.latex, req.filename)
    return Response(content=pdf_bytes, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{req.filename}.pdf"'})
