"""
coach.py — HireReady Resume Coach chatbot

Ports Vani's LiteLLM-based fallback pattern into HireReady. On each user
message, the backend assembles a system prompt containing the full score
report + resume + JD, then walks a ranked pool of free-tier models until
one responds.

Provider API keys (set at least OPENROUTER_API_KEY in Render env):
    OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, CEREBRAS_API_KEY
"""

from typing import List, Optional, Dict, Any
import litellm
from litellm import acompletion
from pydantic import BaseModel

litellm.suppress_debug_info = True
litellm.drop_params = True

# Same ranked free-tier pool Vani uses. Order = priority.
MODEL_POOL = [
    "openrouter/google/gemma-3-27b-it:free",
    "openrouter/deepseek/deepseek-chat-v3.1:free",
    "openrouter/meta-llama/llama-3.3-70b-instruct:free",
    "openrouter/qwen/qwen-2.5-72b-instruct:free",
    "openrouter/mistralai/mistral-small-3.2-24b-instruct:free",
    "openrouter/meta-llama/llama-3.1-8b-instruct:free",
    "groq/llama-3.3-70b-versatile",
    "gemini/gemini-2.0-flash",
    "cerebras/llama-3.3-70b",
]

OPENROUTER_EXTRA_HEADERS = {
    "HTTP-Referer": "http://localhost:5173",
    "X-Title": "HireReady",
}

SAMPLING_PARAMS = {
    "temperature": 0.5,
    "top_p": 0.9,
    "max_tokens": 1024,
    "presence_penalty": 0.2,
    "frequency_penalty": 0.2,
}

# Resume + JD text can be huge. Trim per-field so the prompt stays under
# free-tier context limits while still giving the model enough signal.
RESUME_CHAR_CAP = 6000
JD_CHAR_CAP = 4000
KEYWORD_LIST_CAP = 30


class ChatMessage(BaseModel):
    role: str
    content: str


class CoachRequest(BaseModel):
    messages: List[ChatMessage]
    report: Dict[str, Any]


def _format_keyword_list(keywords: Optional[List[str]], cap: int = KEYWORD_LIST_CAP) -> str:
    if not keywords:
        return "(none)"
    shown = keywords[:cap]
    suffix = f" … (+{len(keywords) - cap} more)" if len(keywords) > cap else ""
    return ", ".join(shown) + suffix


def build_system_prompt(report: Dict[str, Any]) -> str:
    """
    Assemble the coach's system prompt. Every turn re-sends the full report
    so the model always has the user's data — stateless on the backend.

    The prompt branches on report["mode"]:
      - "resume_only" → ATS-readiness review (no JD uploaded). Coach must NOT
        discuss keyword-match scores, missing keywords, or JD alignment —
        those numbers don't exist in this mode.
      - "ats_vs_jd"   → JD-comparison review. Coach can reference all scores
        including keyword_match, matched/missing keywords, and JD text.
    """
    resume_text = (report.get("resume_text") or "")[:RESUME_CHAR_CAP]
    jd_text = (report.get("jd_text") or "")[:JD_CHAR_CAP]
    mode = report.get("mode") or ("ats_vs_jd" if jd_text.strip() else "resume_only")

    # ---- Mode-specific scorecard ----
    # In resume_only mode, keyword_match_score is 0 because there's no JD to
    # match against — the model should understand that and not call it a "gap".
    if mode == "resume_only":
        scorecard = (
            f"Overall ATS-readiness score: {report.get('overall_score', 'N/A')}/100\n"
            f"Sub-scores — skills breadth: {report.get('skills_score', 'N/A')}, "
            f"experience: {report.get('experience_score', 'N/A')}, "
            f"education: {report.get('education_score', 'N/A')}\n"
            f"Sections found: {', '.join(report.get('sections_found') or []) or '(none)'}\n"
            f"Sections missing: {', '.join(report.get('sections_missing') or []) or '(none)'}"
        )
        mode_header = (
            "ANALYSIS MODE: ATS-readiness only (no job description was provided).\n"
            "This score reflects how well the resume is structured for ATS parsing "
            "and how broad/rich the candidate's skills, experience, and education are — "
            "NOT how well it matches any specific job.\n\n"
            "IMPORTANT rules for this mode:\n"
            "- There is NO keyword-match score, NO missing keywords, NO JD comparison. "
            "Do not invent or reference those — if the user asks about keyword matching "
            "or JD fit, clearly explain that no JD was uploaded and offer to re-analyze "
            "after they add one.\n"
            "- Focus feedback on: section completeness, skills breadth, experience depth "
            "(quantified achievements, action verbs), education clarity, formatting hygiene."
        )
    else:
        scorecard = (
            f"Overall match score: {report.get('overall_score', 'N/A')}/100\n"
            f"Sub-scores — keyword match: {report.get('keyword_match_score', 'N/A')}, "
            f"skills: {report.get('skills_score', 'N/A')}, "
            f"experience: {report.get('experience_score', 'N/A')}, "
            f"education: {report.get('education_score', 'N/A')}\n"
            f"Sections found: {', '.join(report.get('sections_found') or []) or '(none)'}\n"
            f"Sections missing: {', '.join(report.get('sections_missing') or []) or '(none)'}\n"
            f"Matched keywords: {_format_keyword_list(report.get('matched_keywords'))}\n"
            f"Missing keywords: {_format_keyword_list(report.get('missing_keywords'))}\n"
            f"Extra keywords (in resume but not JD): {_format_keyword_list(report.get('extra_keywords'))}"
        )
        mode_header = (
            "ANALYSIS MODE: Resume vs. Job Description comparison.\n"
            "This score reflects how well this specific resume matches the target JD.\n\n"
            "Focus feedback on: keyword alignment with the JD, missing must-have skills, "
            "rewriting weak bullets to mirror JD language, section gaps vs. what the JD implies."
        )

    jd_block = (
        f"\n\nJOB DESCRIPTION (first {JD_CHAR_CAP} chars):\n{jd_text}"
        if mode == "ats_vs_jd" and jd_text.strip()
        else ""
    )

    # Mode-specific rules for skill / keyword recommendations. Without these,
    # models default to generic "things experienced candidates typically list"
    # answers (DevOps, Kafka, Neo4j…) regardless of whether the candidate is a
    # backend engineer, a data analyst, or a frontend dev.
    if mode == "resume_only":
        grounding_rules = (
            "GROUNDING RULES — read before answering:\n"
            "1. Infer the candidate's ACTUAL role/domain from their resume text "
            "(job titles, project descriptions, skills listed). Examples: 'backend "
            "engineer (Python/Node, AWS)', 'frontend engineer (React)', 'data "
            "analyst (SQL/Tableau)', 'ML engineer'. State the role you inferred in "
            "ONE short line before giving advice, so the user can correct you.\n"
            "2. If the role is genuinely ambiguous (e.g. the resume mixes frontend, "
            "backend, and data work with no clear seniority or target), STOP and ask "
            "ONE clarifying question: 'What roles are you targeting next — X, Y, or Z?' "
            "Do not answer the question yet.\n"
            "3. When suggesting skills, recommend ONLY skills that are adjacent to what "
            "the candidate already does. A backend engineer gets backend-adjacent "
            "suggestions (e.g. observability, message queues, specific cloud services "
            "they haven't listed). Do NOT recommend DevOps, ML, data engineering, or "
            "graph databases unless the resume shows they're moving in that direction.\n"
            "4. For every skill you suggest, give a concrete reason tied to THIS "
            "resume: 'You've shipped REST APIs on AWS Lambda but don't mention "
            "tracing — adding OpenTelemetry would round out the observability story.' "
            "Never use phrases like 'experienced candidates typically list…' or "
            "'stand out as well-rounded' — those are generic filler.\n"
            "5. Cap skill suggestions at 3–5 items. Quality over quantity.\n\n"
        )
    else:
        grounding_rules = (
            "GROUNDING RULES — read before answering:\n"
            "1. The job description IS the source of truth for what skills matter. "
            "Do NOT suggest skills from general 'industry trends' — only suggest "
            "skills that (a) appear in the JD and (b) are missing or weak in the "
            "resume.\n"
            "2. When the user asks about skills to add, cross-reference the JD "
            "against the resume and list the missing JD skills in priority order "
            "(hard requirements first, nice-to-haves second). For each, quote the "
            "short phrase from the JD that shows it's required.\n"
            "3. If a skill the user asks about is NOT in the JD, say so plainly: "
            "'The JD doesn't mention X, so adding it won't move your match score. "
            "But if you're targeting similar roles, here's where it'd fit…'\n"
            "4. Never use phrases like 'experienced candidates typically list…' — "
            "ground every recommendation in either the JD or the resume.\n"
            "5. Cap skill suggestions at 3–5 items. Quality over quantity.\n\n"
        )

    return (
        "You are HireReady Coach — a direct, experienced resume reviewer who helps "
        "job seekers improve their chances with ATS systems and human recruiters. "
        "Think of yourself as a senior recruiter who's seen thousands of resumes.\n\n"
        "Voice & tone:\n"
        "- Warm but honest. Don't sugarcoat weak resumes; don't pile on either.\n"
        "- Skip robotic openers ('Certainly!', 'As an AI...'). Just answer.\n"
        "- Short questions → short answers (1–3 sentences). Complex asks → structured with bullets or numbered steps.\n"
        "- Always reference the actual numbers from the report (e.g. 'your skills score is 62 — here's why').\n"
        "- When rewriting bullets, show before/after with quantified impact.\n"
        "- Format code / rewrites in fenced code blocks; use **bold** for key terms.\n"
        "- Ask a clarifying question when the answer genuinely depends on info you "
        "don't have (target role, seniority, industry). Don't guess and don't "
        "hedge with generic lists.\n\n"
        "Never mention which underlying model you are. You are HireReady Coach.\n\n"
        f"=== {mode_header} ===\n\n"
        f"{grounding_rules}"
        "=== CURRENT CANDIDATE'S REPORT ===\n"
        f"{scorecard}"
        f"\n\nRESUME TEXT (first {RESUME_CHAR_CAP} chars):\n{resume_text}"
        f"{jd_block}"
    )


async def run_coach_chat(request: CoachRequest) -> Dict[str, Any]:
    """
    Walk MODEL_POOL until one model replies. Returns {reply, model_used} or
    raises the last exception if every model fails (caller maps to 503).
    """
    system_prompt = build_system_prompt(request.report)
    messages_payload = [{"role": "system", "content": system_prompt}] + [
        {"role": m.role, "content": m.content} for m in request.messages
    ]

    last_error: Optional[Exception] = None
    for model in MODEL_POOL:
        kwargs = {
            "model": model,
            "messages": messages_payload,
            "timeout": 15,
            **SAMPLING_PARAMS,
        }
        if model.startswith("openrouter/"):
            kwargs["extra_headers"] = OPENROUTER_EXTRA_HEADERS

        try:
            response = await acompletion(**kwargs)
            reply = response["choices"][0]["message"]["content"]
            if not reply or not reply.strip():
                raise ValueError("empty reply")
            return {"reply": reply, "model_used": model}
        except Exception as exc:
            print(f"[coach fallback] {model} failed: {type(exc).__name__}: {exc}")
            last_error = exc
            continue

    raise RuntimeError(
        f"All {len(MODEL_POOL)} models failed. Last error: {last_error}"
    )
