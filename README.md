# HireReady — ATS Resume Scorer

**Know your chances before they do.**

HireReady is a full-stack Applicant Tracking System (ATS) resume analyser that tells you how well your resume matches a job description — *without any external AI APIs, no internet required for analysis, fully offline NLP.*

Upload your resume and the job description (both as PDFs), and get back an instant visual report card with:

- Overall ATS compatibility score (0–100)
- Sub-scores: Keyword Match, Skills, Experience, Education
- Matched, missing, and extra keywords
- Resume section audit (found vs. missing)
- Actionable improvement suggestions
- Downloadable PDF report

---

## Tech Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Backend   | Python 3.11 · FastAPI · uvicorn                |
| NLP       | spaCy `en_core_web_sm`                         |
| PDF Parse | PyMuPDF (fitz)                                 |
| Frontend  | React 18 · Vite · Plain CSS with CSS variables |
| Charts    | recharts                                        |
| Hosting   | Backend → Render · Frontend → Vercel           |

> No API keys. No LLMs. No external services during analysis.

---

## Project Structure

```
/
├── README.md
├── CLAUDE.md
├── backend/
│   ├── main.py           # FastAPI app + routes
│   ├── scorer.py         # spaCy NLP scoring engine
│   ├── parser.py         # PyMuPDF PDF text extractor
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        └── components/
            ├── Header.jsx
            ├── UploadSection.jsx
            ├── ReportCard.jsx
            ├── ScoreRing.jsx
            ├── KeywordBadges.jsx
            ├── ProgressBar.jsx
            └── DownloadButton.jsx
```

---

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# Install dependencies and download spaCy model
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Copy environment file
cp .env.example .env

# Start the dev server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Test the health endpoint: `GET http://localhost:8000/health`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file and point it at your local backend
cp .env.example .env
# Edit .env → VITE_API_URL=http://localhost:8000

# Start the dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Deployment

### Backend — Render

1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your repository and set the **Root Directory** to `backend`.
3. Set the **Build Command**:
   ```
   pip install -r requirements.txt && python -m spacy download en_core_web_sm
   ```
4. Set the **Start Command**:
   ```
   uvicorn main:app --host 0.0.0.0 --port 10000
   ```
5. Add an environment variable:
   - `ALLOWED_ORIGIN` → your Vercel frontend URL (e.g. `https://hireready.vercel.app`)
6. Deploy. Render will provide a URL like `https://hireready-api.onrender.com`.

> **Note:** Free-tier Render services spin down after inactivity. The frontend shows a "Backend is waking up…" banner automatically while the service cold-starts.

### Frontend — Vercel

1. Import your repository on [Vercel](https://vercel.com).
2. Set the **Root Directory** to `frontend`.
3. Add an environment variable:
   - `VITE_API_URL` → your Render backend URL
4. Deploy. Vercel handles the build (`npm run build`) automatically.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable         | Description                                 | Default |
|------------------|---------------------------------------------|---------|
| `ALLOWED_ORIGIN` | Frontend origin for CORS (`*` allows all)   | `*`     |

### Frontend (`frontend/.env`)

| Variable        | Description                   | Default                      |
|-----------------|-------------------------------|------------------------------|
| `VITE_API_URL`  | URL of the FastAPI backend    | `http://localhost:8000`      |

---

## API Reference

### `GET /health`

Health check used by Render.

**Response:** `{ "status": "ok" }`

### `POST /analyze`

Accepts `multipart/form-data` with:
- `resume` — PDF file of the candidate's resume
- `jd` — PDF file of the job description

**Response:** JSON object with:

```json
{
  "overall_score": 72,
  "keyword_match_score": 68,
  "skills_score": 80,
  "experience_score": 70,
  "education_score": 100,
  "matched_keywords": ["python", "machine learning", ...],
  "missing_keywords": ["kubernetes", "terraform", ...],
  "extra_keywords": ["django", "celery", ...],
  "sections_found": ["Experience", "Education", "Skills"],
  "sections_missing": ["Summary", "Certifications"],
  "suggestions": ["Add a professional summary section...", ...],
  "resume_word_count": 512,
  "jd_word_count": 348
}
```

---

## License

MIT
