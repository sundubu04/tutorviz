# LangGraph Workflow Service (TaskMaker)

TutoriAI’s TaskMaker uses a small Python service to run an interactive, checkpointed workflow (LangGraph-style) and stream progress back to the Task Editor.

## What it does

- Classifies the user prompt
- Optionally performs **web search** (OpenAI `web_search` tool) when the user asks for existing problems/examples
- Produces a **checkpoint plan** (todos) for approval
- Generates a **LaTeX proposal** that the user must explicitly apply

## Local dev (Docker)

`docker-compose.dev.yml` runs a `langgraph-service` container and injects:

- `OPENAI_API_KEY` (optional; enables real web search)
- `OPENAI_MODEL` / `OPENAI_WEB_SEARCH_MODEL`
- `OPENAI_WEB_SEARCH_LIVE`

The backend talks to it via:

- `LANGGRAPH_SERVICE_URL` (defaults to `http://langgraph-service:8000` in Docker)

## API surface

The Node backend proxies these endpoints under `/api/tasks/:taskId/ai/workflow/*`:

- `POST /api/tasks/:taskId/ai/workflow/start`
- `POST /api/tasks/:taskId/ai/workflow/approve`
- `GET  /api/tasks/:taskId/ai/workflow/stream/:workflowRunId` (SSE)

