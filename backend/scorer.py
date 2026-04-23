"""
scorer.py — NLP Scoring Engine
Uses spaCy en_core_web_sm to analyse resume vs job description and produce
a structured score report with actionable suggestions.
"""

import re
from datetime import date

import spacy
from spellchecker import SpellChecker

# ---------------------------------------------------------------------------
# Load spaCy model once at module import time (avoids repeated disk I/O)
# ---------------------------------------------------------------------------
nlp = spacy.load("en_core_web_sm")

# ---------------------------------------------------------------------------
# Hardcoded skill vocabulary used for skills_score calculation
# ---------------------------------------------------------------------------
TECH_SKILLS = {
    # Programming languages
    "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
    "kotlin", "swift", "php", "ruby", "scala", "r", "matlab",
    # Web / frontend
    "react", "angular", "vue", "html", "css", "sass", "webpack", "vite",
    "nextjs", "gatsby", "redux", "graphql", "rest", "api",
    # Backend / frameworks
    "django", "flask", "fastapi", "spring", "express", "node", "nodejs",
    "laravel", "rails", "asp.net",
    # Data / ML
    "machine learning", "deep learning", "nlp", "tensorflow", "pytorch",
    "keras", "scikit-learn", "pandas", "numpy", "spark", "hadoop",
    "data analysis", "data science", "statistics",
    # Cloud / DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible",
    "jenkins", "ci/cd", "linux", "bash", "git", "github", "gitlab",
    # Databases
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch",
    "cassandra", "dynamodb", "oracle",
    # Soft skills
    "communication", "teamwork", "leadership", "problem solving",
    "critical thinking", "collaboration", "agile", "scrum", "kanban",
    "project management", "time management", "mentoring",
}

# ---------------------------------------------------------------------------
# Skill synonym map — collapses common aliases to a canonical form so that
# "js" / "javascript" / "java script" all count as a single skill match.
# Keys are lowercase variants, values are the canonical form that appears
# in TECH_SKILLS (or a normalised multi-word form).
# ---------------------------------------------------------------------------
SKILL_SYNONYMS = {
    # Languages
    "js": "javascript",
    "java script": "javascript",
    "ecmascript": "javascript",
    "ts": "typescript",
    "py": "python",
    "golang": "go",
    "cpp": "c++",
    "c plus plus": "c++",
    "csharp": "c#",
    "c sharp": "c#",
    "dotnet": ".net",
    ".net": "asp.net",
    # Frontend
    "reactjs": "react",
    "react.js": "react",
    "react js": "react",
    "vuejs": "vue",
    "vue.js": "vue",
    "next": "nextjs",
    "next.js": "nextjs",
    "nuxt": "nextjs",
    # Backend
    "node": "nodejs",
    "node.js": "nodejs",
    "expressjs": "express",
    "express.js": "express",
    # Data / ML
    "ml": "machine learning",
    "dl": "deep learning",
    "nlp": "nlp",
    "natural language processing": "nlp",
    "tf": "tensorflow",
    "sklearn": "scikit-learn",
    "scikit learn": "scikit-learn",
    # Cloud / DevOps
    "k8s": "kubernetes",
    "kube": "kubernetes",
    "gcloud": "gcp",
    "google cloud": "gcp",
    "amazon web services": "aws",
    "microsoft azure": "azure",
    "ci cd": "ci/cd",
    "cicd": "ci/cd",
    "continuous integration": "ci/cd",
    "continuous delivery": "ci/cd",
    # Databases
    "postgres": "postgresql",
    "psql": "postgresql",
    "mongo": "mongodb",
    "es": "elasticsearch",
    "mssql": "sql",
    "tsql": "sql",
    # Soft / methodologies
    "pm": "project management",
    "oop": "object-oriented programming",
    "tdd": "test-driven development",
}

# Precompiled multi-word regex list, sorted by length descending so that
# "amazon web services" is matched before "aws" on the same text slice.
_SKILL_TERMS_SORTED = sorted(
    set(TECH_SKILLS) | set(SKILL_SYNONYMS.keys()),
    key=len,
    reverse=True,
)


def _canonical_skill(term: str) -> str:
    """Return the canonical skill string for a raw term, using SKILL_SYNONYMS."""
    t = term.lower().strip()
    return SKILL_SYNONYMS.get(t, t)


def _find_skills_in_text(text: str) -> set[str]:
    """
    Find all skills mentioned in a block of text, resolving synonyms to
    their canonical form. Uses word-boundary matching so "js" inside
    "jscript" is not matched.
    """
    lower = text.lower()
    found: set[str] = set()
    for term in _SKILL_TERMS_SORTED:
        # Word-boundary match. Escape regex-special chars in the term
        # (e.g. "c++", "c#", ".net", "ci/cd").
        pattern = r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])"
        if re.search(pattern, lower):
            found.add(_canonical_skill(term))
    return found


# Keywords used to detect resume sections
SECTION_KEYWORDS = {
    "Summary":        ["summary", "objective", "profile", "about me", "about"],
    "Experience":     ["experience", "work experience", "employment", "work history",
                       "professional experience", "career"],
    "Education":      ["education", "academic", "qualification", "degree", "university",
                       "college", "school"],
    "Skills":         ["skills", "technical skills", "core competencies",
                       "competencies", "expertise"],
    "Projects":       ["projects", "personal projects", "key projects", "portfolio"],
    "Certifications": ["certification", "certifications", "certificate", "licensed",
                       "credential"],
    "Achievements":   ["achievements", "awards", "honors", "accomplishments",
                       "recognition"],
}

# Keywords that signal experience content
EXPERIENCE_KEYWORDS = {
    "years", "experience", "worked", "developed", "managed", "led", "built",
    "designed", "implemented", "delivered", "improved", "created", "achieved",
    "maintained", "deployed", "architected", "coordinated", "collaborated",
}

# Keywords that signal education content
EDUCATION_KEYWORDS = {
    "bachelor", "master", "degree", "university", "college",
    "b.tech", "b.e", "be", "btech", "mba", "phd", "ph.d",
    "b.sc", "m.sc", "bsc", "msc", "graduate", "undergraduate",
    "diploma", "associate",
}

# Unicode symbols that look decorative but break many ATS parsers
_ATS_PROBLEMATIC_SYMBOLS = set(
    "●○■□►▶▸→←↑↓★☆✦✧♦◆◇⊲⊳⊙⊚⊛⊜⊝✓✗✘✔✕❌❖"
    "①②③④⑤⑥⑦⑧⑨⑩"
)

# Spell checker instance — loaded once, language English
_spell = SpellChecker(language="en")

# Tech / professional terms that pyspellchecker flags but are correct
_SPELL_WHITELIST = {
    # Languages & runtimes
    "python", "javascript", "typescript", "kotlin", "golang", "nodejs",
    "html", "css", "scss", "sass", "yaml", "json", "xml",
    # Frameworks / libraries
    "react", "reactjs", "nextjs", "vuejs", "nuxtjs", "fastapi", "django",
    "flask", "pytorch", "tensorflow", "scikit", "sklearn", "numpy", "pandas",
    "redux", "webpack", "vite", "graphql", "mongoose", "sequelize",
    # Cloud / DevOps
    "aws", "gcp", "azure", "kubernetes", "kubectl", "terraform", "ansible",
    "jenkins", "gitlab", "github", "devops", "cicd", "mlops",
    # Databases
    "postgresql", "mongodb", "elasticsearch", "cassandra", "dynamodb",
    "redis", "sqlite", "nosql", "mysql",
    # Roles / degrees
    "fullstack", "frontend", "backend", "devops", "sre", "llm", "nlp",
    "btech", "mtech", "bsc", "msc", "phd", "mba",
    # Common resume words that get flagged
    "spearheaded", "architected", "mentored", "upskilled", "reskilled",
    "onboarded", "offboarded", "bootstrapped", "containerized",
    "microservices", "microservice", "serverless", "saas", "paas", "iaas",
    "oauth", "jwt", "restful", "websocket", "grpc",
    # Analytics / data
    "analytics", "visualization", "visualizations", "datasets", "dataset",
    "preprocessing", "hyperparameter", "hyperparameters", "automl", "mlflow",
    # Dev tools & platforms
    "devtool", "devtools", "webpack", "eslint", "prettier", "linting",
    "makefile", "dockerfile", "kubernetes", "helm", "istio", "prometheus",
    "grafana", "kibana", "logstash", "airflow", "dbt", "databricks",
    "snowflake", "bigquery", "looker", "tableau", "metabase",
    # British / Australian English spellings
    "optimisation", "optimisations", "organisation", "organisations",
    "organise", "organised", "organising", "realise", "realised", "realising",
    "analyse", "analysed", "analysing", "colour", "colours", "behaviour",
    "behaviours", "travelling", "modelling", "labelling", "fulfil", "fulfils",
    "fulfilling", "defence", "licence", "practise", "programme", "programmes",
    "recognise", "recognised", "recognising", "initialise", "initialised",
    "customise", "customised", "customising", "utilise", "utilised", "utilising",
    "prioritise", "prioritised", "prioritising", "specialise", "specialised",
    "standardise", "standardised", "synchronise", "synchronised",
    # Social / professional platforms (often appear lowercased in parsed text)
    "linkedin", "github", "gitlab", "stackoverflow", "leetcode", "kaggle",
    "hackerrank", "codechef", "topcoder", "bitbucket", "jira", "confluence",
    "trello", "asana", "notion", "figma", "canva", "hubspot", "salesforce",
    "zendesk", "intercom", "stripe", "twilio", "sendgrid",
}

# ---------------------------------------------------------------------------
# Buzzword vocabulary — overused resume filler words to flag
# ---------------------------------------------------------------------------
BUZZWORDS = {
    "synergy", "synergize", "synergistic", "synergies",
    "passionate", "passion",
    "hardworking", "hard-working",
    "team player",
    "go-getter", "go getter",
    "self-starter", "self starter",
    "detail-oriented", "detail oriented",
    "results-driven", "results driven",
    "dynamic",
    "innovative", "innovation",
    "proactive",
    "leverage", "leveraging",
    "paradigm", "paradigm shift",
    "bandwidth",
    "move the needle",
    "low-hanging fruit", "low hanging fruit",
    "circle back",
    "value-add", "value add",
    "thought leader", "thought leadership",
    "game-changer", "game changer",
    "disruptive", "disrupting",
    "holistic",
    "ecosystem",
    "agnostic",
    "impactful",
    "best-in-class", "best in class",
    "forward-thinking", "forward thinking",
    "cutting-edge", "cutting edge",
    "world-class", "world class",
    "out of the box", "outside the box",
    "at the end of the day",
    "in a fast-paced environment",
    "excellent communication skills",
    "results-oriented", "results oriented",
    "highly motivated", "driven individual",
    "rockstar", "ninja", "guru", "wizard",
}

# ---------------------------------------------------------------------------
# Scoring weights used to compute the overall score in JD-comparison mode
# ---------------------------------------------------------------------------
SCORE_WEIGHTS = {
    "keyword": 0.40,
    "skills":  0.25,
    "experience": 0.20,
    "education": 0.15,
}

# ---------------------------------------------------------------------------
# ATS preset score multipliers
# Each preset nudges sub-scores to reflect what that ATS system emphasises
# ---------------------------------------------------------------------------
ATS_PRESETS = {
    "greenhouse": {
        # Greenhouse: very keyword-centric
        "keyword_boost": 1.15,
        "formatting_boost": 1.0,
        "skills_boost": 1.0,
        "label": "Greenhouse",
    },
    "workday": {
        # Workday: strict on section structure and formatting
        "keyword_boost": 1.0,
        "formatting_boost": 1.20,
        "skills_boost": 1.0,
        "label": "Workday",
    },
    "lever": {
        # Lever: skills/experience oriented, lenient on keywords
        "keyword_boost": 0.90,
        "formatting_boost": 0.90,
        "skills_boost": 1.25,
        "label": "Lever",
    },
}

# Passive voice auxiliary verbs
_PASSIVE_AUX = re.compile(
    r"\b(was|were|been|being|is|are|am)\s+\w+ed\b", re.IGNORECASE
)

# Weak resume openers that should be replaced with action verbs.
# Use non-capturing groups so re.findall returns full matched strings, not tuples.
_WEAK_OPENERS = [
    r"\bresponsible for\b",
    r"\bhelped (?:with|to)\b",
    r"\bworked on\b",
    r"\bassisted (?:with|in)\b",
    r"\bpart of (?:the|a)\b",
    r"\binvolved in\b",
    r"\bsupported (?:the|a)\b",
]
_WEAK_OPENER_RE = re.compile("|".join(_WEAK_OPENERS), re.IGNORECASE)

# Wordy / filler phrases to flag
_WORDY_PHRASES = [
    ("in order to",     "to"),
    ("due to the fact that", "because"),
    ("at this point in time", "currently"),
    ("on a daily basis", "daily"),
    ("in the event that", "if"),
    ("a large number of", "many"),
    ("for the purpose of", "to"),
]

# ---------------------------------------------------------------------------
# Action verb vocabulary
# ---------------------------------------------------------------------------
# Strong action verbs — signal impact and ownership
_STRONG_VERBS = {
    "accelerated", "achieved", "architected", "automated", "boosted",
    "built", "championed", "collaborated", "conceived", "consolidated",
    "created", "cut", "decreased", "delivered", "deployed", "designed",
    "developed", "directed", "drove", "engineered", "enhanced", "established",
    "exceeded", "executed", "expanded", "founded", "generated", "grew",
    "guided", "implemented", "improved", "increased", "initiated",
    "integrated", "launched", "led", "managed", "mentored", "migrated",
    "modernized", "negotiated", "optimized", "orchestrated", "oversaw",
    "pioneered", "published", "reduced", "refactored", "resolved",
    "restructured", "scaled", "secured", "shaped", "simplified", "solved",
    "spearheaded", "streamlined", "transformed", "tripled", "unified",
    "upgraded", "won", "wrote",
}

# Weak openers — vague, passive, or responsibility-focused
_WEAK_VERBS = {
    "assisted", "contributed", "handled", "helped", "involved",
    "participated", "responsible", "supported", "tasked", "worked",
    "coordinated", "maintained",  # not inherently weak but overused
}

# ---------------------------------------------------------------------------
# Job title relevance helpers
# ---------------------------------------------------------------------------
# Patterns that introduce a job title in a JD
_JD_TITLE_TRIGGERS = re.compile(
    r"(?:we are looking for|seeking|hiring|position of|role of|title[:\s]+|job title[:\s]+)"
    r"\s*(?:a|an|the)?\s*([A-Z][a-zA-Z\s/\-]{2,50})",
    re.IGNORECASE,
)

# Common seniority / modifier words to strip when comparing
_TITLE_STOP_WORDS = {
    "senior", "junior", "lead", "principal", "staff", "associate", "mid",
    "mid-level", "entry", "entry-level", "experienced", "a", "an", "the",
}

# Regex: match the first word of bullet lines (lines starting with – • - * or a capital word)
_BULLET_LINE_RE = re.compile(
    r"^[\s\-\•\*\–\—]*([A-Za-z]+)", re.MULTILINE
)

# ---------------------------------------------------------------------------
# Years-of-experience patterns
# ---------------------------------------------------------------------------
# Match explicit requirements in a JD: "5+ years", "at least 3 years of experience",
# "minimum of 4 years", "2-5 years of experience"
_JD_YEARS_PATTERNS = [
    re.compile(r"\b(\d{1,2})\s*[\-–]\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b", re.IGNORECASE),
    re.compile(r"\b(?:at least|minimum of|min\.?|min)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b", re.IGNORECASE),
    re.compile(r"\b(\d{1,2})\s*\+\s*(?:years?|yrs?)\b", re.IGNORECASE),
    re.compile(r"\b(\d{1,2})\s*(?:or more|plus)\s*(?:years?|yrs?)\b", re.IGNORECASE),
    re.compile(r"\b(\d{1,2})\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp\.?)\b", re.IGNORECASE),
]

# Resume self-claimed years: "8 years of experience in...", "Over 5 years"
_RESUME_YEARS_PATTERNS = [
    re.compile(r"\b(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp\.?|industry experience)\b", re.IGNORECASE),
    re.compile(r"\bover\s+(\d{1,2})\s*(?:years?|yrs?)\b", re.IGNORECASE),
    re.compile(r"\bwith\s+(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience\b", re.IGNORECASE),
]

# ---------------------------------------------------------------------------
# Seniority vocabulary — ordered from most senior to least senior so we pick
# the strongest signal if multiple terms appear.
# ---------------------------------------------------------------------------
SENIORITY_LEVELS = [
    ("principal",  {"principal", "distinguished", "fellow"}),
    ("staff",      {"staff"}),
    ("lead",       {"lead", "tech lead", "team lead"}),
    ("senior",     {"senior", "sr.", "sr"}),
    ("mid",        {"mid-level", "mid level", "intermediate"}),
    ("junior",     {"junior", "jr.", "jr", "associate"}),
    ("entry",      {"entry-level", "entry level", "graduate", "intern", "trainee"}),
]

# Canonical ordering for comparing seniority levels (higher = more senior)
_SENIORITY_RANK = {
    "entry":     0,
    "junior":    1,
    "mid":       2,
    "senior":    3,
    "lead":      4,
    "staff":     5,
    "principal": 6,
}

# ---------------------------------------------------------------------------
# Employment date-range patterns
# ---------------------------------------------------------------------------
_MONTH_MAP = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

# "Jan 2020 - Present", "March 2019 – August 2022", "Feb. 2018 to Dec 2020"
_DATE_RANGE_WORDY = re.compile(
    r"\b("
    r"jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?"
    r")\.?\s+(\d{4})\s*"
    r"(?:[-–—to]+|until)\s*"
    r"(?:("
    r"jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
    r"jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?"
    r")\.?\s+(\d{4})|present|current|now|today)\b",
    re.IGNORECASE,
)

# "03/2019 – 08/2022", "03-2019 to 08-2022"
_DATE_RANGE_NUMERIC = re.compile(
    r"\b(\d{1,2})[/\-](\d{4})\s*(?:[-–—to]+|until)\s*"
    r"(?:(\d{1,2})[/\-](\d{4})|present|current|now)\b",
    re.IGNORECASE,
)

# "2019 - 2022", "2020–Present"
# Lookbehind/ahead reject years that are already part of a month-day-year date
# (e.g. "06/2013 - 12/2015"), so numeric ranges aren't double-counted.
_DATE_RANGE_YEAR_ONLY = re.compile(
    r"(?<![/\-\d])\b(19\d{2}|20\d{2})\s*(?:[-–—to]+|until)\s*"
    r"(?:(19\d{2}|20\d{2})(?![/\-\d])|present|current|now)\b",
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Quantification patterns
# ---------------------------------------------------------------------------
# Matches numbers with common metric units and multipliers used in achievements
_QUANT_PATTERNS = [
    # Percentage: "30%", "30 percent", "by 30%"
    re.compile(r"\b\d+\.?\d*\s*%", re.IGNORECASE),
    re.compile(r"\b\d+\.?\d*\s*percent\b", re.IGNORECASE),
    # Dollar / currency amounts: "$1M", "$500K", "$1,200"
    re.compile(r"\$\s*\d[\d,\.]*\s*(k|m|b|million|billion|thousand)?\b", re.IGNORECASE),
    # Multipliers: "2x", "3x faster", "10× improvement"
    re.compile(r"\b\d+\.?\d*\s*[xX×]\b"),
    # Time ranges tied to achievement: "in 3 months", "within 2 weeks"
    re.compile(r"\b(in|within|under)\s+\d+\s*(day|week|month|year)s?\b", re.IGNORECASE),
    # Headcount / scale: "team of 10", "500 users", "1,000 customers"
    re.compile(r"\b\d[\d,]*\s*(user|customer|client|engineer|employee|member|server|request)s?\b", re.IGNORECASE),
    # Raw large numbers that signal scale: "10,000+", "1M records"
    re.compile(r"\b\d[\d,]+\s*(k|m|b|million|billion|thousand)\b", re.IGNORECASE),
]


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

def check_ats_formatting(resume_text: str) -> dict:
    """
    Analyse resume text for formatting patterns that break ATS parsers.

    Checks:
      1. Special / decorative Unicode symbols (●, ★, →…)
      2. Table structures — multiple tab characters per line
      3. Multi-column layout — abnormally high ratio of short lines
      4. Sparse text — likely image / graphic heavy resume
      5. Missing email address in plain text
      6. Missing phone number in plain text
      7. Excessive non-ASCII characters

    Returns:
        {
          "formatting_score":  int  (0-100, 100 = no issues),
          "formatting_issues": list[str]  (human-readable issue descriptions)
        }
    """
    issues: list[str] = []
    deductions = 0
    lines = resume_text.split("\n")
    non_empty_lines = [l.strip() for l in lines if l.strip()]

    # 1. Decorative / non-standard Unicode symbols
    symbol_hits = sum(1 for c in resume_text if c in _ATS_PROBLEMATIC_SYMBOLS)
    if symbol_hits > 5:
        issues.append(
            f"Contains {symbol_hits} special symbols (●, ★, →, etc.) that some ATS "
            "parsers cannot read. Replace with plain hyphens (-) or asterisks (*)."
        )
        deductions += 15

    # 2. Table detection — lines with 2+ tab characters
    tab_lines = [l for l in lines if l.count("\t") >= 2]
    if len(tab_lines) >= 3:
        issues.append(
            "Possible table structure detected (multiple tab-aligned columns). "
            "ATS systems often scramble table content — convert to plain bulleted lists."
        )
        deductions += 20

    # 3. Multi-column layout — over 50% of lines are very short (<35 chars)
    if len(non_empty_lines) > 20:
        short_ratio = sum(1 for l in non_empty_lines if len(l) < 35) / len(non_empty_lines)
        if short_ratio > 0.55:
            issues.append(
                "Many very short lines detected — this often indicates a two-column layout. "
                "ATS parsers read left-to-right and will mix up columns. Use a single-column format."
            )
            deductions += 20

    # 4. Sparse text — resume may be image-heavy
    word_count = len(resume_text.split())
    if word_count < 150:
        issues.append(
            f"Only {word_count} words extracted — the resume may contain images or embedded "
            "graphics that ATS cannot read. Ensure all content is selectable plain text."
        )
        deductions += 25

    # 5. No email address detectable in plain text
    has_email = bool(re.search(
        r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", resume_text
    ))
    if not has_email:
        issues.append(
            "No email address found in extracted text. If your email is inside a header, "
            "image, or text box, ATS systems may not be able to read it."
        )
        deductions += 15

    # 6. No phone number detectable in plain text
    has_phone = bool(re.search(
        r"[\+]?[(]?[0-9]{3}[)]?[\s.\-]?[0-9]{3}[\s.\-]?[0-9]{4,6}", resume_text
    ))
    if not has_phone:
        issues.append(
            "No phone number found in extracted text. Ensure contact info is in the "
            "main body as plain text, not inside a header, footer, or image."
        )
        deductions += 10

    # 7. High non-ASCII ratio
    if len(resume_text) > 0:
        non_ascii_ratio = sum(1 for c in resume_text if ord(c) > 127) / len(resume_text)
        if non_ascii_ratio > 0.05:
            issues.append(
                "High proportion of non-ASCII characters detected. This can cause "
                "garbled output in ATS systems — prefer standard ASCII punctuation."
            )
            deductions += 10

    formatting_score = max(0, 100 - deductions)

    return {
        "formatting_score": formatting_score,
        "formatting_issues": issues,
    }


def detect_job_title_relevance(resume_text: str, jd_text: str) -> dict:
    """
    Extract the most likely job title from the JD and check how well
    the resume's stated titles/roles align with it.

    Strategy:
      1. Use trigger phrases ("looking for", "seeking", "role of"…) to pull
         the title from the JD.  Fall back to the JD's first capitalised
         noun phrase if no trigger is found.
      2. Strip seniority modifiers ("Senior", "Lead"…) for a fuzzy comparison.
      3. Check whether the core title words appear in the resume.

    Returns:
        {
          "detected_jd_title":    str   (best guess at JD's target title),
          "job_title_match":      bool  (True if resume mentions the core title),
          "title_relevance_score": int  (0-100)
        }
    """
    detected_title = ""

    # Try trigger-phrase extraction first
    trigger_match = _JD_TITLE_TRIGGERS.search(jd_text)
    if trigger_match:
        raw = trigger_match.group(1).strip()
        # Trim to ≤5 words (avoids capturing whole sentences)
        detected_title = " ".join(raw.split()[:5]).rstrip(".,;:")
    else:
        # Fallback: first line of the JD that looks like a title (short, capitalised)
        for line in jd_text.split("\n"):
            line = line.strip()
            words = line.split()
            if 1 <= len(words) <= 6 and words[0][0].isupper():
                detected_title = line.rstrip(".,;:")
                break

    if not detected_title:
        return {
            "detected_jd_title": "",
            "job_title_match": False,
            "title_relevance_score": 50,   # neutral when we can't detect the title
        }

    # Core words of the detected title (strip seniority words)
    core_words = [
        w.lower() for w in detected_title.split()
        if w.lower() not in _TITLE_STOP_WORDS and len(w) > 2
    ]

    resume_lower = resume_text.lower()
    matches = sum(1 for w in core_words if w in resume_lower)

    if not core_words:
        match = False
        score = 50
    else:
        match_ratio = matches / len(core_words)
        match = match_ratio >= 0.5
        score = min(100, round(match_ratio * 100))

    return {
        "detected_jd_title": detected_title,
        "job_title_match": match,
        "title_relevance_score": score,
    }


def _detect_company_name(jd_text: str) -> str:
    """
    Extract the hiring company name from a job description using trigger phrases.
    Captures 1–4 consecutive Title-Case words; stops at sentence boundaries.
    Returns empty string if nothing confident is found.
    """
    # No period in token so "Google." stops at the dot and doesn't bleed
    _TITLE_TOKEN = r"[A-Z][A-Za-z0-9&'\-]+"
    _COMPANY     = rf"({_TITLE_TOKEN}(?:\s+{_TITLE_TOKEN}){{0,3}})"

    patterns = [
        # Case-insensitive trigger; company name still needs to start with uppercase
        rf"(?i:at|join|for|with)\s+{_COMPANY}",
        # "About Us: Stripe" — put "About Us" before "About" so it matches greedily
        rf"(?i:About\s+Us|About|Company|Who\s+We\s+Are)\s*[:\-]\s*{_COMPANY}",
        rf"^{_COMPANY}\s+(?i:is)\s+(?:a|an|the)\s+",
        rf"{_COMPANY}\s+(?i:is)\s+(?i:hiring|looking|seeking)",
    ]
    noise = {"we", "our", "the", "this", "a", "an", "you", "team", "role", "position",
             "looking", "seeking", "hiring", "about", "who", "what", "join", "us"}
    for pat in patterns:
        m = re.search(pat, jd_text, re.MULTILINE)
        if m:
            name = m.group(1).strip().rstrip(".,;:")
            if name.lower() not in noise and len(name) >= 2:
                return name
    return ""


def build_score_explanations(
    mode: str,
    keyword_match_score: int,
    skills_score: int,
    experience_score: int,
    education_score: int,
    matched_keywords: list,
    missing_keywords: list,
    jd_skills: set,
    resume_skills: set,
    exp_hits: int,
    quantified_count: int,
    edu_hits: int,
) -> dict:
    """
    Build plain-English one-line explanations for each sub-score.
    These are shown as 'why' hints under each score bar in the UI.
    """
    explanations = {}

    # Keyword Match (JD mode only)
    if mode == "ats_vs_jd":
        matched_sample = ", ".join(list(matched_keywords)[:3])
        missing_sample = ", ".join(list(missing_keywords)[:3])
        if matched_keywords:
            msg = f"Matched {len(matched_keywords)} of {len(matched_keywords) + len(missing_keywords)} JD keywords"
            if matched_sample:
                msg += f" (e.g. {matched_sample})"
            if missing_keywords:
                msg += f". Missing: {missing_sample}{'…' if len(missing_keywords) > 3 else ''}"
        else:
            msg = "No JD keywords found in your resume. Add relevant terms from the job description."
        explanations["keyword_match"] = msg

    # Skills
    if mode == "ats_vs_jd" and jd_skills:
        matched_skills = jd_skills & resume_skills
        missing_skills = jd_skills - resume_skills
        ms = ", ".join(list(matched_skills)[:3])
        mis = ", ".join(list(missing_skills)[:3])
        msg = f"Matched {len(matched_skills)} of {len(jd_skills)} skills from the JD"
        if ms:
            msg += f" (e.g. {ms})"
        if missing_skills:
            msg += f". Missing: {mis}{'…' if len(missing_skills) > 3 else ''}"
    else:
        rs = ", ".join(list(resume_skills)[:3])
        if resume_skills:
            msg = f"Found {len(resume_skills)} recognisable skills in your resume (e.g. {rs})"
            if skills_score < 60:
                msg += ". Add more technical/soft skills to improve coverage."
        else:
            msg = "No recognisable tech or soft skills detected. Add a dedicated Skills section."
    explanations["skills"] = msg

    # Experience
    exp_total = len([k for k in ["years", "experience", "worked", "developed", "managed", "led", "built"] if True])
    msg = f"Found {exp_hits} experience indicators"
    if quantified_count > 0:
        msg += f" with {quantified_count} quantified achievement{'s' if quantified_count != 1 else ''}"
    else:
        msg += ". Add numbers/metrics to achievements to boost this score"
    explanations["experience"] = msg

    # Education
    if edu_hits >= 3:
        msg = "Strong education section detected (degree, institution, and qualifiers found)"
    elif edu_hits >= 1:
        msg = f"Partial education info found ({edu_hits} keyword{'s' if edu_hits != 1 else ''}). Add degree, university name, and year"
    else:
        msg = "No education keywords found. Add your degree, university, and graduation year"
    explanations["education"] = msg

    return explanations


def score_quantification(resume_text: str) -> dict:
    """
    Measure how many achievements in the resume are backed by numbers/metrics.

    Scans each non-empty line for quantification patterns: percentages,
    dollar amounts, multipliers, time ranges, headcount, and large numbers.
    Lines with at least one hit are counted as "quantified achievements".

    Returns:
        {
          "quantification_score": int (0-100),
          "quantified_lines":     list[str]  (up to 10 matched lines)
        }
    """
    lines = [l.strip() for l in resume_text.split("\n") if len(l.strip()) > 20]

    quantified: list[str] = []
    for line in lines:
        for pattern in _QUANT_PATTERNS:
            if pattern.search(line):
                quantified.append(line)
                break  # only count each line once

    total_lines = max(1, len(lines))
    quant_ratio = len(quantified) / total_lines

    # Scoring rubric:
    #   ≥ 40% of lines quantified → 100
    #   Every 5% of lines quantified = 12.5 points
    #   Bonus capped at 100
    quantification_score = min(100, round(quant_ratio * 250))

    # If the resume is short and has at least some quantification, be generous
    if len(quantified) >= 3 and quantification_score < 40:
        quantification_score = 40

    return {
        "quantification_score": quantification_score,
        "quantified_lines": quantified[:10],   # cap at 10 examples for the UI
    }


def generate_rewrite_suggestions(resume_text: str) -> list[dict]:
    """
    For each bullet / sentence that starts with a weak verb or uses passive voice,
    generate a stronger rewrite using template substitution.

    Strategy:
      - Detect lines that start with a weak verb or contain a weak opener phrase.
      - Replace the weak start with a randomly sampled strong verb from the same
        semantic cluster (leadership, building, improving, etc.).
      - Return up to 5 [{original, rewritten}] pairs.

    Returns:
        list of {"original": str, "rewritten": str}
    """
    import random

    # Semantic clusters for replacement — pick a verb that fits the context
    _REPLACEMENT_CLUSTERS = {
        # Ownership / management
        "responsible for": ["Led", "Managed", "Oversaw", "Directed", "Owned"],
        "worked on":       ["Built", "Developed", "Engineered", "Implemented", "Created"],
        "helped with":     ["Supported", "Accelerated", "Contributed to", "Improved", "Strengthened"],
        "helped to":       ["Collaborated to", "Partnered to", "Worked to", "Contributed to"],
        "assisted with":   ["Supported", "Enabled", "Facilitated", "Strengthened"],
        "assisted in":     ["Contributed to", "Participated in developing", "Supported"],
        "part of the":     ["Contributed to the", "Collaborated on the", "Helped build the"],
        "part of a":       ["Contributed to a", "Collaborated on a"],
        "involved in":     ["Led", "Contributed to", "Collaborated on"],
        "supported the":   ["Enabled the", "Strengthened the", "Improved the"],
        "supported a":     ["Enabled a", "Improved a", "Delivered a"],
    }

    _PASSIVE_REWRITE_MAP = {
        "was developed":   "Developed",
        "was built":       "Built",
        "was designed":    "Designed",
        "was implemented": "Implemented",
        "was managed":     "Managed",
        "was created":     "Created",
        "was led":         "Led",
        "were built":      "Built",
        "were developed":  "Developed",
        "were managed":    "Managed",
    }

    rewrites: list[dict] = []
    seen_originals: set[str] = set()

    lines = [l.strip() for l in resume_text.split("\n") if len(l.strip()) > 15]

    for line in lines:
        if len(rewrites) >= 5:
            break
        line_lower = line.lower()

        # Skip if already added a very similar original
        if line_lower in seen_originals:
            continue

        # Check for weak opener phrases
        matched_phrase = None
        for phrase in _REPLACEMENT_CLUSTERS:
            if line_lower.startswith(phrase) or f" {phrase}" in line_lower[:40]:
                matched_phrase = phrase
                break

        if matched_phrase:
            replacement_verb = random.choice(_REPLACEMENT_CLUSTERS[matched_phrase])
            # Replace the first occurrence of the phrase (case-insensitive)
            pattern = re.compile(re.escape(matched_phrase), re.IGNORECASE)
            rewritten = pattern.sub(replacement_verb, line, count=1)
            # Capitalise the first letter
            rewritten = rewritten[0].upper() + rewritten[1:]
            rewrites.append({"original": line, "rewritten": rewritten})
            seen_originals.add(line_lower)
            continue

        # Check for passive voice patterns
        for passive, active_verb in _PASSIVE_REWRITE_MAP.items():
            if passive in line_lower:
                rewritten = re.sub(
                    re.compile(passive, re.IGNORECASE),
                    active_verb,
                    line,
                    count=1,
                )
                rewritten = rewritten[0].upper() + rewritten[1:]
                rewrites.append({"original": line, "rewritten": rewritten})
                seen_originals.add(line_lower)
                break

    return rewrites


def analyze_action_verbs(resume_text: str) -> dict:
    """
    Scan resume bullet points and sentences for strong vs weak action verbs.

    Extracts the first word of every bullet / sentence line, classifies it
    as strong, weak, or neutral, and returns counts plus examples.

    Returns:
        {
          "action_verb_score":  int (0-100),
          "strong_verbs_found": list[str],   # unique strong verbs used
          "weak_verbs_found":   list[str],   # unique weak verbs used
        }
    """
    # Collect the opener word of every meaningful line
    openers = [
        m.group(1).lower()
        for m in _BULLET_LINE_RE.finditer(resume_text)
        if len(m.group(1)) > 2          # skip very short words like "I", "a"
    ]

    strong_found = sorted({w for w in openers if w in _STRONG_VERBS})
    weak_found   = sorted({w for w in openers if w in _WEAK_VERBS})

    total_verb_lines = len(strong_found) + len(weak_found)

    if total_verb_lines == 0:
        # Can't evaluate — no recognisable verb openers found
        action_verb_score = 50
    else:
        # Score = proportion of strong verbs among all classified verbs
        # Plus a bonus for variety (each unique strong verb adds value)
        strong_ratio = len(strong_found) / total_verb_lines
        variety_bonus = min(20, len(strong_found) * 2)
        action_verb_score = min(100, round(strong_ratio * 80 + variety_bonus))

    return {
        "action_verb_score": action_verb_score,
        "strong_verbs_found": strong_found,
        "weak_verbs_found": weak_found,
    }


def check_grammar(resume_text: str) -> dict:
    """
    Lightweight offline grammar and spelling checker for resumes.

    Uses pyspellchecker for spelling with aggressive filtering to avoid
    false positives on tech terms, acronyms, and proper nouns.
    Also applies regex rules for passive voice and wordy phrases.

    Returns:
        {
          "grammar_score":  int (0-100),
          "grammar_issues": list[str]
        }
    """
    issues: list[str] = []
    deductions = 0

    # ------------------------------------------------------------------
    # 1. Spell check — use spaCy NER + POS to pre-filter false positives
    # ------------------------------------------------------------------
    # Run spaCy on a 20 000-char slice (enough for a resume, fast enough)
    doc = nlp(resume_text[:20_000])

    # Build a skip set from spaCy's analysis:
    #   - All tokens that are proper nouns (PROPN) — names, brand names, etc.
    #   - All tokens inside a named entity — covers ORGs, LOCations, PERSONs, etc.
    spacy_skip: set[str] = set()
    for token in doc:
        if token.pos_ == "PROPN":
            spacy_skip.add(token.text.lower())
            spacy_skip.add(token.lemma_.lower())
    for ent in doc.ents:
        for token in ent:
            spacy_skip.add(token.text.lower())
            spacy_skip.add(token.lemma_.lower())

    # Also skip tokens that appear as noun chunks (multi-word tech names)
    for chunk in doc.noun_chunks:
        for token in chunk:
            if token.pos_ == "PROPN":
                spacy_skip.add(token.text.lower())

    # Extract plain alphabetic words, then apply all filters
    words_raw = re.findall(r"\b[a-zA-Z]{4,}\b", resume_text)
    candidates = []
    for w in words_raw:
        if w.isupper():                          # acronym: API, HTML
            continue
        if any(c.isupper() for c in w[1:]):      # camelCase: JavaScript, PyTorch
            continue
        wl = w.lower()
        if wl in _SPELL_WHITELIST:               # manual tech/British whitelist
            continue
        if wl in spacy_skip:                     # spaCy-identified proper noun / entity
            continue
        # Skip words that are likely usernames, domain names, or run-together nouns
        # (e.g. "alexjohnson" — no uppercase, but concatenated name)
        if len(wl) >= 12 and not re.search(r"[aeiou]{2,}", wl):
            continue
        candidates.append(wl)

    misspelled = _spell.unknown(candidates)
    # Deduplicate and cap at 5 to avoid overwhelming the user
    top_misspelled = sorted(misspelled)[:5]
    if top_misspelled:
        words_display = ", ".join(f'"{w}"' for w in top_misspelled)
        issues.append(
            f"Possible spelling mistakes detected: {words_display}. "
            "Double-check these words before submitting."
        )
        # 5 points per mistake, capped at 20
        deductions += min(20, len(misspelled) * 5)

    # ------------------------------------------------------------------
    # 2. Passive voice — flag sentences using "was/were/is/are + past participle"
    # ------------------------------------------------------------------
    passive_hits = _PASSIVE_AUX.findall(resume_text)
    if len(passive_hits) >= 3:
        issues.append(
            f"Passive voice detected {len(passive_hits)} time(s) "
            "(e.g., 'was developed', 'were managed'). "
            "Rewrite using active verbs: 'developed', 'managed'."
        )
        deductions += min(15, len(passive_hits) * 3)

    # ------------------------------------------------------------------
    # 3. Weak openers — "Responsible for", "Helped with", etc.
    # ------------------------------------------------------------------
    weak_matches = _WEAK_OPENER_RE.findall(resume_text)
    if weak_matches:
        unique_weak = list({m.lower() for m in weak_matches})[:3]
        issues.append(
            f"Weak phrasing found: {', '.join(unique_weak)}. "
            "Start bullet points with strong action verbs instead "
            "(Led, Built, Improved, Delivered, Reduced)."
        )
        deductions += min(15, len(weak_matches) * 5)

    # ------------------------------------------------------------------
    # 4. Wordy / filler phrases
    # ------------------------------------------------------------------
    wordy_found = []
    resume_lower = resume_text.lower()
    for phrase, replacement in _WORDY_PHRASES:
        if phrase in resume_lower:
            wordy_found.append(f'"{phrase}" → "{replacement}"')
    if wordy_found:
        issues.append(
            "Wordy phrases detected — consider shortening: "
            + "; ".join(wordy_found[:3]) + "."
        )
        deductions += min(10, len(wordy_found) * 3)

    grammar_score = max(0, 100 - deductions)

    return {
        "grammar_score": grammar_score,
        "grammar_issues": issues,
    }


def compute_readability(text: str) -> int:
    """
    Compute a Flesch Reading Ease score (0-100) for the given text.

    Higher scores = easier to read (plain language).
    Scores 60-70 = standard/plain English.
    Resumes should target 60+; below 40 = overly complex.

    Formula:
        206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)

    Returns the score clamped to [0, 100].
    """
    sentences = re.split(r"[.!?]+", text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 3]
    sentence_count = max(1, len(sentences))

    words = re.findall(r"\b[a-zA-Z]+\b", text)
    word_count = max(1, len(words))

    # Count syllables via a simple vowel-cluster heuristic
    def count_syllables(word: str) -> int:
        word = word.lower()
        vowels = re.findall(r"[aeiouy]+", word)
        count = len(vowels)
        if word.endswith("e") and count > 1:
            count -= 1
        return max(1, count)

    syllable_count = sum(count_syllables(w) for w in words)

    score = 206.835 - 1.015 * (word_count / sentence_count) - 84.6 * (syllable_count / word_count)
    return max(0, min(100, round(score)))


def detect_buzzwords(text: str) -> list[str]:
    """
    Scan resume text for overused buzzwords and clichés.

    Checks against a hardcoded list of vague, overused, or meaningless
    resume phrases that hiring managers and ATS systems flag negatively.

    Returns:
        Sorted list of buzzwords/phrases found in the text (lowercased).
    """
    text_lower = text.lower()
    found: list[str] = []
    for buzz in BUZZWORDS:
        if buzz in text_lower:
            found.append(buzz)
    return sorted(found)


# ---------------------------------------------------------------------------
# Years-of-experience, seniority, and date-range analysis
# ---------------------------------------------------------------------------

def extract_required_years(jd_text: str) -> int | None:
    """
    Parse the maximum years-of-experience requirement from a job description.

    Handles "5+ years", "at least 3 years", "2-5 years of experience", etc.
    Returns the floor of a range (e.g. "2-5 years" → 2) since that's what
    candidates need to clear.

    Returns:
        int (years) or None if no requirement is detectable.
    """
    # Ranges take precedence — "2-5 years" means the floor (2) is the
    # requirement a candidate needs to clear.
    range_pattern = _JD_YEARS_PATTERNS[0]
    range_floors: list[int] = []
    for m in range_pattern.finditer(jd_text):
        try:
            n = int(m.group(1))
        except (ValueError, IndexError):
            continue
        if 0 < n <= 30:
            range_floors.append(n)
    if range_floors:
        return min(range_floors)

    # Otherwise: strongest single-number requirement wins ("5+", "at least 3"…).
    candidates: list[int] = []
    for pattern in _JD_YEARS_PATTERNS[1:]:
        for m in pattern.finditer(jd_text):
            try:
                n = int(m.group(1))
            except (ValueError, IndexError):
                continue
            if 0 < n <= 30:
                candidates.append(n)
    if not candidates:
        return None
    return max(candidates)


# Section headings that mark the start of the experience block.
_EXPERIENCE_HEADING_RE = re.compile(
    r"^\s*(work\s+experience|professional\s+experience|employment(?:\s+history)?|"
    r"experience|career\s+history|work\s+history)\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)

# Headings that mark the *end* of the experience block (start of another section).
_NON_EXPERIENCE_HEADING_RE = re.compile(
    r"^\s*(education(?:al)?(?:\s+qualifications?)?|academic|achievements?|awards?|"
    r"certifications?|skills?|technical\s+skills?|projects?|hobbies|interests|"
    r"extracurricular(?:\s+activities)?|references?|publications?|languages?|"
    r"summary|objective|profile)\s*:?\s*$",
    re.IGNORECASE | re.MULTILINE,
)

# Education / non-employment keywords. If a date range falls on a line that
# contains any of these, it's almost certainly a degree or course date rather
# than an employment range.
_EDUCATION_LINE_KEYWORDS = (
    "bachelor", "master", "b.tech", "btech", "b.e", "m.tech", "mtech",
    "b.sc", "m.sc", "bsc", "msc", "mba", "phd", "ph.d",
    "school", "college", "university", "board", "degree",
    "matric", "intermediate", "secondary", "graduation", "graduated",
    "diploma", "academics", "course", "coursework",
    "training", "internship",    # distinct from full-time employment
    "certification", "certificate", "certified",
    "gate", "cat", "gre", "gmat",
)


def _extract_experience_section(resume_text: str) -> str:
    """
    Return the text of the resume's experience section, or the full resume
    if no experience heading is found.

    Strategy: find the first "Work Experience" / "Experience" heading, then
    slice until the next section heading (Education, Skills, Achievements…).
    """
    start_match = _EXPERIENCE_HEADING_RE.search(resume_text)
    if not start_match:
        return resume_text

    body_start = start_match.end()

    # Find the nearest subsequent non-experience heading to bound the section.
    end_match = _NON_EXPERIENCE_HEADING_RE.search(resume_text, pos=body_start)
    if end_match:
        return resume_text[body_start:end_match.start()]
    return resume_text[body_start:]


def _line_is_education(text: str, char_index: int) -> bool:
    """Return True if the line containing char_index looks like an education entry."""
    line_start = text.rfind("\n", 0, char_index) + 1
    line_end = text.find("\n", char_index)
    if line_end == -1:
        line_end = len(text)
    line = text[line_start:line_end].lower()
    return any(kw in line for kw in _EDUCATION_LINE_KEYWORDS)


def extract_resume_years(resume_text: str) -> dict:
    """
    Estimate the candidate's total years of experience from the resume.

    Strategy:
      1. Pull explicit "X years of experience" claims.
      2. Scope date-range parsing to the Experience section only (falls back
         to the full resume when no heading is detected), skipping any match
         on a line that mentions education keywords. This prevents degree
         years (e.g. "B.Tech 2008-2012") from being counted as employment.
      3. Merge overlapping ranges, compute total span, and detect gaps
         greater than 6 months.
      4. Return the maximum of the two estimates (claims vs. parsed dates),
         since candidates often understate or omit one.

    Returns:
        {
          "total_years":       float  (estimate, 0 if nothing parseable),
          "claimed_years":     int | None,   # self-reported
          "parsed_years":      float,        # from date ranges
          "positions_found":   int,          # number of date ranges detected
          "employment_gaps":   list[dict],   # [{gap_months, after, before}]
        }
    """
    # --- 1. Explicit self-reported years ---
    claimed_candidates: list[int] = []
    for pattern in _RESUME_YEARS_PATTERNS:
        for m in pattern.finditer(resume_text):
            try:
                n = int(m.group(1))
            except (ValueError, IndexError):
                continue
            if 0 < n <= 50:
                claimed_candidates.append(n)
    claimed_years = max(claimed_candidates) if claimed_candidates else None

    # --- 2. Date-range extraction ---
    # Scope the scan to the Experience section when it's identifiable, so
    # degree years ("B.Tech 2008-2012") and course dates don't pollute the
    # employment total. Falls back to the full resume if no heading is found.
    experience_text = _extract_experience_section(resume_text)

    # Mask already-matched spans with spaces between patterns so the
    # more-specific "March 2020 - Present" isn't re-matched as "2020 - Present"
    # by the year-only fallback.
    today = date.today()
    ranges: list[tuple[date, date]] = []
    remaining = experience_text

    def _mask(text: str, spans: list[tuple[int, int]]) -> str:
        arr = list(text)
        for s, e in spans:
            for i in range(s, e):
                arr[i] = " "
        return "".join(arr)

    def _month_of(name: str) -> int:
        return _MONTH_MAP.get(name.lower().rstrip("."), 1)

    # Wordy: "Jan 2020 - Present"
    wordy_spans: list[tuple[int, int]] = []
    for m in _DATE_RANGE_WORDY.finditer(remaining):
        # Skip education / training lines even inside the Experience block.
        if _line_is_education(remaining, m.start()):
            continue
        start_month = _month_of(m.group(1))
        start_year = int(m.group(2))
        end_month_name = m.group(3)
        end_year_str = m.group(4)
        if end_month_name and end_year_str:
            end = date(int(end_year_str), _month_of(end_month_name), 1)
        else:
            end = today
        try:
            start = date(start_year, start_month, 1)
        except ValueError:
            continue
        if start <= end and start.year >= 1960:
            ranges.append((start, end))
            wordy_spans.append(m.span())
    remaining = _mask(remaining, wordy_spans)

    # Numeric: "03/2019 - 08/2022"
    numeric_spans: list[tuple[int, int]] = []
    for m in _DATE_RANGE_NUMERIC.finditer(remaining):
        if _line_is_education(remaining, m.start()):
            continue
        try:
            sm = int(m.group(1)); sy = int(m.group(2))
            if not (1 <= sm <= 12):
                continue
            start = date(sy, sm, 1)
            if m.group(3) and m.group(4):
                em = int(m.group(3)); ey = int(m.group(4))
                if not (1 <= em <= 12):
                    continue
                end = date(ey, em, 1)
            else:
                end = today
        except ValueError:
            continue
        if start <= end and start.year >= 1960:
            ranges.append((start, end))
            numeric_spans.append(m.span())
    remaining = _mask(remaining, numeric_spans)

    # Year-only: "2019 - 2022" — the most ambiguous pattern, so also
    # skip any match whose line looks like an education entry.
    for m in _DATE_RANGE_YEAR_ONLY.finditer(remaining):
        if _line_is_education(remaining, m.start()):
            continue
        try:
            sy = int(m.group(1))
            start = date(sy, 1, 1)
            if m.group(2):
                end = date(int(m.group(2)), 12, 31)
            else:
                end = today
        except ValueError:
            continue
        if start <= end and start.year >= 1960:
            ranges.append((start, end))

    # Deduplicate identical ranges (same start + end) that appear from
    # multiple pattern matches hitting the same dates.
    ranges = sorted(set(ranges))

    # Merge overlapping/adjacent ranges so concurrent jobs don't double-count.
    merged: list[list[date]] = []
    for s, e in ranges:
        if merged and s <= merged[-1][1]:
            if e > merged[-1][1]:
                merged[-1][1] = e
        else:
            merged.append([s, e])

    # Total duration in years
    total_days = sum((e - s).days for s, e in merged)
    parsed_years = round(total_days / 365.25, 1) if total_days > 0 else 0.0

    # Gap detection between consecutive (merged) ranges
    gaps: list[dict] = []
    for i in range(1, len(merged)):
        prev_end = merged[i - 1][1]
        next_start = merged[i][0]
        gap_days = (next_start - prev_end).days
        if gap_days > 183:   # > ~6 months
            gaps.append({
                "gap_months": round(gap_days / 30.0, 1),
                "after":  prev_end.strftime("%b %Y"),
                "before": next_start.strftime("%b %Y"),
            })

    total_years = max(parsed_years, float(claimed_years or 0))

    return {
        "total_years": total_years,
        "claimed_years": claimed_years,
        "parsed_years": parsed_years,
        # Distinct pre-merge positions (what the resume actually lists) —
        # more honest for the UI than the merged count.
        "positions_found": len(ranges),
        "employment_gaps": gaps,
    }


def detect_seniority(text: str) -> str | None:
    """
    Detect the seniority level signalled by a piece of text (resume or JD).

    Scans for vocabulary from SENIORITY_LEVELS and returns the *highest*
    level found, since job postings and resumes often include multiple
    levels (e.g. "Senior / Staff Engineer").

    Returns:
        One of "entry", "junior", "mid", "senior", "lead", "staff",
        "principal", or None if no level can be detected.
    """
    lower = text.lower()
    found: list[str] = []
    for level, vocab in SENIORITY_LEVELS:
        for term in vocab:
            # Word-boundary match to avoid "senior" matching "seniority" etc.
            if re.search(r"(?<![a-z])" + re.escape(term) + r"(?![a-z])", lower):
                found.append(level)
                break
    if not found:
        return None
    # Return the highest-ranked level found
    return max(found, key=lambda lv: _SENIORITY_RANK[lv])


def _seniority_from_years(years: float) -> str:
    """Map total years-of-experience to an implied seniority bucket."""
    if years >= 10: return "principal"
    if years >= 8:  return "staff"
    if years >= 6:  return "lead"
    if years >= 4:  return "senior"
    if years >= 2:  return "mid"
    if years >= 1:  return "junior"
    return "entry"


def analyze_experience_fit(
    resume_text: str,
    jd_text: str | None = None,
) -> dict:
    """
    Composite analysis combining years-of-experience, seniority, and date-range
    parsing. Returns all fields needed by the frontend:

        {
          "required_years":    int | None,     # extracted from JD
          "candidate_years":   float,          # from resume (claims ∪ dates)
          "years_match":       bool,           # candidate >= required
          "experience_gap_years": float,       # max(0, required - candidate)
          "years_fit_score":   int (0-100),    # how well the candidate fits the requirement
          "jd_seniority":      str | None,     # senior / lead / …
          "resume_seniority":  str | None,     # detected from resume title lines
          "implied_seniority": str,            # from candidate_years
          "seniority_mismatch": bool,          # JD demands higher than candidate can offer
          "seniority_warning": str | None,     # human-readable message
          "positions_found":   int,
          "employment_gaps":   list[dict],
        }
    """
    years_info = extract_resume_years(resume_text)
    candidate_years = years_info["total_years"]
    implied = _seniority_from_years(candidate_years)
    resume_seniority = detect_seniority(resume_text)

    required_years = extract_required_years(jd_text) if jd_text else None
    jd_seniority = detect_seniority(jd_text) if jd_text else None

    # --- Years-fit score ---
    if required_years is None:
        years_fit_score = 100 if candidate_years > 0 else 50
        years_match = True
        experience_gap = 0.0
    else:
        if candidate_years >= required_years:
            years_fit_score = 100
            years_match = True
            experience_gap = 0.0
        else:
            # Linear fall-off: every missing year deducts 15 points,
            # floored at 20 (we don't want a hard zero — candidate might
            # still be viable for a recruiter).
            experience_gap = required_years - candidate_years
            years_fit_score = max(20, round(100 - experience_gap * 15))
            years_match = False

    # --- Seniority mismatch ---
    seniority_mismatch = False
    seniority_warning: str | None = None

    if jd_seniority and jd_seniority in _SENIORITY_RANK:
        jd_rank = _SENIORITY_RANK[jd_seniority]
        # Use the stronger of detected-title-seniority or implied-years-seniority
        cand_level = resume_seniority or implied
        cand_rank = _SENIORITY_RANK.get(cand_level, _SENIORITY_RANK[implied])
        # Also boost candidate rank by implied if higher (someone with 10 years
        # who doesn't write "Senior" in a title line still has senior experience)
        cand_rank = max(cand_rank, _SENIORITY_RANK[implied])

        if jd_rank - cand_rank >= 2:
            seniority_mismatch = True
            seniority_warning = (
                f"JD targets a {jd_seniority.title()}-level role, but your resume "
                f"reads as {implied.title()}-level "
                f"({candidate_years:.1f} yrs of experience). Consider applying "
                f"to roles closer to your current level, or highlight leadership "
                f"and scope to close the gap."
            )
        elif jd_rank - cand_rank == 1:
            # Borderline — flag as a soft warning only
            seniority_warning = (
                f"JD leans {jd_seniority.title()} while your profile reads as "
                f"{implied.title()}. Emphasise ownership, mentoring, and scope "
                f"to bridge the gap."
            )

    return {
        "required_years": required_years,
        "candidate_years": candidate_years,
        "years_match": years_match,
        "experience_gap_years": round(experience_gap, 1),
        "years_fit_score": years_fit_score,
        "jd_seniority": jd_seniority,
        "resume_seniority": resume_seniority,
        "implied_seniority": implied,
        "seniority_mismatch": seniority_mismatch,
        "seniority_warning": seniority_warning,
        "positions_found": years_info["positions_found"],
        "employment_gaps": years_info["employment_gaps"],
    }


def extract_keywords(text: str) -> list[str]:
    """
    Extract meaningful keywords from text using spaCy NLP.

    Strategy:
      - Parse the text with the spaCy pipeline.
      - Collect short noun chunks (≤4 tokens) and non-personal named entities.
      - Add individual noun/proper-noun tokens.
      - Aggressively filter noise: emails, URLs, phone numbers, parenthetical
        artifacts, person names, and chunks that are mostly digits.
      - Deduplicate while preserving order of first occurrence.

    Args:
        text: Plain text to analyse.

    Returns:
        Deduplicated list of clean lowercase keyword strings.
    """
    doc = nlp(text[:100_000])  # Truncate very long texts to avoid memory spikes

    raw_keywords: list[str] = []

    # Noun chunks — cap at 4 tokens to avoid long contact-info blobs
    for chunk in doc.noun_chunks:
        if len(chunk) > 4:
            continue
        kw = chunk.text.lower().strip()
        raw_keywords.append(kw)

    # Named entities — skip personal/numeric categories that produce noise
    _SKIP_ENT_LABELS = {
        "PERSON", "CARDINAL", "ORDINAL", "QUANTITY",
        "PERCENT", "MONEY", "TIME", "DATE",
    }
    for ent in doc.ents:
        if ent.label_ in _SKIP_ENT_LABELS:
            continue
        kw = ent.text.lower().strip()
        raw_keywords.append(kw)

    # Individual tokens that are nouns / proper nouns and not stopwords
    for token in doc:
        if (
            token.pos_ in ("NOUN", "PROPN")
            and not token.is_stop
            and not token.is_punct
            and len(token.text) > 1
        ):
            raw_keywords.append(token.lemma_.lower().strip())

    # Deduplicate and filter noise
    seen: set[str] = set()
    keywords: list[str] = []
    for kw in raw_keywords:
        if not kw or len(kw) < 2:
            continue
        # Pure punctuation / digit-only strings
        if re.fullmatch(r"[\W\d]+", kw):
            continue
        # Email addresses
        if "@" in kw:
            continue
        # URLs and domain fragments
        if any(x in kw for x in ("http", "www.", ".com", ".org", ".net", ".io",
                                   "linkedin", "github", "://", ".in/")):
            continue
        # Phone-number-like: mostly digits
        digit_count = sum(c.isdigit() for c in kw)
        if len(kw) > 0 and digit_count / len(kw) > 0.4:
            continue
        # Parenthetical artifacts like "technology(b.tech"
        if "(" in kw or ")" in kw:
            continue
        if kw not in seen:
            seen.add(kw)
            keywords.append(kw)

    return keywords


# ---------------------------------------------------------------------------
# Section-order detection & recommendations
# ---------------------------------------------------------------------------

def detect_section_order(text: str) -> list[str]:
    """
    Return the resume's sections in the order they physically appear (top → bottom).

    Iterates over each line and checks whether it matches the heading keywords
    from SECTION_KEYWORDS.  The first matching line for each section wins.
    """
    found: dict[str, int] = {}
    lines = text.split("\n")
    for i, line in enumerate(lines):
        line_lower = line.strip().lower()
        if not line_lower:
            continue
        for section, keywords in SECTION_KEYWORDS.items():
            if section not in found:
                for kw in keywords:
                    # Word-boundary-aware match so "experience" doesn't hit "inexperienced"
                    if re.search(r"(?<![a-z])" + re.escape(kw) + r"(?![a-z])", line_lower):
                        found[section] = i
                        break
    return [s for s, _ in sorted(found.items(), key=lambda x: x[1])]


def get_section_order_suggestions(
    section_order: list[str],
    candidate_years: float = 0.0,
) -> list[str]:
    """
    Return actionable tips for reordering resume sections.

    Optimal order:
    - Experienced (≥2 yrs): Summary → Experience → Skills → Education → Projects → Certifications
    - Entry-level  (<2 yrs): Summary → Education  → Skills → Projects  → Experience → Certifications
    """
    tips: list[str] = []
    if len(section_order) < 2:
        return tips

    def idx(s: str):
        return section_order.index(s) if s in section_order else None

    # Rule 1 — Summary should be first (or very near the top)
    summary_pos = idx("Summary")
    if summary_pos is not None and summary_pos > 1:
        tips.append(
            "Your Summary/Objective section appears lower on the page. "
            "Move it to the very top — recruiters spend ~6 seconds on a first pass."
        )

    exp_pos    = idx("Experience")
    edu_pos    = idx("Education")
    skills_pos = idx("Skills")
    proj_pos   = idx("Projects")
    cert_pos   = idx("Certifications")

    if candidate_years >= 2:
        # Experienced: Work Experience should precede Education
        if exp_pos is not None and edu_pos is not None and edu_pos < exp_pos:
            tips.append(
                f"Your Education section appears before Experience. For candidates with "
                f"{candidate_years:.0f}+ years of work history, move Experience higher — "
                "your career track matters more than your degree to most hiring managers."
            )
        # Skills should sit near the top (right after Summary)
        if skills_pos is not None and exp_pos is not None and skills_pos > exp_pos + 1:
            tips.append(
                "Your Skills section is buried after the Experience block. "
                "Moving it higher (right after Summary) lets ATS systems identify your "
                "technical stack at maximum keyword-density position."
            )
    else:
        # Entry-level: Education first is fine, but Skills should precede Projects
        if skills_pos is not None and edu_pos is not None and skills_pos > edu_pos + 2:
            tips.append(
                "For entry-level candidates, placing your Skills section right after Education "
                "increases keyword density early in the document where ATS scores it highest."
            )
        # Projects before Experience is a plus for juniors
        if proj_pos is not None and exp_pos is not None and exp_pos < proj_pos:
            tips.append(
                "Consider placing your Projects section before Work Experience — "
                "hands-on projects demonstrate practical skills more compellingly "
                "than limited work history at this career stage."
            )

    # Certifications before Projects looks odd in most cases
    if proj_pos is not None and cert_pos is not None and cert_pos < proj_pos:
        tips.append(
            "Projects usually carry more weight with hiring managers than Certifications — "
            "consider swapping their order."
        )

    return tips


# ---------------------------------------------------------------------------
# Bullet-point density check
# ---------------------------------------------------------------------------

def check_bullet_density(resume_text: str) -> list[str]:
    """
    Flag areas of the resume that use dense prose instead of bullet points.

    A "prose block" is 3+ consecutive non-empty lines where every line is
    longer than 50 characters and none starts with a bullet symbol or is a
    recognised section heading.  Prose blocks are harder for ATS to parse
    and slower for recruiters to scan.

    Returns up to 3 issue strings with contextual section labels.
    """
    issues: list[str] = []
    _BULLET_START = re.compile(r"^\s*[-•*–—]\s+|^\s*\d+[.)]\s+")
    # Flat set of heading keywords for fast membership tests
    _ALL_HEADING_KWS: set[str] = {kw for kws in SECTION_KEYWORDS.values() for kw in kws}

    lines = resume_text.split("\n")
    consecutive = 0
    section_label = "your resume"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            consecutive = 0
            continue

        # Detect section headings to improve the issue message context
        if stripped.lower() in _ALL_HEADING_KWS or any(
            re.search(r"(?<![a-z])" + re.escape(kw) + r"(?![a-z])", stripped.lower())
            for kw in _ALL_HEADING_KWS
        ):
            consecutive = 0
            section_label = stripped.title()
            continue

        # Bullet lines or short lines reset the counter
        if _BULLET_START.match(line) or len(stripped) <= 50:
            consecutive = 0
            continue

        # Substantive prose line
        consecutive += 1
        if consecutive == 3:
            issues.append(
                f"Dense paragraph detected near the '{section_label}' section — "
                "break this into 2–4 bullet points so ATS parsers and recruiters "
                "can scan it in seconds."
            )
            consecutive = 0  # reset; don't keep flagging the same block

        if len(issues) >= 3:
            break

    return issues


def score_resume(resume_text: str, jd_text: str, ats_preset: str = None, cover_letter_text: str = None) -> dict:
    """
    Core scoring function — compares a resume against a job description.

    Computes:
      - keyword_match_score  (40% weight)
      - skills_score         (25% weight)
      - experience_score     (20% weight)
      - education_score      (15% weight)
      - overall_score        (weighted average)

    Also returns matched/missing/extra keywords, sections analysis,
    word counts, and actionable suggestions.

    Args:
        resume_text: Plain text of the resume.
        jd_text:     Plain text of the job description.

    Returns:
        A dict containing all scoring fields (see module docstring for schema).
    """
    resume_lower = resume_text.lower()
    jd_lower = jd_text.lower()

    # ------------------------------------------------------------------
    # 1. Keyword extraction (+ canonicalization via synonym map so that
    #    "js" / "javascript", "k8s" / "kubernetes", etc. collapse together
    #    before set comparison).
    # ------------------------------------------------------------------
    resume_keywords_list = extract_keywords(resume_text)
    jd_keywords_list = extract_keywords(jd_text)

    # Canonical sets — used for accurate intersection.
    resume_canon = {_canonical_skill(k) for k in resume_keywords_list}
    jd_canon = {_canonical_skill(k) for k in jd_keywords_list}

    # Also augment with skills found by direct scanning (catches skills that
    # don't appear as noun chunks, e.g. "C++", "CI/CD", ".NET").
    resume_canon |= _find_skills_in_text(resume_text)
    jd_canon |= _find_skills_in_text(jd_text)

    matched_keywords = sorted(resume_canon & jd_canon)
    missing_keywords = sorted(jd_canon - resume_canon)
    extra_keywords = sorted(resume_canon - jd_canon)

    # ------------------------------------------------------------------
    # 2. keyword_match_score
    # ------------------------------------------------------------------
    if jd_canon:
        keyword_match_score = min(
            100, round((len(matched_keywords) / len(jd_canon)) * 100)
        )
    else:
        keyword_match_score = 0

    # ------------------------------------------------------------------
    # 3. skills_score — synonym-aware skill match between JD and resume.
    # ------------------------------------------------------------------
    jd_skills = _find_skills_in_text(jd_text)
    resume_skills = _find_skills_in_text(resume_text)
    if jd_skills:
        resume_skills_matched = jd_skills & resume_skills
        skills_score = min(100, round((len(resume_skills_matched) / len(jd_skills)) * 100))
    else:
        # If JD doesn't mention specific skills, check resume breadth.
        skills_score = min(100, round((len(resume_skills) / 10) * 100))

    # ------------------------------------------------------------------
    # 4. experience_score
    # ------------------------------------------------------------------
    exp_hits = sum(1 for kw in EXPERIENCE_KEYWORDS if kw in resume_lower)
    # Bonus for quantified achievements — numbers adjacent to action verbs
    quantified = len(re.findall(r"\b\d+[\+\-]?\s*(?:years?|months?|%|x|\w+)\b", resume_lower))
    exp_base = min(70, round((exp_hits / len(EXPERIENCE_KEYWORDS)) * 70))
    exp_bonus = min(30, quantified * 5)
    experience_score = min(100, exp_base + exp_bonus)

    # ------------------------------------------------------------------
    # 5. education_score
    # ------------------------------------------------------------------
    edu_hits = sum(1 for kw in EDUCATION_KEYWORDS if kw in resume_lower)
    if edu_hits >= 3:
        education_score = 100
    elif edu_hits >= 1:
        education_score = 50
    else:
        education_score = 0

    # ------------------------------------------------------------------
    # 6. overall_score (weighted average)
    # ------------------------------------------------------------------
    # Apply ATS preset keyword / skills boost before weighting
    preset = ATS_PRESETS.get(ats_preset or "", None)
    eff_keyword = min(100, round(keyword_match_score * (preset["keyword_boost"] if preset else 1.0)))
    eff_skills  = min(100, round(skills_score * (preset["skills_boost"] if preset else 1.0)))

    overall_score = round(
        eff_keyword       * SCORE_WEIGHTS["keyword"]
        + eff_skills      * SCORE_WEIGHTS["skills"]
        + experience_score * SCORE_WEIGHTS["experience"]
        + education_score  * SCORE_WEIGHTS["education"]
    )

    # ------------------------------------------------------------------
    # 7. Sections found / missing
    # ------------------------------------------------------------------
    sections_found: list[str] = []
    sections_missing: list[str] = []

    for section, keywords in SECTION_KEYWORDS.items():
        if any(kw in resume_lower for kw in keywords):
            sections_found.append(section)
        else:
            sections_missing.append(section)

    # ------------------------------------------------------------------
    # 8. Suggestions
    # ------------------------------------------------------------------
    suggestions: list[str] = []

    if keyword_match_score < 50:
        suggestions.append(
            "Add more keywords from the job description to improve ATS matching."
        )

    if missing_keywords:
        top5 = ", ".join(missing_keywords[:5])
        suggestions.append(f"Consider adding these missing keywords: {top5}.")

    if "Summary" in sections_missing:
        suggestions.append(
            "Add a professional summary section at the top of your resume."
        )

    if experience_score < 50:
        suggestions.append(
            "Quantify your achievements with numbers and metrics (e.g., 'improved performance by 30%')."
        )

    if education_score == 0:
        suggestions.append(
            "Add your educational qualifications (degree, university, graduation year)."
        )

    if skills_score < 60:
        suggestions.append(
            "Highlight more technical and soft skills relevant to the job description."
        )

    if "Skills" in sections_missing:
        suggestions.append(
            "Add a dedicated Skills section listing your core competencies."
        )

    if "Projects" in sections_missing:
        suggestions.append(
            "Showcase relevant personal or professional projects to demonstrate hands-on experience."
        )

    # Guarantee at least 3 suggestions
    if len(suggestions) < 3:
        fallbacks = [
            "Tailor your resume specifically for each job application.",
            "Use action verbs (Led, Built, Delivered, Optimised) to start bullet points.",
            "Keep your resume to 1-2 pages for maximum readability.",
            "Include links to your GitHub, LinkedIn, or portfolio.",
        ]
        for fb in fallbacks:
            if len(suggestions) >= 3:
                break
            if fb not in suggestions:
                suggestions.append(fb)

    # ------------------------------------------------------------------
    # 9. ATS formatting check
    # ------------------------------------------------------------------
    fmt = check_ats_formatting(resume_text)

    # ------------------------------------------------------------------
    # 10. Grammar & spell check
    # ------------------------------------------------------------------
    gram = check_grammar(resume_text)

    # ------------------------------------------------------------------
    # 11. Action verb analysis
    # ------------------------------------------------------------------
    verbs = analyze_action_verbs(resume_text)

    # ------------------------------------------------------------------
    # 12. Quantification score
    # ------------------------------------------------------------------
    quant = score_quantification(resume_text)

    # ------------------------------------------------------------------
    # 13. Job title relevance (JD mode only)
    # ------------------------------------------------------------------
    title = detect_job_title_relevance(resume_text, jd_text)

    # ------------------------------------------------------------------
    # 14. Rewrite suggestions for weak bullet points
    # ------------------------------------------------------------------
    rewrites = generate_rewrite_suggestions(resume_text)

    # ------------------------------------------------------------------
    # 15. Readability score (Flesch Reading Ease)
    # ------------------------------------------------------------------
    readability_score = compute_readability(resume_text)

    # ------------------------------------------------------------------
    # 16. Buzzword detection
    # ------------------------------------------------------------------
    buzzwords_found = detect_buzzwords(resume_text)

    # ------------------------------------------------------------------
    # 17. Cover letter analysis (optional)
    # ------------------------------------------------------------------
    cover_letter_score = None
    cover_letter_matched = []
    cover_letter_missing = []
    if cover_letter_text:
        cl_keywords_raw = set(extract_keywords(cover_letter_text))
        cl_keywords = {_canonical_skill(k) for k in cl_keywords_raw} | _find_skills_in_text(cover_letter_text)
        cl_matched = sorted(cl_keywords & jd_canon)
        cl_missing = sorted(jd_canon - cl_keywords)
        cl_score = min(100, round(len(cl_matched) / max(1, len(jd_canon)) * 100))
        cover_letter_score = cl_score
        cover_letter_matched = cl_matched
        cover_letter_missing = cl_missing

    # ------------------------------------------------------------------
    # 18. Experience fit — years-of-experience, seniority, date ranges
    # ------------------------------------------------------------------
    exp_fit = analyze_experience_fit(resume_text, jd_text)

    # Surface experience-fit findings as suggestions the user can act on.
    if exp_fit["required_years"] is not None and not exp_fit["years_match"]:
        suggestions.insert(0, (
            f"JD requires {exp_fit['required_years']}+ years of experience; "
            f"your resume shows {exp_fit['candidate_years']:.1f}. "
            f"Emphasise scope, ownership, and impact on earlier roles to close the gap."
        ))
    if exp_fit["seniority_warning"]:
        suggestions.insert(0, exp_fit["seniority_warning"])
    if exp_fit["employment_gaps"]:
        gap = exp_fit["employment_gaps"][0]
        suggestions.append(
            f"Employment gap of ~{gap['gap_months']} months detected "
            f"({gap['after']} → {gap['before']}). If relevant, briefly explain it "
            f"(education, caregiving, project work) to pre-empt recruiter questions."
        )

    # ------------------------------------------------------------------
    # 19. Word counts
    # ------------------------------------------------------------------
    resume_word_count = len(resume_text.split())
    jd_word_count = len(jd_text.split())

    # ------------------------------------------------------------------
    # 20. Section order analysis
    # ------------------------------------------------------------------
    section_order = detect_section_order(resume_text)
    section_order_suggestions = get_section_order_suggestions(
        section_order, exp_fit["candidate_years"]
    )

    # ------------------------------------------------------------------
    # 21. Bullet-point density check
    # ------------------------------------------------------------------
    bullet_density_issues = check_bullet_density(resume_text)

    # ------------------------------------------------------------------
    # Score explanations + company detection
    # ------------------------------------------------------------------
    score_explanations = build_score_explanations(
        mode="ats_vs_jd",
        keyword_match_score=keyword_match_score,
        skills_score=skills_score,
        experience_score=experience_score,
        education_score=education_score,
        matched_keywords=matched_keywords,
        missing_keywords=missing_keywords,
        jd_skills=jd_skills,
        resume_skills=resume_skills,
        exp_hits=exp_hits,
        quantified_count=len(quant["quantified_lines"]),
        edu_hits=edu_hits,
    )
    detected_company = _detect_company_name(jd_text)

    # ------------------------------------------------------------------
    # Return the complete result dict
    # ------------------------------------------------------------------
    return {
        "mode": "ats_vs_jd",
        "ats_preset": ats_preset or None,
        "overall_score": overall_score,
        "keyword_match_score": keyword_match_score,
        "skills_score": skills_score,
        "experience_score": experience_score,
        "education_score": education_score,
        "sections_score": None,
        "score_explanations": score_explanations,
        "detected_company": detected_company,
        "formatting_score": fmt["formatting_score"],
        "formatting_issues": fmt["formatting_issues"],
        "grammar_score": gram["grammar_score"],
        "grammar_issues": gram["grammar_issues"],
        "action_verb_score": verbs["action_verb_score"],
        "strong_verbs_found": verbs["strong_verbs_found"],
        "weak_verbs_found": verbs["weak_verbs_found"],
        "quantification_score": quant["quantification_score"],
        "quantified_lines": quant["quantified_lines"],
        "detected_jd_title": title["detected_jd_title"],
        "job_title_match": title["job_title_match"],
        "title_relevance_score": title["title_relevance_score"],
        "rewrite_suggestions": rewrites,
        "readability_score": readability_score,
        "buzzwords_found": buzzwords_found,
        "cover_letter_score": cover_letter_score,
        "cover_letter_matched": cover_letter_matched,
        "cover_letter_missing": cover_letter_missing[:10],
        # Experience-fit block (JD comparison mode)
        "required_years":       exp_fit["required_years"],
        "candidate_years":      exp_fit["candidate_years"],
        "years_match":          exp_fit["years_match"],
        "experience_gap_years": exp_fit["experience_gap_years"],
        "years_fit_score":      exp_fit["years_fit_score"],
        "jd_seniority":         exp_fit["jd_seniority"],
        "resume_seniority":     exp_fit["resume_seniority"],
        "implied_seniority":    exp_fit["implied_seniority"],
        "seniority_mismatch":   exp_fit["seniority_mismatch"],
        "seniority_warning":    exp_fit["seniority_warning"],
        "positions_found":      exp_fit["positions_found"],
        "employment_gaps":      exp_fit["employment_gaps"],
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords,
        "extra_keywords": extra_keywords,
        "sections_found": sections_found,
        "sections_missing": sections_missing,
        "section_order": section_order,
        "section_order_suggestions": section_order_suggestions,
        "bullet_density_issues": bullet_density_issues,
        "suggestions": suggestions,
        "resume_word_count": resume_word_count,
        "jd_word_count": jd_word_count,
    }


def score_resume_only(resume_text: str, ats_preset: str = None) -> dict:
    """
    Score a resume for general ATS readiness without a job description.

    Evaluates four dimensions:
      - skills_score     (40%) — breadth of recognised tech/soft skills
      - experience_score (30%) — richness of experience language & quantification
      - education_score  (20%) — presence of education details
      - sections_score   (10%) — completeness of standard resume sections

    Returns the same dict schema as score_resume() with mode="resume_only",
    empty matched/missing keyword lists, and resume keywords in extra_keywords.

    Args:
        resume_text: Plain text of the resume.

    Returns:
        A dict containing all scoring fields compatible with the frontend ReportCard.
    """
    resume_lower = resume_text.lower()

    # ------------------------------------------------------------------
    # 1. Extract resume keywords (used as extra_keywords in the report)
    # ------------------------------------------------------------------
    resume_keywords = extract_keywords(resume_text)

    # ------------------------------------------------------------------
    # 2. skills_score — synonym-aware count of distinct skills in the resume.
    #    15 distinct skills = 100 (generous threshold for diverse profiles)
    # ------------------------------------------------------------------
    resume_skills = _find_skills_in_text(resume_text)
    skills_score = min(100, round((len(resume_skills) / 15) * 100))

    # ------------------------------------------------------------------
    # 3. experience_score — same formula as JD-comparison mode
    # ------------------------------------------------------------------
    exp_hits = sum(1 for kw in EXPERIENCE_KEYWORDS if kw in resume_lower)
    quantified = len(re.findall(r"\b\d+[\+\-]?\s*(?:years?|months?|%|x|\w+)\b", resume_lower))
    exp_base = min(70, round((exp_hits / len(EXPERIENCE_KEYWORDS)) * 70))
    exp_bonus = min(30, quantified * 5)
    experience_score = min(100, exp_base + exp_bonus)

    # ------------------------------------------------------------------
    # 4. education_score — same formula as JD-comparison mode
    # ------------------------------------------------------------------
    edu_hits = sum(1 for kw in EDUCATION_KEYWORDS if kw in resume_lower)
    if edu_hits >= 3:
        education_score = 100
    elif edu_hits >= 1:
        education_score = 50
    else:
        education_score = 0

    # ------------------------------------------------------------------
    # 5. sections_score — percentage of standard sections present
    # ------------------------------------------------------------------
    sections_found: list[str] = []
    sections_missing: list[str] = []
    for section, keywords in SECTION_KEYWORDS.items():
        if any(kw in resume_lower for kw in keywords):
            sections_found.append(section)
        else:
            sections_missing.append(section)
    sections_score = round((len(sections_found) / len(SECTION_KEYWORDS)) * 100)

    # ------------------------------------------------------------------
    # 6. overall_score — weighted average (no keyword_match component)
    # Apply ATS preset skills boost if provided
    # ------------------------------------------------------------------
    preset = ATS_PRESETS.get(ats_preset or "", None)
    eff_skills = min(100, round(skills_score * (preset["skills_boost"] if preset else 1.0)))
    eff_fmt_boost = preset["formatting_boost"] if preset else 1.0

    overall_score = round(
        eff_skills    * 0.40
        + experience_score * 0.30
        + education_score  * 0.20
        + sections_score   * 0.10
    )

    # ------------------------------------------------------------------
    # 7. Suggestions — ATS-readiness focused (no JD-specific advice)
    # ------------------------------------------------------------------
    suggestions: list[str] = []

    if skills_score < 60:
        suggestions.append(
            "Add more technical and soft skills to broaden your ATS visibility."
        )
    if "Skills" in sections_missing:
        suggestions.append(
            "Add a dedicated Skills section listing your core competencies."
        )
    if "Summary" in sections_missing:
        suggestions.append(
            "Add a professional summary at the top to give ATS systems context."
        )
    if experience_score < 50:
        suggestions.append(
            "Quantify your achievements with numbers and metrics (e.g., 'improved performance by 30%')."
        )
    if education_score == 0:
        suggestions.append(
            "Add your educational qualifications (degree, university, graduation year)."
        )
    if "Projects" in sections_missing:
        suggestions.append(
            "Showcase relevant personal or professional projects to demonstrate hands-on experience."
        )
    if "Certifications" in sections_missing:
        suggestions.append(
            "Consider adding certifications to strengthen your profile."
        )
    if len(resume_text.split()) < 300:
        suggestions.append(
            "Your resume appears short — aim for 400-600 words for better ATS coverage."
        )

    # Guarantee at least 3 suggestions
    if len(suggestions) < 3:
        fallbacks = [
            "Tailor your resume specifically for each job application.",
            "Use action verbs (Led, Built, Delivered, Optimised) to start bullet points.",
            "Keep your resume to 1-2 pages for maximum readability.",
            "Include links to your GitHub, LinkedIn, or portfolio.",
        ]
        for fb in fallbacks:
            if len(suggestions) >= 3:
                break
            if fb not in suggestions:
                suggestions.append(fb)

    # ------------------------------------------------------------------
    # 8. ATS formatting check
    # ------------------------------------------------------------------
    fmt = check_ats_formatting(resume_text)

    # ------------------------------------------------------------------
    # 9. Grammar & spell check
    # ------------------------------------------------------------------
    gram = check_grammar(resume_text)

    # ------------------------------------------------------------------
    # 10. Action verb analysis
    # ------------------------------------------------------------------
    verbs = analyze_action_verbs(resume_text)

    # ------------------------------------------------------------------
    # 11. Quantification score
    # ------------------------------------------------------------------
    quant = score_quantification(resume_text)

    # ------------------------------------------------------------------
    # 12. Rewrite suggestions for weak bullet points
    # ------------------------------------------------------------------
    rewrites = generate_rewrite_suggestions(resume_text)

    # ------------------------------------------------------------------
    # 13. Readability score
    # ------------------------------------------------------------------
    readability_score = compute_readability(resume_text)

    # ------------------------------------------------------------------
    # 14. Buzzword detection
    # ------------------------------------------------------------------
    buzzwords_found = detect_buzzwords(resume_text)

    # ------------------------------------------------------------------
    # 15. Experience fit — no JD here, so we only surface the candidate's
    # own years, implied seniority, and any employment gaps.
    # ------------------------------------------------------------------
    exp_fit = analyze_experience_fit(resume_text, jd_text=None)
    if exp_fit["employment_gaps"]:
        gap = exp_fit["employment_gaps"][0]
        suggestions.append(
            f"Employment gap of ~{gap['gap_months']} months detected "
            f"({gap['after']} → {gap['before']}). If relevant, briefly explain it."
        )

    # ------------------------------------------------------------------
    # Section order analysis
    # ------------------------------------------------------------------
    section_order = detect_section_order(resume_text)
    section_order_suggestions = get_section_order_suggestions(
        section_order, exp_fit["candidate_years"]
    )

    # ------------------------------------------------------------------
    # Bullet-point density check
    # ------------------------------------------------------------------
    bullet_density_issues = check_bullet_density(resume_text)

    # ------------------------------------------------------------------
    # Score explanations (ATS-only — no JD context)
    # ------------------------------------------------------------------
    score_explanations = build_score_explanations(
        mode="resume_only",
        keyword_match_score=0,
        skills_score=skills_score,
        experience_score=experience_score,
        education_score=education_score,
        matched_keywords=[],
        missing_keywords=[],
        jd_skills=set(),
        resume_skills=resume_skills,
        exp_hits=exp_hits,
        quantified_count=len(quant["quantified_lines"]),
        edu_hits=edu_hits,
    )

    # ------------------------------------------------------------------
    # Return the result dict (compatible with ReportCard schema)
    # ------------------------------------------------------------------
    return {
        "mode": "resume_only",
        "ats_preset": ats_preset or None,
        "overall_score": overall_score,
        "keyword_match_score": 0,
        "skills_score": skills_score,
        "experience_score": experience_score,
        "education_score": education_score,
        "sections_score": sections_score,
        "score_explanations": score_explanations,
        "detected_company": "",
        "formatting_score": fmt["formatting_score"],
        "formatting_issues": fmt["formatting_issues"],
        "grammar_score": gram["grammar_score"],
        "grammar_issues": gram["grammar_issues"],
        "action_verb_score": verbs["action_verb_score"],
        "strong_verbs_found": verbs["strong_verbs_found"],
        "weak_verbs_found": verbs["weak_verbs_found"],
        "quantification_score": quant["quantification_score"],
        "quantified_lines": quant["quantified_lines"],
        "detected_jd_title": "",
        "job_title_match": False,
        "title_relevance_score": None,   # not applicable in ATS-only mode
        "rewrite_suggestions": rewrites,
        "readability_score": readability_score,
        "buzzwords_found": buzzwords_found,
        "cover_letter_score": None,
        "cover_letter_matched": [],
        "cover_letter_missing": [],
        # Experience-fit block (ATS-only mode — no JD requirement)
        "required_years":       None,
        "candidate_years":      exp_fit["candidate_years"],
        "years_match":          True,
        "experience_gap_years": 0.0,
        "years_fit_score":      None,
        "jd_seniority":         None,
        "resume_seniority":     exp_fit["resume_seniority"],
        "implied_seniority":    exp_fit["implied_seniority"],
        "seniority_mismatch":   False,
        "seniority_warning":    None,
        "positions_found":      exp_fit["positions_found"],
        "employment_gaps":      exp_fit["employment_gaps"],
        "matched_keywords": [],
        "missing_keywords": [],
        "extra_keywords": resume_keywords[:50],  # Top 50 resume keywords
        "sections_found": sections_found,
        "sections_missing": sections_missing,
        "section_order": section_order,
        "section_order_suggestions": section_order_suggestions,
        "bullet_density_issues": bullet_density_issues,
        "suggestions": suggestions,
        "resume_word_count": len(resume_text.split()),
        "jd_word_count": 0,
    }
