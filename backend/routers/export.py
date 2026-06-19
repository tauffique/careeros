
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
    # Try pdflatex first, then tectonic
    compiler = shutil.which("pdflatex") or shutil.which("tectonic")
    if not compiler:
        raise HTTPException(status_code=503, detail="LaTeX compiler not available on this server.")

    with tempfile.TemporaryDirectory() as tmpdir:
        tex_path = os.path.join(tmpdir, f"{filename}.tex")
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex)

        if "pdflatex" in compiler:
            # Run twice for proper references
            for _ in range(2):
                subprocess.run(
                    ["pdflatex", "-interaction=nonstopmode", "-output-directory", tmpdir, tex_path],
                    capture_output=True, timeout=60
                )
        else:
            subprocess.run(
                ["tectonic", tex_path, "--outdir", tmpdir],
                capture_output=True, timeout=60
            )

        pdf_path = os.path.join(tmpdir, f"{filename}.pdf")
        if not os.path.exists(pdf_path):
            raise HTTPException(status_code=422, detail="PDF not generated — check LaTeX syntax.")

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