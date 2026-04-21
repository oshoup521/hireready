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

> A full-stack ATS resume analyser. **Scoring runs fully offline** with spaCy — no LLM calls for the numbers.
> Upload your resume and job description (PDF, DOCX, or paste the JD as text) and get a detailed visual score report in seconds.
> Optional **Resume Coach chatbot** powered by free-tier LLMs walks you through the report.

<br/>

![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
![Offline Scoring](https://img.shields.io/badge/Scoring-Offline-brightgreen?style=flat-square)
![PDF+DOCX](https://img.shields.io/badge/Uploads-PDF%20%7C%20DOCX%20%7C%20Text-blueviolet?style=flat-square)

</div>

---

## 🚀 Why HireReady?

- 🔒 **Offline scoring** — spaCy runs locally on the backend. No LLMs in the scoring path, no OpenAI keys required for the score itself.
- ⚡ **Instant results** — Full report in seconds.
- 🎯 **Far beyond keyword match** — Formatting checks, grammar, action verbs, quantified achievements, job title relevance, **years-of-experience fit, seniority mismatch detection, employment-gap analysis, section order recommendations, and bullet-density flagging**.
- 🧠 **Skill synonyms built in** — `js` ↔ `javascript`, `k8s` ↔ `kubernetes`, `ml` ↔ `machine learning`, `postgres` ↔ `postgresql`, and many more resolve to a single canonical form before matching.
- 📋 **Paste JD as text** — No need to save a JD to PDF. Paste it straight from LinkedIn / Greenhouse / a careers page.
- 📊 **Visual report card** — Scores, charts, keyword pills, section audit, rewrite suggestions — all in one clean UI.
- ⚖️ **Multi-JD compare mode** — Score your resume against **up to 5 JDs** side by side.
- 💬 **Resume Coach chatbot** *(optional)* — Ask follow-up questions about your report. Walks a ranked pool of free-tier LLMs (OpenRouter / Groq / Gemini / Cerebras) until one responds.
- 🕒 **Track your progress** — Score history in localStorage lets you see improvement across resume versions.
- 🧪 **Try before you upload** — Built-in sample resume and JD so anyone can test the app instantly.
- 🆓 **Free to deploy** — Runs on Render + Vercel free tiers.

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
<tr bgcolor="#0d1117"><td>🔀</td><td><b>Skill Synonyms</b></td><td><code>js</code>↔<code>javascript</code>, <code>k8s</code>↔<code>kubernetes</code>, <code>ml</code>↔<code>machine learning</code>, and more</td></tr>
</tbody>
</table>

</td>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 📊 Quality Metrics

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>🤖</td><td><b>ATS Formatting</b></td><td>Flags tables, columns, images, headers that break parsers</td></tr>
<tr bgcolor="#0d1117"><td>✍️</td><td><b>Grammar & Spelling</b></td><td>Offline error detection via pyspellchecker</td></tr>
<tr bgcolor="#161b22"><td>⚡</td><td><b>Action Verb Analysis</b></td><td>Strong (Led, Built) vs weak (Helped, Responsible for)</td></tr>
<tr bgcolor="#0d1117"><td>📈</td><td><b>Quantification Score</b></td><td>Detects metric-backed achievements ("sales up 30%")</td></tr>
<tr bgcolor="#161b22"><td>🎯</td><td><b>Job Title Relevance</b></td><td>Matches your titles to JD seniority and role</td></tr>
<tr bgcolor="#0d1117"><td>📖</td><td><b>Readability Score</b></td><td>Flesch Reading Ease — flags overly complex language</td></tr>
<tr bgcolor="#161b22"><td>🚩</td><td><b>Buzzword Detector</b></td><td>Flags overused clichés ("synergy", "passionate", "rockstar"…)</td></tr>
<tr bgcolor="#0d1117"><td>📄</td><td><b>Bullet Density Check</b></td><td>Detects dense prose paragraphs in Experience/Projects that should be bullet points</td></tr>
</tbody>
</table>

</td>
</tr>
<tr>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 📅 Experience Fit (v2.5)

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>🎯</td><td><b>Required Years</b></td><td>Parses "5+ years", "at least 3 years", "2–5 years" from JD</td></tr>
<tr bgcolor="#0d1117"><td>📆</td><td><b>Candidate Years</b></td><td>Combines self-claimed ("8 years of experience") with parsed date ranges from Experience section</td></tr>
<tr bgcolor="#161b22"><td>👔</td><td><b>Seniority Detection</b></td><td>Junior / Mid / Senior / Lead / Principal — from titles and years</td></tr>
<tr bgcolor="#0d1117"><td>⚠️</td><td><b>Seniority Mismatch</b></td><td>Warns when JD targets Senior but resume reads Junior (or vice-versa)</td></tr>
<tr bgcolor="#161b22"><td>🕳️</td><td><b>Employment Gaps</b></td><td>Detects gaps &gt; 6 months between roles, skipping education years</td></tr>
</tbody>
</table>

</td>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 🔍 Keyword Intelligence

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>✅</td><td><b>Matched Keywords</b></td><td>Keywords present in both resume and JD</td></tr>
<tr bgcolor="#0d1117"><td>❌</td><td><b>Missing Keywords</b></td><td>JD keywords absent from resume — most actionable</td></tr>
<tr bgcolor="#161b22"><td>➕</td><td><b>Extra Keywords</b></td><td>Resume keywords beyond the JD scope</td></tr>
<tr bgcolor="#0d1117"><td>📋</td><td><b>Section Audit</b></td><td>Finds and flags missing resume sections</td></tr>
<tr bgcolor="#161b22"><td>🔀</td><td><b>Section Order Recommendations</b></td><td>Detects section order; suggests optimal ordering for experienced vs entry-level candidates</td></tr>
<tr bgcolor="#0d1117"><td>⎘</td><td><b>Copy Missing Keywords</b></td><td>Dropdown with <b>Copy as list</b> and <b>Copy comma-separated</b> formats</td></tr>
</tbody>
</table>

</td>
</tr>
<tr>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 💡 Suggestions & Rewrites

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>🗒️</td><td><b>Improvement Tips</b></td><td>Actionable suggestions based on score gaps</td></tr>
<tr bgcolor="#0d1117"><td>✏️</td><td><b>Bullet Rewrites</b></td><td>Weak bullets rewritten with action verb + metric placeholder</td></tr>
<tr bgcolor="#161b22"><td>📋</td><td><b>Copy Rewritten Bullet</b></td><td>One-click copy button on every rewrite — paste straight back into your resume</td></tr>
</tbody>
</table>

</td>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 💬 Resume Coach Chatbot

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>🤝</td><td><b>Contextual Chat</b></td><td>Every turn re-sends the full report so the model always has your data</td></tr>
<tr bgcolor="#0d1117"><td>🪜</td><td><b>Fallback Pool</b></td><td>Walks OpenRouter → Groq → Gemini → Cerebras free-tier models; first to respond wins</td></tr>
<tr bgcolor="#161b22"><td>🧭</td><td><b>Mode-Aware</b></td><td>Coach doesn't discuss JD match when no JD was provided</td></tr>
<tr bgcolor="#0d1117"><td>🔑</td><td><b>Optional</b></td><td>App works without any API keys — coach stays disabled if none are set</td></tr>
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
<tr bgcolor="#161b22"><td>📄</td><td><b>PDF + DOCX Uploads</b></td><td>Both file types supported for resume, JD, and cover letter</td></tr>
<tr bgcolor="#0d1117"><td>📝</td><td><b>Paste JD as Text</b></td><td>Textarea fallback — paste JD from any web page, no PDF needed</td></tr>
<tr bgcolor="#161b22"><td>🔀</td><td><b>Two Modes</b></td><td>ATS-only check or full ATS vs JD comparison</td></tr>
<tr bgcolor="#0d1117"><td>🔵</td><td><b>Score Ring</b></td><td>Animated SVG ring — 🔴 red / 🟠 orange / 🟢 green</td></tr>
<tr bgcolor="#161b22"><td>📄</td><td><b>Resume Text Viewer</b></td><td>Extracted text with keyword &amp; verb highlights</td></tr>
<tr bgcolor="#0d1117"><td>📌</td><td><b>Sticky Split Layout</b></td><td>Left panel sticks; right panel scrolls freely</td></tr>
<tr bgcolor="#161b22"><td>⚖️</td><td><b>Multi-JD Compare</b></td><td>One resume vs <b>up to 5</b> JDs side by side</td></tr>
<tr bgcolor="#0d1117"><td>🧪</td><td><b>Sample Files</b></td><td>Test instantly without uploading your own files</td></tr>
<tr bgcolor="#161b22"><td>🔄</td><td><b>Re-Analyze Button</b></td><td>Swap resume without refreshing the page</td></tr>
<tr bgcolor="#0d1117"><td>📥</td><td><b>Download as PDF</b></td><td>Real PDF via jsPDF + html2canvas — no print dialog, works offline</td></tr>
<tr bgcolor="#161b22"><td>🔁</td><td><b>Run Diff View</b></td><td>Side-by-side score delta (▲/▼) + keyword changes vs previous run</td></tr>
<tr bgcolor="#161b22"><td>🎊</td><td><b>Confetti Animation</b></td><td>Celebration burst when your score hits 75+</td></tr>
<tr bgcolor="#0d1117"><td>🎴</td><td><b>Score Share Card</b></td><td>Spotify Wrapped-style card — download as PNG to share</td></tr>
</tbody>
</table>

</td>
<td width="50%" valign="top" style="border:1px solid #30363d; border-radius:8px; padding:16px;">

### 🕒 Score History, Extras & Theme

<table>
<thead><tr bgcolor="#1f2937"><th></th><th>Feature</th><th>What it does</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td>💾</td><td><b>Persistent History</b></td><td>Last 10 runs saved in localStorage</td></tr>
<tr bgcolor="#0d1117"><td>👁️</td><td><b>One-Click Restore</b></td><td>View any past report — list auto-collapses</td></tr>
<tr bgcolor="#161b22"><td>📈</td><td><b>Score Trend Chart</b></td><td>Line graph across history runs</td></tr>
<tr bgcolor="#0d1117"><td>✅</td><td><b>Applied Tag</b></td><td>Mark each entry as "Applied" — persisted in localStorage</td></tr>
<tr bgcolor="#161b22"><td>👑</td><td><b>Best Score Badge</b></td><td>Crown icon on your highest-scoring entry</td></tr>
<tr bgcolor="#0d1117"><td>⬇️</td><td><b>Export History CSV</b></td><td>Download all past runs as a spreadsheet</td></tr>
<tr bgcolor="#161b22"><td>🗑️</td><td><b>Clear History</b></td><td>Wipes history and dismisses open report</td></tr>
<tr bgcolor="#0d1117"><td>📝</td><td><b>Cover Letter Analyzer</b></td><td>Upload cover letter alongside resume — JD match score shown</td></tr>
<tr bgcolor="#161b22"><td>✉️</td><td><b>Cover Letter Generator</b></td><td>Generates a tailored cover letter draft from your resume + JD — template-based, no LLM, fully offline</td></tr>
<tr bgcolor="#161b22"><td>👤</td><td><b>Role-Specific Scoring</b></td><td>Adjusted weights for Software Engineer / PM / Data Scientist</td></tr>
<tr bgcolor="#0d1117"><td>🏢</td><td><b>ATS System Presets</b></td><td>Greenhouse / Workday / Lever — each applies its own scoring rules</td></tr>
<tr bgcolor="#161b22"><td>🌙</td><td><b>Dark / Light Theme</b></td><td>Toggle with preference saved in localStorage</td></tr>
<tr bgcolor="#0d1117"><td>📱</td><td><b>Responsive Design</b></td><td>Mobile-first, stacks cleanly on small screens</td></tr>
<tr bgcolor="#161b22"><td>🖨️</td><td><b>Print Styles</b></td><td>Clean white PDF output via <code>@media print</code></td></tr>
</tbody>
</table>

</td>
</tr>
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
<tr bgcolor="#0d1117"><td>🧠 <b>NLP</b></td><td>spaCy <code>en_core_web_sm</code> · pyspellchecker</td></tr>
<tr bgcolor="#161b22"><td>📄 <b>File Parsing</b></td><td>PyMuPDF (fitz) for PDF · python-docx for DOCX</td></tr>
<tr bgcolor="#0d1117"><td>💬 <b>Coach Chatbot</b></td><td>LiteLLM → OpenRouter / Groq / Gemini / Cerebras (free tiers)</td></tr>
<tr bgcolor="#161b22"><td>⚛️ <b>Frontend</b></td><td>React 18 · Vite · Plain CSS (no Tailwind, no Bootstrap)</td></tr>
<tr bgcolor="#0d1117"><td>💾 <b>Storage</b></td><td>Browser localStorage — no database</td></tr>
<tr bgcolor="#161b22"><td>☁️ <b>Hosting</b></td><td>Backend → Render · Frontend → Vercel</td></tr>
</tbody>
</table>

</div>

> 🔒 **Scoring is fully offline** — no LLMs, no API keys, no external calls for the numbers.
> 💬 **Coach chatbot is optional** — set at least `OPENROUTER_API_KEY` to enable it. Without any provider keys, the chat panel simply stays disabled; scoring still works.

---

## 📁 Project Structure

```
/
├── 📄 README.md
├── 📄 CLAUDE.md                 # Original project spec / blueprint
├── 🐍 backend/
│   ├── main.py                  # FastAPI app: /health, /analyze, /compare, /chat, /generate-cover-letter
│   ├── scorer.py                # spaCy NLP scoring engine (all scoring logic)
│   ├── parser.py                # PDF + DOCX text extractor
│   ├── coach.py                 # LiteLLM Resume Coach chatbot + fallback pool
│   ├── cover_letter.py          # Template-based cover letter generator (no LLM)
│   ├── generate_samples.py      # Builds the sample resume / JD PDFs
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
            ├── UploadSection.jsx    # Drag-and-drop + paste-JD textarea + sample files
            ├── ReportCard.jsx       # Full score report renderer
            ├── ScoreRing.jsx        # Animated circular SVG score
            ├── ProgressBar.jsx      # Animated score bars
            ├── KeywordBadges.jsx    # Matched / missing / extra keyword pills
            ├── DownloadButton.jsx   # Print-to-PDF trigger
            ├── ResumeTextViewer.jsx # Sticky left panel with keyword highlights
            ├── DetailPanel.jsx      # Collapsible detail sections
            ├── ScoreHistory.jsx     # localStorage history + trend chart + CSV export
            ├── ScoreShareCard.jsx   # Spotify-Wrapped-style PNG share card
            ├── PDFViewer.jsx        # In-browser PDF preview
            ├── CompareMode.jsx           # Multi-JD side-by-side comparison (up to 5)
            ├── CoachChat.jsx             # Resume Coach chatbot panel
            ├── CoverLetterGenerator.jsx  # Tailored cover letter draft generator
            └── ScoreDiff.jsx             # Score delta banner vs previous run
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
# (Optional) add OPENROUTER_API_KEY etc. to enable the Resume Coach chatbot

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
5. Add environment variables:
   - `ALLOWED_ORIGIN` → your Vercel frontend URL
   - *(optional)* `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY` — enable the Resume Coach chatbot

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
<tr bgcolor="#1f2937"><th>Variable</th><th>Description</th><th>Required</th></tr>
</thead>
<tbody>
<tr bgcolor="#161b22"><td><code>ALLOWED_ORIGIN</code></td><td>Frontend origin for CORS</td><td>No (default <code>*</code>)</td></tr>
<tr bgcolor="#0d1117"><td><code>OPENROUTER_API_KEY</code></td><td>Primary Coach provider</td><td>Only for Coach chatbot</td></tr>
<tr bgcolor="#161b22"><td><code>GROQ_API_KEY</code></td><td>Fallback Coach provider</td><td>Optional</td></tr>
<tr bgcolor="#0d1117"><td><code>GEMINI_API_KEY</code></td><td>Fallback Coach provider</td><td>Optional</td></tr>
<tr bgcolor="#161b22"><td><code>CEREBRAS_API_KEY</code></td><td>Fallback Coach provider</td><td>Optional</td></tr>
</tbody>
</table>

> Scoring (`/analyze`, `/compare`) never calls any LLM and needs **no** API keys. The chatbot (`/chat`) is the only feature that uses them — and will return `503` gracefully if every provider fails or none are configured.

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

Accepts `multipart/form-data`. The JD is optional — omit it to run in **ATS-only mode** (resume scored on its own merits).

<table>
<thead><tr bgcolor="#1f2937"><th>Field</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td><code>resume</code></td><td>File (PDF or DOCX)</td><td><b>Required</b></td></tr>
<tr bgcolor="#0d1117"><td><code>jd</code></td><td>File (PDF or DOCX)</td><td>Optional — job description file</td></tr>
<tr bgcolor="#161b22"><td><code>jd_text</code></td><td>String</td><td>Optional — pasted JD text (min 30 chars). File wins if both are sent</td></tr>
<tr bgcolor="#0d1117"><td><code>cover_letter</code></td><td>File (PDF or DOCX)</td><td>Optional — cover letter for JD-match scoring</td></tr>
<tr bgcolor="#161b22"><td><code>ats_preset</code></td><td>String</td><td>Optional — one of <code>greenhouse</code>, <code>workday</code>, <code>lever</code></td></tr>
</tbody>
</table>

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
  "readability_score": 58,
  "buzzwords_found": ["synergy", "rockstar"],

  "title_relevance_score": 80,
  "detected_jd_title": "Senior Software Engineer",
  "job_title_match": true,

  "required_years": 5,
  "candidate_years": 3.5,
  "years_match": false,
  "experience_gap_years": 1.5,
  "years_fit_score": 60,
  "jd_seniority": "senior",
  "resume_seniority": "mid",
  "implied_seniority": "mid",
  "seniority_mismatch": true,
  "seniority_warning": "JD targets a Senior-level role, but your resume reads as Mid-level.",
  "positions_found": 3,
  "employment_gaps": [
    { "gap_months": 9, "after": "2022-06", "before": "2023-03" }
  ],

  "matched_keywords": ["python", "machine learning"],
  "missing_keywords": ["kubernetes", "terraform"],
  "extra_keywords": ["django", "celery"],
  "sections_found": ["Experience", "Education", "Skills"],
  "sections_missing": ["Summary", "Certifications"],
  "section_order": ["Education", "Skills", "Experience"],
  "section_order_suggestions": [
    "For experienced candidates, move Experience above Skills — it carries more weight."
  ],
  "bullet_density_issues": [
    "Dense paragraph detected near the 'Experience' section — break this into 2–4 bullet points."
  ],

  "cover_letter_score": 72,
  "cover_letter_matched": ["python", "rest api"],
  "cover_letter_missing": ["kubernetes"],

  "suggestions": [
    "JD targets a Senior-level role, but your resume reads as Mid-level.",
    "Add a professional summary section..."
  ],
  "rewrite_suggestions": [
    {
      "original": "Helped with backend tasks",
      "rewritten": "Engineered backend services that improved throughput by X%"
    }
  ],

  "resume_word_count": 512,
  "jd_word_count": 348,
  "resume_text": "…first 6000 chars of extracted resume text…",
  "jd_text": "…first 4000 chars of extracted JD text…"
}
```

</details>

<details>
<summary><b>🔍 ATS-only mode (no JD provided)</b></summary>

When neither `jd` nor `jd_text` is sent, the response uses `mode: "resume_only"` and:
- `matched_keywords` / `missing_keywords` are empty
- Resume keywords appear in `extra_keywords`
- JD-specific fields (`required_years`, `jd_seniority`, `seniority_warning`, etc.) are `null`
- Scoring is weighted across **skills breadth, experience richness, education, and section completeness**

</details>

### `POST /compare`

Compare one resume against **up to 5 JDs** in a single request.

<table>
<thead><tr bgcolor="#1f2937"><th>Field</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td><code>resume</code></td><td>File (PDF or DOCX)</td><td><b>Required</b></td></tr>
<tr bgcolor="#0d1117"><td><code>jds</code></td><td>File[] (PDF or DOCX)</td><td><b>Required</b> — 1 to 5 JD files</td></tr>
</tbody>
</table>

Returns a JSON **array** of `/analyze`-shaped reports, one per JD, each with an added `jd_label` field (the original filename).

### `POST /chat`

Resume Coach chatbot. Requires at least one configured provider API key on the backend.

```json
{
  "messages": [
    { "role": "user", "content": "Why is my experience score low?" }
  ],
  "report": { "…full report returned by /analyze…": "" }
}
```

**Response:**

```json
{ "reply": "Your experience score is low because…", "model_used": "openrouter/google/gemma-3-27b-it:free" }
```

Returns `503` if every provider in the fallback pool fails or none are configured.

### `POST /generate-cover-letter`

Generates a tailored cover letter draft. Fully offline — no LLM, template-based.

<table>
<thead><tr bgcolor="#1f2937"><th>Field</th><th>Type</th><th>Description</th></tr></thead>
<tbody>
<tr bgcolor="#161b22"><td><code>resume_text</code></td><td>String</td><td><b>Required</b> — plain text already extracted from the resume (available in <code>report.resume_text</code>)</td></tr>
<tr bgcolor="#0d1117"><td><code>jd_text</code></td><td>String</td><td>Optional — improves skill matching when provided</td></tr>
<tr bgcolor="#161b22"><td><code>applicant_name</code></td><td>String</td><td>Optional — auto-detected from resume top if omitted</td></tr>
<tr bgcolor="#0d1117"><td><code>company_name</code></td><td>String</td><td>Optional — shown as "your organisation" if omitted</td></tr>
<tr bgcolor="#161b22"><td><code>role_name</code></td><td>String</td><td>Optional — auto-detected from JD if omitted</td></tr>
</tbody>
</table>

**Response:**

```json
{
  "cover_letter": "Dear Hiring Manager,\n\nI am writing to express…",
  "detected_name": "Jane Doe",
  "detected_role": "Senior Software Engineer",
  "matched_skills_used": ["python", "react", "postgresql"],
  "achievement_used": "Reduced API latency by 40% through caching layer redesign"
}
```

Rate-limited to **10 requests / minute** per IP.

---

<div align="center">

Made with ❤️ by Osho Upadhyay · MIT License

</div>
