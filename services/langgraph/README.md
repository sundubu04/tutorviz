# Tutorviz LangGraph Workflow Service (MVP)

This service provides a lightweight **LangGraph-style** workflow runner for TaskMaker:

- Classifies the user prompt
- Optionally runs **web search** via OpenAI's `web_search` tool (Responses API)
- Proposes a **checkpoint plan** and waits for approval
- Emits a **LaTeX proposal** event for the app to review/apply

## Endpoints

- `POST /workflow/start` → `{ workflowRunId }`
- `POST /workflow/approve` → `{ ok: true }`
- `GET /workflow/stream/{workflowRunId}` → SSE stream of workflow events

## Environment

- `OPENAI_API_KEY` (optional; enables real web search)
- `OPENAI_MODEL` (optional)
- `OPENAI_WEB_SEARCH_MODEL` (optional)
- `OPENAI_WEB_SEARCH_LIVE` (optional, default `true`)

