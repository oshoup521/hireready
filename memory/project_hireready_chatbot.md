---
name: HireReady chatbot integration
description: HireReady is getting a resume-coach chatbot ported from the Vani project — decisions and scope.
type: project
---

HireReady is adding an AI chatbot that gives resume improvement suggestions based on the generated score report. Implementation approach: **Option A — port Vani into HireReady** (copy `/chat` endpoint + 3 chat components, reuse LiteLLM free-model pool, no paid API key).

**Why:** User wants Vani-style chat inside HireReady without running two services. Vani's LiteLLM pool uses free-tier providers (OpenRouter/Groq/Gemini), so cost stays zero. CLAUDE.md's "no LLM" rule gets relaxed for this feature — user approved on 2026-04-21.

**How to apply:**
- Chatbot sees the full report context (scores, matched/missing keywords, sections, full resume + JD text) on every message via a system prompt assembled backend-side.
- UI: **Layout 1 (inline panel below ReportCard)** + starter chips ("Why is my score only X?", "Rewrite my experience bullets", "Which missing keywords matter most?", "What sections should I add?"). Chips auto-send on click.
- Chat history: React state only, session-scoped, clears on new upload. No DB, no auth.
- Print/PDF: chatbot hidden via `@media print` so the downloaded report stays clean.
- Reference source: `c:/Users/oshoupadhyay/PROJECTS/MY-PROJECTs/vani/backend/main.py` and `vani/frontend/src/components/{ChatInput,ChatWindow,MessageBubble}.jsx`.
