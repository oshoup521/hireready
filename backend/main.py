"""
main.py — HireReady FastAPI Application

Render Build Command (set this in the Render dashboard):
    pip install -r requirements.txt && python -m spacy download en_core_web_sm

Render Start Command:
    uvicorn main:app --host 0.0.0.0 --port 10000

Routes:
    GET  /health   — health check for Render
    POST /analyze  — accepts resume + JD PDFs, returns score report JSON
"""

import os
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from parser import extract_text_from_pdf
from scorer import score_resume, score_resume_only

# ---------------------------------------------------------------------------
# Load environment variables from .env (if present)
# ---------------------------------------------------------------------------
load_dotenv()

# ---------------------------------------------------------------------------
# Allowed CORS origin — default to "*" for development / open deployments
# ---------------------------------------------------------------------------
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "*")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="HireReady ATS Scorer",
    description="Upload your resume and job description PDFs to receive an ATS compatibility score.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS middleware
# If ALLOWED_ORIGIN is a specific URL (production), allow only that origin.
# Otherwise allow all origins. allow_credentials must be False when using "*".
# ---------------------------------------------------------------------------
origins = [ALLOWED_ORIGIN] if ALLOWED_ORIGIN != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=ALLOWED_ORIGIN != "*",  # False when wildcard, True for specific origin
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """
    Health check endpoint used by Render to verify the service is running.
    Returns a simple JSON status object.
    """
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_resume(
    resume: UploadFile = File(...),
    jd: Optional[UploadFile] = None,
):
    """
    Analyse a resume and return a scoring report.

    Accepts multipart/form-data with:
        resume  — PDF of the candidate's resume (required)
        jd      — PDF of the job description (optional)

    When jd is omitted, uses ATS-readiness mode (skills breadth, experience,
    education, sections completeness) instead of JD-comparison mode.

    Returns a JSON object containing overall score, sub-scores, keyword
    lists, section analysis, and improvement suggestions.
    """
    # Step 1 — Read the resume file as bytes
    try:
        resume_bytes = await resume.read()
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to read uploaded resume: {exc}",
        )

    # Step 2 — Extract plain text from the resume PDF
    try:
        resume_text = extract_text_from_pdf(resume_bytes)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail="Could not extract text from PDF (resume). Please ensure the file is a valid, non-scanned PDF.",
        )

    # Step 3 — Run NLP scoring (mode depends on whether a JD was uploaded)
    try:
        if jd is None:
            # ATS-only mode: score resume on its own merits
            result = score_resume_only(resume_text)
        else:
            # JD-comparison mode: read and parse the JD, then compare
            try:
                jd_bytes = await jd.read()
                jd_text = extract_text_from_pdf(jd_bytes)
            except Exception:
                raise HTTPException(
                    status_code=422,
                    detail="Could not extract text from PDF (job description). Please ensure the file is a valid, non-scanned PDF.",
                )
            result = score_resume(resume_text, jd_text)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Scoring failed, please try again.",
        )

    # Step 4 — Return the full result dict as JSON
    return result
