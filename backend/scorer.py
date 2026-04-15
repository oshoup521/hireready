"""
scorer.py — NLP Scoring Engine
Uses spaCy en_core_web_sm to analyse resume vs job description and produce
a structured score report with actionable suggestions.
"""

import re
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
# Role-specific scoring weights
# ---------------------------------------------------------------------------
ROLE_WEIGHTS = {
    "software_engineer": {
        "keyword": 0.35,
        "skills":  0.30,
        "experience": 0.25,
        "education": 0.10,
    },
    "product_manager": {
        "keyword": 0.30,
        "skills":  0.20,
        "experience": 0.35,
        "education": 0.15,
    },
    "data_scientist": {
        "keyword": 0.30,
        "skills":  0.35,
        "experience": 0.20,
        "education": 0.15,
    },
    "default": {
        "keyword": 0.40,
        "skills":  0.25,
        "experience": 0.20,
        "education": 0.15,
    },
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

# Weak resume openers that should be replaced with action verbs
_WEAK_OPENERS = [
    r"\bresponsible for\b",
    r"\bhelped (with|to)\b",
    r"\bworked on\b",
    r"\bassisted (with|in)\b",
    r"\bpart of (the|a)\b",
    r"\binvolved in\b",
    r"\bsupported (the|a)\b",
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


def score_resume(resume_text: str, jd_text: str, role: str = None, ats_preset: str = None, cover_letter_text: str = None) -> dict:
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
    # 1. Keyword extraction
    # ------------------------------------------------------------------
    resume_keywords_list = extract_keywords(resume_text)
    jd_keywords_list = extract_keywords(jd_text)

    resume_kw_set = set(resume_keywords_list)
    jd_kw_set = set(jd_keywords_list)

    matched_keywords = sorted(resume_kw_set & jd_kw_set)
    missing_keywords = sorted(jd_kw_set - resume_kw_set)
    extra_keywords = sorted(resume_kw_set - jd_kw_set)

    # ------------------------------------------------------------------
    # 2. keyword_match_score
    # ------------------------------------------------------------------
    if jd_kw_set:
        keyword_match_score = min(
            100, round((len(matched_keywords) / len(jd_kw_set)) * 100)
        )
    else:
        keyword_match_score = 0

    # ------------------------------------------------------------------
    # 3. skills_score — how many skills from the vocab appear in the JD
    #    and how many of those also appear in the resume
    # ------------------------------------------------------------------
    jd_skills = {s for s in TECH_SKILLS if s in jd_lower}
    if jd_skills:
        resume_skills_matched = {s for s in jd_skills if s in resume_lower}
        skills_score = min(100, round((len(resume_skills_matched) / len(jd_skills)) * 100))
    else:
        # If JD doesn't mention specific skills, check resume breadth
        resume_skill_count = sum(1 for s in TECH_SKILLS if s in resume_lower)
        skills_score = min(100, round((resume_skill_count / 10) * 100))

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
    # 6. overall_score (weighted average — role-adjusted)
    # ------------------------------------------------------------------
    weights = ROLE_WEIGHTS.get(role or "default", ROLE_WEIGHTS["default"])

    # Apply ATS preset keyword / skills boost before weighting
    preset = ATS_PRESETS.get(ats_preset or "", None)
    eff_keyword = min(100, round(keyword_match_score * (preset["keyword_boost"] if preset else 1.0)))
    eff_skills  = min(100, round(skills_score * (preset["skills_boost"] if preset else 1.0)))

    overall_score = round(
        eff_keyword       * weights["keyword"]
        + eff_skills      * weights["skills"]
        + experience_score * weights["experience"]
        + education_score  * weights["education"]
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
        cl_keywords = set(extract_keywords(cover_letter_text))
        cl_matched = sorted(cl_keywords & jd_kw_set)
        cl_missing = sorted(jd_kw_set - cl_keywords)
        cl_score = min(100, round(len(cl_matched) / max(1, len(jd_kw_set)) * 100))
        cover_letter_score = cl_score
        cover_letter_matched = cl_matched
        cover_letter_missing = cl_missing

    # ------------------------------------------------------------------
    # 18. Word counts
    # ------------------------------------------------------------------
    resume_word_count = len(resume_text.split())
    jd_word_count = len(jd_text.split())

    # ------------------------------------------------------------------
    # Return the complete result dict
    # ------------------------------------------------------------------
    return {
        "mode": "ats_vs_jd",
        "role": role or "default",
        "ats_preset": ats_preset or None,
        "overall_score": overall_score,
        "keyword_match_score": keyword_match_score,
        "skills_score": skills_score,
        "experience_score": experience_score,
        "education_score": education_score,
        "sections_score": None,
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
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords,
        "extra_keywords": extra_keywords,
        "sections_found": sections_found,
        "sections_missing": sections_missing,
        "suggestions": suggestions,
        "resume_word_count": resume_word_count,
        "jd_word_count": jd_word_count,
    }


def score_resume_only(resume_text: str, role: str = None, ats_preset: str = None) -> dict:
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
    # 2. skills_score — how many skills from the vocab appear in the resume
    #    15 distinct skills = 100 (generous threshold for diverse profiles)
    # ------------------------------------------------------------------
    resume_skill_count = sum(1 for s in TECH_SKILLS if s in resume_lower)
    skills_score = min(100, round((resume_skill_count / 15) * 100))

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
    # Return the result dict (compatible with ReportCard schema)
    # ------------------------------------------------------------------
    return {
        "mode": "resume_only",
        "role": role or "default",
        "ats_preset": ats_preset or None,
        "overall_score": overall_score,
        "keyword_match_score": 0,
        "skills_score": skills_score,
        "experience_score": experience_score,
        "education_score": education_score,
        "sections_score": sections_score,
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
        "matched_keywords": [],
        "missing_keywords": [],
        "extra_keywords": resume_keywords[:50],  # Top 50 resume keywords
        "sections_found": sections_found,
        "sections_missing": sections_missing,
        "suggestions": suggestions,
        "resume_word_count": len(resume_text.split()),
        "jd_word_count": 0,
    }
