"""
main.py — HireReady FastAPI Application

Render Build Command (set this in the Render dashboard):
    pip install -r requirements.txt && python -m spacy download en_core_web_sm

Render Start Command:
    uvicorn main:app --host 0.0.0.0 --port $PORT

Routes:
    GET  /health   — health check for Render
    POST /analyze  — accepts resume + JD PDFs, returns score report JSON
    POST /compare  — accepts resume + up to 3 JD PDFs, returns array of score reports
"""

import os
from typing import List, Optional
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from parser import extract_text
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
    cover_letter: Optional[UploadFile] = None,
    role: Optional[str] = Form(None),
    ats_preset: Optional[str] = Form(None),
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

    # Step 2 — Extract plain text from the resume (PDF or DOCX)
    try:
        resume_text = extract_text(resume_bytes, resume.filename or "resume.pdf")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="Could not extract text from resume. Please ensure the file is a valid PDF or DOCX.",
        )

    # Step 3 — Parse optional cover letter
    cover_letter_text = None
    if cover_letter is not None:
        try:
            cl_bytes = await cover_letter.read()
            cover_letter_text = extract_text(cl_bytes, cover_letter.filename or "cover_letter.pdf")
        except Exception:
            cover_letter_text = None  # Non-fatal — proceed without it

    # Normalise role / ats_preset values
    valid_roles = {"software_engineer", "product_manager", "data_scientist"}
    valid_presets = {"greenhouse", "workday", "lever"}
    role_norm = role.lower().replace(" ", "_") if role and role.lower().replace(" ", "_") in valid_roles else None
    preset_norm = ats_preset.lower() if ats_preset and ats_preset.lower() in valid_presets else None

    # Step 4 — Run NLP scoring (mode depends on whether a JD was uploaded)
    try:
        if jd is None:
            # ATS-only mode: score resume on its own merits
            result = score_resume_only(resume_text, role=role_norm, ats_preset=preset_norm)
            result["resume_text"] = resume_text[:6000]
            result["jd_text"] = ""
        else:
            # JD-comparison mode: read and parse the JD, then compare
            try:
                jd_bytes = await jd.read()
                jd_text = extract_text(jd_bytes, jd.filename or "jd.pdf")
            except ValueError as exc:
                raise HTTPException(status_code=422, detail=str(exc))
            except Exception:
                raise HTTPException(
                    status_code=422,
                    detail="Could not extract text from job description. Please ensure the file is a valid PDF or DOCX.",
                )
            result = score_resume(resume_text, jd_text, role=role_norm, ats_preset=preset_norm, cover_letter_text=cover_letter_text)
            result["resume_text"] = resume_text[:6000]
            result["jd_text"] = jd_text[:4000]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Scoring failed, please try again.",
        )

    # Step 4 — Return the full result dict as JSON
    return result


@app.post("/compare")
async def compare_resume(
    resume: UploadFile = File(...),
    jds: List[UploadFile] = File(...),
):
    """
    Compare one resume against multiple job descriptions (up to 3).

    Accepts multipart/form-data with:
        resume  — PDF/DOCX of the candidate's resume (required)
        jds     — List of 1-3 PDF/DOCX job description files (required)

    Returns a JSON array of score report objects, one per JD, each including
    a `jd_label` field set to the original filename.
    """
    if not jds:
        raise HTTPException(status_code=422, detail="At least one JD file is required.")
    if len(jds) > 3:
        raise HTTPException(status_code=422, detail="Maximum 3 JD files allowed per comparison.")

    # Parse the resume once
    try:
        resume_bytes = await resume.read()
        resume_text = extract_text(resume_bytes, resume.filename or "resume.pdf")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception:
        raise HTTPException(
            status_code=422,
            detail="Could not extract text from resume. Please ensure the file is a valid PDF or DOCX.",
        )

    # Score resume against each JD
    results = []
    for jd_file in jds:
        try:
            jd_bytes = await jd_file.read()
            jd_text = extract_text(jd_bytes, jd_file.filename or "jd.pdf")
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        except Exception:
            raise HTTPException(
                status_code=422,
                detail=f"Could not extract text from '{jd_file.filename}'.",
            )
        try:
            result = score_resume(resume_text, jd_text)
            result["jd_label"] = jd_file.filename or f"JD {len(results) + 1}"
            results.append(result)
        except Exception:
            raise HTTPException(
                status_code=500,
                detail=f"Scoring failed for '{jd_file.filename}', please try again.",
            )

    return results
