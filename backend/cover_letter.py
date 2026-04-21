"""
cover_letter.py — Template-based tailored cover letter generator.

No LLM required.  Fills structured paragraph templates with data extracted
by scorer.py's NLP analysis (matched skills, quantified achievements, role
title, years of experience).

Public API
----------
generate_cover_letter(resume_text, jd_text, applicant_name, company_name, role_name)
    -> dict with keys: cover_letter, detected_name, detected_role,
                        matched_skills_used, achievement_used
"""

import re
import datetime

from scorer import (
    _find_skills_in_text,
    detect_job_title_relevance,
    score_quantification,
    extract_resume_years,
    SECTION_KEYWORDS,
)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_candidate_name(resume_text: str) -> str:
    """
    Heuristically extract the candidate's full name from the top of the resume.

    Strategy: scan the first six non-empty lines for a line that looks like a
    personal name (1–4 capitalised words, no digits, no email '@', and not a
    known section-heading keyword).
    """
    all_kws: set[str] = {kw for kws in SECTION_KEYWORDS.values() for kw in kws}
    lines = [l.strip() for l in resume_text.split("\n") if l.strip()]
    for line in lines[:6]:
        if "@" in line or any(c.isdigit() for c in line):
            continue
        words = line.split()
        if (
            1 <= len(words) <= 4
            and all(w[0].isupper() for w in words if w.isalpha())
            and line.lower() not in all_kws
        ):
            return line
    return ""


def _contact_line(resume_text: str) -> str:
    """Return 'email | phone' contact line extracted from resume, or empty string."""
    email_m = re.search(
        r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", resume_text
    )
    phone_m = re.search(
        r"[\+]?[(]?[0-9]{3}[)]?[\s.\-]?[0-9]{3}[\s.\-]?[0-9]{4,6}", resume_text
    )
    parts = []
    if email_m:
        parts.append(email_m.group(0))
    if phone_m:
        parts.append(phone_m.group(0))
    return " | ".join(parts)


def _top_matched_skills(resume_text: str, jd_text: str, n: int = 5) -> list[str]:
    """Return the top-n skill names that appear in both resume and JD."""
    resume_skills = _find_skills_in_text(resume_text)
    jd_skills = _find_skills_in_text(jd_text)
    matched = sorted(resume_skills & jd_skills)
    return matched[:n]


def _best_achievement(resume_text: str) -> str:
    """
    Return the single best quantified achievement line found in the resume,
    or an empty string if none are present.
    Prefers the shortest line that still reads like a complete sentence (>30 chars).
    """
    quant = score_quantification(resume_text)
    lines = quant.get("quantified_lines", [])
    if not lines:
        return ""
    cleaned = [l.strip(" -•*–—") for l in lines]
    candidates = [l for l in cleaned if len(l) > 30]
    if not candidates:
        return ""
    return min(candidates, key=len)


def _professional_field(resume_text: str, jd_text: str) -> str:
    """
    Guess the broad professional field from matched skill keywords.
    Returns a short phrase such as 'software engineering' or 'data science'.
    """
    combined = (resume_text + " " + jd_text).lower()
    field_map = {
        "data science": ["machine learning", "deep learning", "data science", "tensorflow", "pytorch"],
        "software engineering": ["software development", "backend", "frontend", "full stack", "rest api"],
        "devops / cloud": ["kubernetes", "docker", "aws", "azure", "gcp", "ci/cd", "terraform"],
        "product management": ["product management", "roadmap", "stakeholder", "agile", "scrum"],
        "data engineering": ["data pipeline", "spark", "airflow", "dbt", "databricks", "etl"],
        "frontend development": ["react", "angular", "vue", "html", "css", "typescript"],
        "mobile development": ["android", "ios", "swift", "kotlin", "react native", "flutter"],
    }
    best_field = "technology"
    best_count = 0
    for field, keywords in field_map.items():
        count = sum(1 for kw in keywords if kw in combined)
        if count > best_count:
            best_count = count
            best_field = field
    return best_field


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------

def generate_cover_letter(
    resume_text: str,
    jd_text: str,
    applicant_name: str = "",
    company_name: str = "",
    role_name: str = "",
) -> dict:
    """
    Generate a tailored cover letter draft from the candidate's resume and JD.

    No LLM is used.  The function:
      1. Auto-detects missing context (name, role, contact line) via NLP helpers.
      2. Extracts the top 5 skills that appear in both documents.
      3. Finds the strongest quantified achievement from the resume.
      4. Fills a structured three-paragraph template with the extracted data.

    Args:
        resume_text:    Plain text extracted from the candidate's resume.
        jd_text:        Plain text extracted from the job description.
        applicant_name: Candidate name (auto-detected from resume if not given).
        company_name:   Target company (shown as 'your organisation' if not given).
        role_name:      Target role title (auto-detected from JD if not given).

    Returns:
        {
            "cover_letter":        str,        # full letter text
            "detected_name":       str,        # name used in the letter
            "detected_role":       str,        # role used in the letter
            "matched_skills_used": list[str],  # skills woven into paragraph 2
            "achievement_used":    str,        # achievement used in paragraph 2
        }
    """
    # ---- auto-fill missing context ----
    name = applicant_name.strip() or _extract_candidate_name(resume_text)
    title_info = detect_job_title_relevance(resume_text, jd_text) if jd_text else {}
    role = role_name.strip() or title_info.get("detected_jd_title") or "this position"
    company = company_name.strip() or "your organisation"
    contact_line = _contact_line(resume_text)

    # ---- NLP extractions ----
    top_skills = _top_matched_skills(resume_text, jd_text, n=5)
    achievement = _best_achievement(resume_text)
    field = _professional_field(resume_text, jd_text)
    years_info = extract_resume_years(resume_text)
    years: float = years_info.get("total_years", 0) or 0

    # ---- skill phrase ----
    if len(top_skills) >= 3:
        skill_phrase = f"{', '.join(top_skills[:-1])}, and {top_skills[-1]}"
    elif len(top_skills) == 2:
        skill_phrase = f"{top_skills[0]} and {top_skills[1]}"
    elif len(top_skills) == 1:
        skill_phrase = top_skills[0]
    else:
        skill_phrase = f"{field} tools and methodologies"

    # ---- experience phrase ----
    if years >= 5:
        exp_phrase = f"over {int(years)} years of hands-on experience in {field}"
    elif years >= 2:
        exp_phrase = f"{years:.0f} years of experience in {field}"
    elif years >= 1:
        exp_phrase = f"over a year of experience in {field}"
    else:
        exp_phrase = f"a strong academic and project background in {field}"

    # ---- achievement sentence ----
    if achievement:
        ach_sentence = (
            f"In a previous role, I achieved results such as: "
            f"{achievement.rstrip('.')}, which reflects my focus on delivering "
            f"measurable impact."
        )
    else:
        ach_sentence = (
            "I take pride in delivering measurable outcomes and consistently look "
            "for ways to improve processes and drive meaningful impact."
        )

    # ---- assemble letter sections ----
    today = datetime.date.today().strftime("%B %d, %Y")

    header_lines = []
    if name:
        header_lines.append(name)
    if contact_line:
        header_lines.append(contact_line)
    header_lines.append(today)
    header = "\n".join(header_lines)

    p1 = (
        f"I am writing to express my strong interest in the {role} position at {company}. "
        f"With {exp_phrase} and a track record of delivering results with {skill_phrase}, "
        f"I am confident in my ability to contribute meaningfully to your team from day one."
    )

    p2 = (
        f"My background closely aligns with what you are looking for. "
        f"{ach_sentence} "
        f"I bring solid expertise in {skill_phrase}, and I am always looking for ways "
        f"to apply these skills to tackle real-world problems efficiently and at scale."
    )

    p3 = (
        f"I am genuinely excited about the opportunity at {company} and the chance to "
        f"grow alongside a talented team doing impactful work. "
        f"I would welcome the chance to discuss how my experience aligns with your goals. "
        f"Thank you for your time and consideration — I look forward to hearing from you."
    )

    sign_off = f"Sincerely,\n{name}" if name else "Sincerely,"

    letter = f"{header}\n\nDear Hiring Manager,\n\n{p1}\n\n{p2}\n\n{p3}\n\n{sign_off}"

    return {
        "cover_letter": letter,
        "detected_name": name,
        "detected_role": role,
        "matched_skills_used": top_skills,
        "achievement_used": achievement,
    }
