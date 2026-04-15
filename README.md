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

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>🏆</td><td><b>Overall ATS Score</b></td><td>Weighted 0–100 score combining all sub-scores</td></tr>
<tr bgcolor="#0d1117"><td>🔑</td><td><b>Keyword Match</b></td><td>Resume vs JD keyword intersection via spaCy NLP</td></tr>
<tr bgcolor="#161b22"><td>🛠️</td><td><b>Skills Score</b></td><td>How many JD-required skills appear in your resume</td></tr>
<tr bgcolor="#0d1117"><td>💼</td><td><b>Experience Score</b></td><td>Action verbs, quantified achievements, experience keywords</td></tr>
<tr bgcolor="#161b22"><td>🎓</td><td><b>Education Score</b></td><td>Degree, university, and qualification detection</td></tr>
</tbody>
</table>

</td>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 📊 Quality Metrics

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>🤖</td><td><b>ATS Formatting</b></td><td>Flags tables, columns, images, headers that break parsers</td></tr>
<tr bgcolor="#0d1117"><td>✍️</td><td><b>Grammar & Spelling</b></td><td>Offline error detection — no external API</td></tr>
<tr bgcolor="#161b22"><td>⚡</td><td><b>Action Verb Analysis</b></td><td>Strong (Led, Built) vs weak (Helped, Responsible for)</td></tr>
<tr bgcolor="#0d1117"><td>📈</td><td><b>Quantification Score</b></td><td>Detects metric-backed achievements ("sales up 30%")</td></tr>
<tr bgcolor="#161b22"><td>🎯</td><td><b>Job Title Relevance</b></td><td>Matches your titles to JD seniority and role</td></tr>
</tbody>
</table>

</td>
</tr>
<tr>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 🔍 Keyword Intelligence

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>✅</td><td><b>Matched Keywords</b></td><td>Keywords present in both resume and JD</td></tr>
<tr bgcolor="#0d1117"><td>❌</td><td><b>Missing Keywords</b></td><td>JD keywords absent from resume — most actionable</td></tr>
<tr bgcolor="#161b22"><td>➕</td><td><b>Extra Keywords</b></td><td>Resume keywords beyond the JD scope</td></tr>
<tr bgcolor="#0d1117"><td>📋</td><td><b>Section Audit</b></td><td>Finds and flags missing resume sections</td></tr>
</tbody>
</table>

</td>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 💡 Suggestions & Rewrites

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>🗒️</td><td><b>Improvement Tips</b></td><td>Actionable suggestions based on score gaps</td></tr>
<tr bgcolor="#0d1117"><td>✏️</td><td><b>Bullet Rewrites</b></td><td>Weak bullets rewritten with action verb + metric</td></tr>
<tr bgcolor="#161b22"><td>📋</td><td><b>Copy to Clipboard</b></td><td>One-click copy on every suggestion and rewrite</td></tr>
</tbody>
</table>

</td>
</tr>
<tr>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 🖥️ UI & Experience

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>🔀</td><td><b>Two Modes</b></td><td>ATS-only check or full ATS vs JD comparison</td></tr>
<tr bgcolor="#0d1117"><td>🔵</td><td><b>Score Ring</b></td><td>Animated SVG ring — 🔴 red / 🟠 orange / 🟢 green</td></tr>
<tr bgcolor="#161b22"><td>📄</td><td><b>Resume Text Viewer</b></td><td>Extracted text with keyword &amp; verb highlights</td></tr>
<tr bgcolor="#0d1117"><td>📌</td><td><b>Sticky Split Layout</b></td><td>Left panel sticks; right panel scrolls freely</td></tr>
<tr bgcolor="#161b22"><td>⚖️</td><td><b>Multi-JD Compare</b></td><td>One resume vs up to 3 JDs side by side</td></tr>
<tr bgcolor="#0d1117"><td>🧪</td><td><b>Sample Files</b></td><td>Test instantly without uploading your own files</td></tr>
<tr bgcolor="#161b22"><td>🔄</td><td><b>Re-Analyze Button</b></td><td>Swap resume without refreshing the page</td></tr>
<tr bgcolor="#0d1117"><td>📥</td><td><b>Download as PDF</b></td><td>Print-to-PDF — only the report card is exported</td></tr>
</tbody>
</table>

</td>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 🕒 Score History &nbsp;&nbsp;&nbsp; 🎨 Theme

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>💾</td><td><b>Persistent History</b></td><td>Last 10 runs saved in localStorage</td></tr>
<tr bgcolor="#0d1117"><td>👁️</td><td><b>One-Click Restore</b></td><td>View any past report — list auto-collapses</td></tr>
<tr bgcolor="#161b22"><td>🗑️</td><td><b>Clear History</b></td><td>Wipes history and dismisses open report</td></tr>
<tr bgcolor="#0d1117"><td>🌙</td><td><b>Dark / Light Theme</b></td><td>Toggle with preference saved in localStorage</td></tr>
<tr bgcolor="#161b22"><td>📱</td><td><b>Responsive Design</b></td><td>Mobile-first, stacks cleanly on small screens</td></tr>
<tr bgcolor="#0d1117"><td>🖨️</td><td><b>Print Styles</b></td><td>Clean white PDF output via <code>@media print</code></td></tr>
</tbody>
</table>

</td>
</tr>
</table>

### 🆕 New Features (v2)

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>🎊</td><td><b>Confetti Animation</b></td><td>Celebration burst when your score hits 75+</td></tr>
<tr bgcolor="#0d1117"><td>🎴</td><td><b>Score Share Card</b></td><td>Spotify Wrapped-style card — download as PNG to share</td></tr>
<tr bgcolor="#161b22"><td>📈</td><td><b>Score Trend Chart</b></td><td>Line graph in history showing progress across runs</td></tr>
<tr bgcolor="#0d1117"><td>✅</td><td><b>Applied Tag</b></td><td>Mark each history entry as "Applied" — persisted in localStorage</td></tr>
<tr bgcolor="#161b22"><td>👑</td><td><b>Best Score Badge</b></td><td>Crown icon on your highest-scoring history entry</td></tr>
<tr bgcolor="#0d1117"><td>⬇️</td><td><b>Export History CSV</b></td><td>Download all past runs as a spreadsheet</td></tr>
<tr bgcolor="#161b22"><td>📝</td><td><b>Cover Letter Analyzer</b></td><td>Upload your cover letter alongside resume — JD match score shown</td></tr>
<tr bgcolor="#0d1117"><td>👤</td><td><b>Role-Specific Scoring</b></td><td>Adjust score weights for Software Engineer / PM / Data Scientist</td></tr>
<tr bgcolor="#161b22"><td>🏢</td><td><b>ATS System Presets</b></td><td>Greenhouse, Workday, Lever — each applies its own scoring rules</td></tr>
<tr bgcolor="#0d1117"><td>⎘</td><td><b>Copy All Missing Keywords</b></td><td>One-click copy of every missing keyword to clipboard</td></tr>
<tr bgcolor="#161b22"><td>📖</td><td><b>Readability Score</b></td><td>Flesch Reading Ease — flags overly complex resume language</td></tr>
<tr bgcolor="#0d1117"><td>🚩</td><td><b>Buzzword Detector</b></td><td>Flags overused clichés ("synergy", "passionate", "rockstar"…)</td></tr>
</tbody>
</table>

---

## 🛠️ Tech Stack

<div align="center">

<table>
<thead>
<tr bgcolor="#1f2937"><th>Layer</th><th>Technology</th></tr>
</thead>
<tbody>
<tr bgcolor="#161b22"><td>🐍 <b>Backend</b></td><td>Python 3.11 · FastAPI · uvicorn</td></tr>
<tr bgcolor="#0d1117"><td>🧠 <b>NLP</b></td><td>spaCy <code>en_core_web_sm</code></td></tr>
<tr bgcolor="#161b22"><td>📄 <b>PDF Parsing</b></td><td>PyMuPDF (fitz)</td></tr>
<tr bgcolor="#0d1117"><td>⚛️ <b>Frontend</b></td><td>React 18 · Vite · Plain CSS (no Tailwind, no Bootstrap)</td></tr>
<tr bgcolor="#161b22"><td>💾 <b>Storage</b></td><td>Browser localStorage — no database</td></tr>
<tr bgcolor="#0d1117"><td>☁️ <b>Hosting</b></td><td>Backend → Render · Frontend → Vercel</td></tr>
</tbody>
</table>

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

<table>
<thead>
<tr bgcolor="#1f2937"><th>Variable</th><th>Description</th><th>Default</th></tr>
</thead>
<tbody>
<tr bgcolor="#161b22"><td><code>ALLOWED_ORIGIN</code></td><td>Frontend origin for CORS</td><td><code>*</code></td></tr>
</tbody>
</table>

### Frontend (`frontend/.env`)

<table>
<thead>
<tr bgcolor="#1f2937"><th>Variable</th><th>Description</th><th>Default</th></tr>
</thead>
<tbody>
<tr bgcolor="#161b22"><td><code>VITE_API_URL</code></td><td>URL of the FastAPI backend</td><td><code>http://localhost:8000</code></td></tr>
</tbody>
</table>

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

Made with ❤️ by Osho Upadhyay · MIT License

</div>
