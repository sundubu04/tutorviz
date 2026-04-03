import asyncio
import logging
import os
import uuid

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.runs.store import RUNS, WorkflowRun, event_stream, now_ms
from app.schemas import StartRequest
from app.workflow.runner import run_start_flow

router = APIRouter(tags=["workflow"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def health():
    has_key = bool(os.getenv("OPENAI_API_KEY"))
    return {"ok": True, "openaiConfigured": has_key}


@router.post("/workflow/start")
async def workflow_start(req: StartRequest):
    run_id = f"wr_{uuid.uuid4().hex}"
    run = WorkflowRun(run_id=run_id, task_id=req.taskId, created_at_ms=now_ms())
    RUNS[run_id] = run

    history_payload = [t.model_dump() for t in req.history] if req.history else None

    async def _run() -> None:
        try:
            await run_start_flow(run, req.message, req.latexContent or "", history_payload)
        except Exception:
            logger.exception("workflow background run failed run_id=%s", run_id)

    asyncio.create_task(_run())

    logger.info("workflow/start accepted run_id=%s task_id=%s", run_id, req.taskId)
    return {"workflowRunId": run_id}


@router.get("/workflow/stream/{workflowRunId}")
async def workflow_stream(workflowRunId: str):
    run = RUNS.get(workflowRunId)
    if not run:
        raise HTTPException(status_code=404, detail="workflowRunId not found")

    return EventSourceResponse(
        event_stream(run),
        headers={"X-Accel-Buffering": "no"},
    )
