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
    """
    resume_text = (report.get("resume_text") or "")[:RESUME_CHAR_CAP]
    jd_text = (report.get("jd_text") or "")[:JD_CHAR_CAP]

    # Present the report as a compact structured block. The model reads JSON
    # fine, but prose headings nudge it to reference the right numbers.
    report_summary = (
        f"Overall score: {report.get('overall_score', 'N/A')}/100\n"
        f"Sub-scores — keyword match: {report.get('keyword_match_score', 'N/A')}, "
        f"skills: {report.get('skills_score', 'N/A')}, "
        f"experience: {report.get('experience_score', 'N/A')}, "
        f"education: {report.get('education_score', 'N/A')}\n"
        f"Sections found: {', '.join(report.get('sections_found') or []) or '(none)'}\n"
        f"Sections missing: {', '.join(report.get('sections_missing') or []) or '(none)'}\n"
        f"Matched keywords: {_format_keyword_list(report.get('matched_keywords'))}\n"
        f"Missing keywords: {_format_keyword_list(report.get('missing_keywords'))}\n"
        f"Extra keywords: {_format_keyword_list(report.get('extra_keywords'))}"
    )

    jd_block = (
        f"\n\nJOB DESCRIPTION (first {JD_CHAR_CAP} chars):\n{jd_text}"
        if jd_text.strip()
        else "\n\nNo job description was provided — this is an ATS-readiness review only."
    )

    return (
        "You are HireReady Coach — a direct, experienced resume reviewer who helps "
        "job seekers improve their chances with ATS systems and human recruiters. "
        "Think of yourself as a senior recruiter who's seen thousands of resumes.\n\n"
        "Voice & tone:\n"
        "- Warm but honest. Don't sugarcoat weak resumes; don't pile on either.\n"
        "- Skip robotic openers ('Certainly!', 'As an AI...'). Just answer.\n"
        "- Short questions → short answers (1–3 sentences). Complex asks → structured with bullets or numbered steps.\n"
        "- Always reference the actual numbers from the report (e.g. 'your keyword match is 42 — here's why').\n"
        "- When rewriting bullets, show before/after with quantified impact.\n"
        "- Format code / rewrites in fenced code blocks; use **bold** for key terms.\n\n"
        "Never mention which underlying model you are. You are HireReady Coach.\n\n"
        "=== CURRENT CANDIDATE'S REPORT ===\n"
        f"{report_summary}"
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
