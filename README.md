<div align="center">

# 🎯 HireReady

### **Know your chances before they do.**

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![spaCy](https://img.shields.io/badge/spaCy-NLP-09A3D5?style=for-the-badge&logo=spacy&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<br/>

> A full-stack ATS resume analyser — **zero external AI APIs, zero internet required during analysis, fully offline NLP.**
> Upload your resume and job description as PDFs and get a detailed visual score report in seconds.

<br/>

![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![No API Keys](https://img.shields.io/badge/No%20API%20Keys-Required-brightgreen?style=flat-square)
![Offline NLP](https://img.shields.io/badge/NLP-Offline-blueviolet?style=flat-square)

</div>

---

## 🚀 Why HireReady?

- 🔒 **100% Offline NLP** — No ChatGPT, no OpenAI, no API keys. Your resume never leaves your machine during analysis.
- ⚡ **Instant Results** — Full scoring report in seconds, powered by spaCy running locally on the backend.
- 🎯 **Beyond Basic Keyword Match** — Most ATS tools only count keywords. HireReady also checks formatting, grammar, action verbs, quantified achievements, and job title relevance.
- 📊 **Visual Report Card** — Scores, charts, keyword pills, section audit, rewrite suggestions — all in one clean UI.
- ⚖️ **Multi-JD Compare Mode** — Can't decide which job to apply to? Score your resume against 3 JDs side by side.
- 🕒 **Track Your Progress** — Score history in localStorage lets you see improvement across resume versions over time.
- 🧪 **Try Before You Upload** — Built-in sample resume and JD so anyone can test the app instantly.
- 🆓 **Free to Deploy** — Runs on Render (backend) + Vercel (frontend) free tiers with zero ongoing cost.

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 🧠 Core Scoring Engine

| | Feature | What it does |
|---|---|---|
| 🏆 | **Overall ATS Score** | Weighted 0–100 score combining all sub-scores |
| 🔑 | **Keyword Match** | Resume vs JD keyword intersection via spaCy NLP |
| 🛠️ | **Skills Score** | How many JD-required skills appear in your resume |
| 💼 | **Experience Score** | Action verbs, quantified achievements, experience keywords |
| 🎓 | **Education Score** | Degree, university, and qualification detection |

</td>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 📊 Quality Metrics

| | Feature | What it does |
|---|---|---|
| 🤖 | **ATS Formatting** | Flags tables, columns, images, headers that break parsers |
| ✍️ | **Grammar & Spelling** | Offline error detection — no external API |
| ⚡ | **Action Verb Analysis** | Strong (Led, Built) vs weak (Helped, Responsible for) |
| 📈 | **Quantification Score** | Detects metric-backed achievements ("sales up 30%") |
| 🎯 | **Job Title Relevance** | Matches your titles to JD seniority and role |

</td>
</tr>
<tr>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 🔍 Keyword Intelligence

| | Feature | What it does |
|---|---|---|
| ✅ | **Matched Keywords** | Keywords present in both resume and JD |
| ❌ | **Missing Keywords** | JD keywords absent from resume — most actionable |
| ➕ | **Extra Keywords** | Resume keywords beyond the JD scope |
| 📋 | **Section Audit** | Finds and flags missing resume sections |

</td>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 💡 Suggestions & Rewrites

| | Feature | What it does |
|---|---|---|
| 🗒️ | **Improvement Tips** | Actionable suggestions based on score gaps |
| ✏️ | **Bullet Rewrites** | Weak bullets rewritten with action verb + metric |
| 📋 | **Copy to Clipboard** | One-click copy on every suggestion and rewrite |

</td>
</tr>
<tr>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 🖥️ UI & Experience

| | Feature | What it does |
|---|---|---|
| 🔀 | **Two Modes** | ATS-only check or full ATS vs JD comparison |
| 🔵 | **Score Ring** | Animated SVG ring — 🔴 red / 🟠 orange / 🟢 green |
| 📄 | **Resume Text Viewer** | Extracted text with keyword & verb highlights |
| 📌 | **Sticky Split Layout** | Left panel sticks; right panel scrolls freely |
| ⚖️ | **Multi-JD Compare** | One resume vs up to 3 JDs side by side |
| 🧪 | **Sample Files** | Test instantly without uploading your own files |
| 🔄 | **Re-Analyze Button** | Swap resume without refreshing the page |
| 📥 | **Download as PDF** | Print-to-PDF — only the report card is exported |

</td>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 🕒 Score History &nbsp;&nbsp;&nbsp; 🎨 Theme

| | Feature | What it does |
|---|---|---|
| 💾 | **Persistent History** | Last 10 runs saved in localStorage |
| 👁️ | **One-Click Restore** | View any past report — list auto-collapses |
| 🗑️ | **Clear History** | Wipes history and dismisses open report |
| 🌙 | **Dark / Light Theme** | Toggle with preference saved in localStorage |
| 📱 | **Responsive Design** | Mobile-first, stacks cleanly on small screens |
| 🖨️ | **Print Styles** | Clean white PDF output via `@media print` |

</td>
</tr>
</table>

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| 🐍 **Backend** | Python 3.11 · FastAPI · uvicorn |
| 🧠 **NLP** | spaCy `en_core_web_sm` |
| 📄 **PDF Parsing** | PyMuPDF (fitz) |
| ⚛️ **Frontend** | React 18 · Vite · Plain CSS (no Tailwind, no Bootstrap) |
| 💾 **Storage** | Browser localStorage — no database |
| ☁️ **Hosting** | Backend → Render · Frontend → Vercel |

</div>

> 🔒 **No API keys. No LLMs. No external services during analysis.**

---

## 📁 Project Structure

```
/
├── 📄 README.md
├── 📄 CLAUDE.md
├── 🐍 backend/
│   ├── main.py              # FastAPI app + /analyze and /health routes
│   ├── scorer.py            # spaCy NLP scoring engine (all scoring logic)
│   ├── parser.py            # PyMuPDF PDF text extractor
│   ├── requirements.txt
│   └── .env.example
└── ⚛️ frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    ├── .env.example
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        └── components/
            ├── Header.jsx           # Logo + theme toggle + compare mode toggle
            ├── UploadSection.jsx    # Drag-and-drop upload + sample files + re-analyze
            ├── ReportCard.jsx       # Full score report renderer
            ├── ScoreRing.jsx        # Animated circular SVG score
            ├── ProgressBar.jsx      # Animated score bars
            ├── KeywordBadges.jsx    # Matched / missing / extra keyword pills
            ├── DownloadButton.jsx   # Print-to-PDF trigger
            ├── ResumeTextViewer.jsx # Sticky left panel with keyword highlights
            ├── DetailPanel.jsx      # Collapsible detail sections
            ├── ScoreHistory.jsx     # localStorage history panel
            └── CompareMode.jsx      # Multi-JD side-by-side comparison
```

---

## 🚀 Local Development

### Prerequisites

![Python](https://img.shields.io/badge/Python-3.11+-blue?style=flat-square&logo=python)
![Node](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)

### 🐍 Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies and download the spaCy model
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Copy the environment file
cp .env.example .env

# Start the dev server
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000` — test with `GET /health`

### ⚛️ Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy the environment file and point it at your local backend
cp .env.example .env
# Edit .env → VITE_API_URL=http://localhost:8000

# Start the dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## ☁️ Deployment

### Backend — Render

1. Create a **Web Service** on [Render](https://render.com)
2. Set **Root Directory** to `backend`
3. **Build Command:**
   ```
   pip install -r requirements.txt && python -m spacy download en_core_web_sm
   ```
4. **Start Command:**
   ```
   uvicorn main:app --host 0.0.0.0 --port 10000
   ```
5. Add environment variable: `ALLOWED_ORIGIN` → your Vercel frontend URL

> ⚠️ Free-tier Render services spin down after inactivity. The frontend automatically shows a **"Backend is waking up…"** banner during cold starts.

### Frontend — Vercel

1. Import your repository on [Vercel](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Add environment variable: `VITE_API_URL` → your Render backend URL
4. Deploy — Vercel runs `npm run build` automatically

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `ALLOWED_ORIGIN` | Frontend origin for CORS | `*` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | URL of the FastAPI backend | `http://localhost:8000` |

---

## 📡 API Reference

### `GET /health`

```json
{ "status": "ok" }
```

### `POST /analyze`

Accepts `multipart/form-data`:
- `resume` — PDF file *(required)*
- `jd` — PDF file *(optional — omit for ATS-only mode)*

<details>
<summary><b>📦 Full Response Shape</b></summary>

```json
{
  "mode": "ats_vs_jd",
  "overall_score": 72,
  "keyword_match_score": 68,
  "skills_score": 80,
  "experience_score": 70,
  "education_score": 100,
  "formatting_score": 90,
  "formatting_issues": ["Possible table or column layout detected"],
  "grammar_score": 85,
  "grammar_issues": ["Line may start with a lowercase letter"],
  "action_verb_score": 75,
  "strong_verbs_found": ["led", "built", "improved"],
  "weak_verbs_found": ["helped"],
  "quantification_score": 60,
  "quantified_lines": ["Increased API response time by 40%"],
  "title_relevance_score": 80,
  "detected_jd_title": "Senior Software Engineer",
  "job_title_match": true,
  "matched_keywords": ["python", "machine learning"],
  "missing_keywords": ["kubernetes", "terraform"],
  "extra_keywords": ["django", "celery"],
  "sections_found": ["Experience", "Education", "Skills"],
  "sections_missing": ["Summary", "Certifications"],
  "suggestions": ["Add a professional summary section..."],
  "rewrite_suggestions": [
    {
      "original": "Helped with backend tasks",
      "rewritten": "Engineered backend services that improved throughput by X%"
    }
  ],
  "resume_word_count": 512,
  "jd_word_count": 348
}
```

</details>

---

## 🗺️ Roadmap

Things that could make HireReady even better:

- [ ] 📉 **Score trend chart** — line graph of improvement across history runs
- [ ] 🚫 **Buzzword detector** — flag overused filler words ("passionate", "synergy", "hardworking")
- [ ] 📖 **Readability score** — Flesch-Kincaid readability index for resume text
- [ ] 🏷️ **"Applied" tag** — mark history entries with job application status
- [ ] 🔎 **Missing keyword click** — clicking a missing keyword scrolls to it in the JD panel

---

<div align="center">

Made with ❤️ · MIT License

</div>
