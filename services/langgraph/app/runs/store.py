import asyncio
import json
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, Optional

@dataclass
class WorkflowRun:
    run_id: str
    task_id: str
    created_at_ms: int
    state: Dict[str, Any] = field(default_factory=dict)
    queue: "asyncio.Queue[Dict[str, Any]]" = field(default_factory=asyncio.Queue)
    waiting_for: Optional[str] = None


RUNS: Dict[str, WorkflowRun] = {}


def now_ms() -> int:
    return int(time.time() * 1000)


def emit(run: WorkflowRun, event_type: str, payload: Dict[str, Any]) -> None:
    run.queue.put_nowait(
        {
            "type": "workflow_event",
            "event": event_type,
            "workflowRunId": run.run_id,
            "taskId": run.task_id,
            "ts": now_ms(),
            "payload": payload,
        }
    )


async def event_stream(run: WorkflowRun) -> AsyncIterator[Dict[str, str]]:
    yield {"event": "hello", "data": json.dumps({"workflowRunId": run.run_id, "taskId": run.task_id})}
    while True:
        evt = await run.queue.get()
        yield {"event": evt.get("event", "message"), "data": json.dumps(evt)}
        if evt.get("event") in {"done", "cancelled"}:
            break
