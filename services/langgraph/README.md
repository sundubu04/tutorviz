# Tutorviz LangGraph service

Single-step workflow: **edit LaTeX** via OpenAI, stream progress over **SSE**.

## HTTP

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Service probe |
| `GET` | `/health` | `{ ok, openaiConfigured }` |
| `POST` | `/workflow/start` | Body: `taskId`, `message`, optional `latexContent`, optional `history[]`. Returns `{ workflowRunId }` immediately; run continues in the background. |
| `GET` | `/workflow/stream/{workflowRunId}` | SSE: `hello`, `received`, `processing`, `latex_proposed` or `error`, `done` |
| `POST` | `/editor/latex` | Synchronous LaTeX edit (same model/prompt as the graph node). |

## Environment

- `OPENAI_API_KEY` — required for real edits
- `OPENAI_MODEL` — optional (default `gpt-4o-mini` in `task_editor.py`)

## Local test

```bash
cd services/langgraph && .venv/bin/python scripts/test_workflow_api.py
```
