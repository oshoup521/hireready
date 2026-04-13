# CLAUDE.md — HireReady Project Spec

This file is the single source of truth for Claude Code to generate the full project.
Read this entire file before writing any code.

---

## Project Overview

A full-stack ATS (Applicant Tracking System) Resume Scorer web app called **HireReady**:
- User uploads their **Resume as PDF** and **Job Description as PDF**
- Backend parses both PDFs locally, runs NLP analysis using spaCy
- Returns a **visual report card** with score, keyword match, missing skills, suggestions, section breakdown
- User can **download the report as a PDF**
- **Dark/Light theme toggle** on the frontend
- **No LLM, no external API keys** — fully offline NLP

**Frontend**: React + Vite — deployed on Vercel
**Backend**: Python FastAPI — deployed on Render
**Structure**: Monorepo

---

## Folder Structure

Generate exactly this structure:

```
/
├── CLAUDE.md
├── README.md
├── backend/
│   ├── main.py
│   ├── scorer.py
│   ├── parser.py
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

## Backend — FastAPI (`/backend`)

### Stack
- Python 3.11+
- FastAPI
- uvicorn
- PyMuPDF (`fitz`) — for PDF text extraction
- spaCy with `en_core_web_sm` model — for NLP
- python-dotenv
- CORS middleware enabled for all origins

### `requirements.txt`
```
fastapi
uvicorn
python-multipart
pymupdf
spacy
python-dotenv
```

### Render Build Command
```
pip install -r requirements.txt && python -m spacy download en_core_web_sm
```
Add this as a comment at the top of `main.py` so the developer knows to set it in Render dashboard.

### `.env.example`
```
# No API keys needed — this project runs fully offline
ALLOWED_ORIGIN=https://your-frontend.vercel.app
```

---

### `parser.py` — PDF Text Extractor

- Function: `extract_text_from_pdf(file_bytes: bytes) -> str`
- Uses PyMuPDF (`fitz`) to open the PDF from bytes
- Extracts and concatenates text from all pages
- Cleans up excessive whitespace and blank lines
- Returns clean plain text string
- Add clear comments explaining each step

---

### `scorer.py` — NLP Scoring Engine

This is the core logic. Implement all of the following:

#### `extract_keywords(text: str) -> list[str]`
- Load spaCy `en_core_web_sm` model
- Extract noun chunks and named entities from text
- Filter out stopwords, punctuation, single characters
- Lowercase and deduplicate
- Return list of meaningful keywords

#### `score_resume(resume_text: str, jd_text: str) -> dict`
This is the main scoring function. It must return a dict with ALL of the following fields:

```python
{
  "overall_score": int,           # 0-100
  "keyword_match_score": int,     # 0-100
  "skills_score": int,            # 0-100
  "experience_score": int,        # 0-100
  "education_score": int,         # 0-100
  "matched_keywords": list[str],  # keywords found in both resume and JD
  "missing_keywords": list[str],  # keywords in JD but not in resume
  "extra_keywords": list[str],    # keywords in resume but not in JD
  "sections_found": list[str],    # e.g. ["Experience", "Education", "Skills"]
  "sections_missing": list[str],  # e.g. ["Summary", "Certifications"]
  "suggestions": list[str],       # actionable improvement tips
  "resume_word_count": int,
  "jd_word_count": int,
}
```

#### Scoring Logic:

**keyword_match_score:**
- Extract keywords from both resume and JD
- `matched = intersection(resume_keywords, jd_keywords)`
- `keyword_match_score = (len(matched) / len(jd_keywords)) * 100`
- Cap at 100

**skills_score:**
- Maintain a hardcoded list of common tech/soft skills to look for
- Check how many JD skills appear in resume
- Score based on percentage match

**experience_score:**
- Check for experience-related keywords: "years", "experience", "worked", "developed", "managed", "led", "built"
- Check if resume mentions quantified achievements (numbers + action verbs)
- Score 0-100 based on presence and richness

**education_score:**
- Check for education keywords: "bachelor", "master", "degree", "university", "college", "b.tech", "b.e", "mba", "phd"
- Score 100 if found, 50 if partial, 0 if missing

**overall_score:**
- Weighted average:
  - keyword_match_score × 0.40
  - skills_score × 0.25
  - experience_score × 0.20
  - education_score × 0.15

**sections_found / sections_missing:**
- Check for these standard resume sections by scanning headings/keywords:
  - Summary / Objective
  - Experience / Work Experience
  - Education
  - Skills
  - Projects
  - Certifications
  - Achievements

**suggestions:**
- Generate based on scores and missing data, for example:
  - If keyword_match_score < 50: "Add more keywords from the job description"
  - If missing_keywords has items: "Consider adding: {top 5 missing keywords}"
  - If "Summary" not in sections_found: "Add a professional summary section"
  - If experience_score < 50: "Quantify your achievements with numbers and metrics"
  - If education_score == 0: "Add your educational qualifications"
  - Always return at least 3 suggestions

---

### `main.py` — FastAPI App

- Load CORS from env or default to `*`
- Two routes:

**`GET /health`**
- Returns `{ "status": "ok" }`
- Used for Render health checks

**`POST /analyze`**
- Accepts `multipart/form-data` with two files:
  - `resume`: PDF file upload
  - `jd`: PDF file upload
- Read both files as bytes
- Call `extract_text_from_pdf()` on each
- Call `score_resume(resume_text, jd_text)`
- Return the full result dict as JSON
- Handle errors:
  - If PDF parsing fails: return HTTP 422 with message "Could not extract text from PDF"
  - If scoring fails: return HTTP 500 with message "Scoring failed, please try again"

---

## Frontend — React + Vite (`/frontend`)

### Stack
- React 18
- Vite
- Plain CSS with CSS variables — NO Tailwind, NO Bootstrap
- No extra UI libraries
- Use `recharts` for the radar/bar charts (install via npm)
- Use browser's built-in `window.print()` for PDF download

### `.env.example`
```
VITE_API_URL=https://your-backend.onrender.com
```

---

### Theme System

Implement a **dark/light theme toggle** using a CSS class on `<body>`:
- Default: dark theme
- Toggle button in header switches between `class="dark"` and `class="light"` on `<body>`
- Store preference in `localStorage` so it persists on refresh
- All colors defined as CSS variables, overridden per theme

**Dark Theme (default):**
```css
body.dark {
  --bg-primary: #0d0d0d;
  --bg-secondary: #1a1a1a;
  --bg-card: #1e1e1e;
  --border: #2e2e2e;
  --text-primary: #f0f0f0;
  --text-secondary: #888888;
  --accent: #6c63ff;
  --accent-light: #8b85ff;
  --success: #4caf7d;
  --warning: #f0a500;
  --danger: #e05c5c;
  --badge-matched: #1b3a2e;
  --badge-missing: #3a1b1b;
  --badge-extra: #1b2a3a;
}
```

**Light Theme:**
```css
body.light {
  --bg-primary: #f5f5f5;
  --bg-secondary: #ffffff;
  --bg-card: #ffffff;
  --border: #e0e0e0;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --accent: #6c63ff;
  --accent-light: #8b85ff;
  --success: #2e7d52;
  --warning: #b57a00;
  --danger: #c0392b;
  --badge-matched: #d4f5e4;
  --badge-missing: #fde8e8;
  --badge-extra: #e8effe;
}
```

**Typography:**
- Font: `Inter` from Google Fonts
- Base size: 14px, line height: 1.6

---

### Layout

```
┌─────────────────────────────────────────┐
│  Header: "ATS Scorer" logo + theme btn  │
├─────────────────────────────────────────┤
│  Upload Section (two PDF upload boxes)  │
│  [Analyze] button                       │
├─────────────────────────────────────────┤
│  Report Card (shown after analysis)     │
│  - Overall Score Ring                   │
│  - 4 sub-score progress bars            │
│  - Keyword badges (matched/missing)     │
│  - Sections found/missing               │
│  - Suggestions list                     │
│  - [Download PDF] button                │
└─────────────────────────────────────────┘
```

---

### Component Breakdown

**`App.jsx`**
- State: `report` (null or result object), `isLoading`, `isWakingUp`, `theme`
- On mount: read theme from localStorage, apply to body class
- `analyzeResume(resumeFile, jdFile)`:
  1. Set `isLoading = true`
  2. Start 5s timer → if no response, set `isWakingUp = true`
  3. Build `FormData` with `resume` and `jd` files
  4. POST to `${VITE_API_URL}/analyze`
  5. On success: set `report`, clear loading
  6. On error: show error toast/message
- Renders: `<Header>`, `<UploadSection>`, `<ReportCard>` (if report exists)

**`Header.jsx`**
- App name: **"HireReady"** on left
- Tagline: "Know your chances before they do" on right (hide on mobile)
- Theme toggle button on far right — sun icon for light, moon icon for dark (use unicode ☀️ 🌙 or simple SVG)

**`UploadSection.jsx`**
- Two drag-and-drop upload boxes side by side (stack on mobile)
  - Left: "Upload Resume PDF"
  - Right: "Upload Job Description PDF"
- Each box shows:
  - Upload icon + label when empty
  - File name + green checkmark when file selected
  - Click to browse or drag and drop
- `Analyze` button below — disabled until both files selected
- Shows a loading spinner + "Analyzing..." text while `isLoading` is true
- Shows wake-up banner if `isWakingUp` is true: "Backend is waking up on Render, please wait..."

**`ReportCard.jsx`**
- Main container wrapping all result components
- Has a `id="report-card"` for PDF download targeting
- Renders in order:
  1. `<ScoreRing score={report.overall_score} />`
  2. Sub-score progress bars
  3. `<KeywordBadges>` for matched, missing, extra
  4. Sections found/missing
  5. Suggestions
  6. `<DownloadButton />`

**`ScoreRing.jsx`**
- Large circular SVG ring showing overall score (0-100)
- Animated fill on mount (CSS animation)
- Color based on score:
  - 0-49: `--danger` (red)
  - 50-74: `--warning` (orange)
  - 75-100: `--success` (green)
- Score number in center, large and bold
- Label below: "Overall ATS Score"

**`ProgressBar.jsx`**
- Reusable component
- Props: `label`, `score`, `color`
- Animated fill on mount
- Shows label on left, score percentage on right
- Used for: Keyword Match, Skills, Experience, Education

**`KeywordBadges.jsx`**
- Three sections with pill badges:
  - ✅ **Matched Keywords** — green badges
  - ❌ **Missing Keywords** — red badges
  - ➕ **Extra Keywords** — blue badges
- Each badge is a small rounded pill with the keyword text
- If list is empty, show "None" in muted text
- Limit display to top 20 per section, show "+N more" if exceeded

**`DownloadButton.jsx`**
- Button: "Download Report as PDF"
- On click: use `window.print()` with a print-specific CSS that:
  - Hides header, upload section, download button
  - Shows only `#report-card` content
  - Forces light background for print
- Add `@media print` styles in `index.css`

---

### Responsive Design
- Mobile-first
- Upload boxes stack vertically on screens < 768px
- Badge pills wrap naturally
- Score ring scales down on mobile
- All font sizes relative (rem/em)

---

## README.md

Generate a clean README with:
- Project name: **HireReady**
- Description: what it does, who it's for
- Tech stack (FastAPI, spaCy, PyMuPDF, React, Vite)
- Local development setup for both backend and frontend
- Render deployment instructions with build command
- Vercel deployment instructions
- Note: no API keys required, fully offline NLP

---

## General Rules for Claude Code

- Do NOT use any external AI/LLM API. Pure NLP with spaCy only.
- Do NOT use Tailwind, Bootstrap, or any CSS framework. Plain CSS only.
- Do NOT use TypeScript. Plain JavaScript (.jsx, .js) only.
- Do NOT add authentication or database.
- Write clean, well-commented code. Add a comment above every major function.
- The spaCy model must be `en_core_web_sm` only — do not use medium or large models (Render RAM limit).
- All CSS colors must use CSS variables — no hardcoded hex values in component files.
- After generating all files, print a summary of what was created.
