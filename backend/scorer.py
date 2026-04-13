"""
scorer.py — NLP Scoring Engine
Uses spaCy en_core_web_sm to analyse resume vs job description and produce
a structured score report with actionable suggestions.
"""

import re
import spacy

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


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------

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


def score_resume(resume_text: str, jd_text: str) -> dict:
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
    # 6. overall_score (weighted average)
    # ------------------------------------------------------------------
    overall_score = round(
        keyword_match_score * 0.40
        + skills_score * 0.25
        + experience_score * 0.20
        + education_score * 0.15
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
    # 9. Word counts
    # ------------------------------------------------------------------
    resume_word_count = len(resume_text.split())
    jd_word_count = len(jd_text.split())

    # ------------------------------------------------------------------
    # Return the complete result dict
    # ------------------------------------------------------------------
    return {
        "mode": "ats_vs_jd",
        "overall_score": overall_score,
        "keyword_match_score": keyword_match_score,
        "skills_score": skills_score,
        "experience_score": experience_score,
        "education_score": education_score,
        "sections_score": None,
        "matched_keywords": matched_keywords,
        "missing_keywords": missing_keywords,
        "extra_keywords": extra_keywords,
        "sections_found": sections_found,
        "sections_missing": sections_missing,
        "suggestions": suggestions,
        "resume_word_count": resume_word_count,
        "jd_word_count": jd_word_count,
    }


def score_resume_only(resume_text: str) -> dict:
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
    # ------------------------------------------------------------------
    overall_score = round(
        skills_score * 0.40
        + experience_score * 0.30
        + education_score * 0.20
        + sections_score * 0.10
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
    # Return the result dict (compatible with ReportCard schema)
    # ------------------------------------------------------------------
    return {
        "mode": "resume_only",
        "overall_score": overall_score,
        "keyword_match_score": 0,
        "skills_score": skills_score,
        "experience_score": experience_score,
        "education_score": education_score,
        "sections_score": sections_score,
        "matched_keywords": [],
        "missing_keywords": [],
        "extra_keywords": resume_keywords[:50],  # Top 50 resume keywords
        "sections_found": sections_found,
        "sections_missing": sections_missing,
        "suggestions": suggestions,
        "resume_word_count": len(resume_text.split()),
        "jd_word_count": 0,
    }
