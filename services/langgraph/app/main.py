import asyncio
import json
import os
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, List, Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

try:
    # LangGraph is required by the plan; we keep usage lightweight for an MVP.
    from langgraph.graph import StateGraph, END  # type: ignore
except Exception:  # pragma: no cover
    StateGraph = None  # type: ignore
    END = "__end__"  # type: ignore

load_dotenv()

app = FastAPI(title="Tutorviz LangGraph Workflow Service", version="0.1.0")


Intent = Literal[
    "create_new_task",
    "edit_existing_task",
    "find_existing_problems",
    "explain_latex_error",
    "unknown",
]


class StartRequest(BaseModel):
    taskId: str
    message: str = Field(min_length=1)
    latexContent: Optional[str] = None


class ApproveRequest(BaseModel):
    workflowRunId: str
    checkpointId: str
    approved: bool
    edits: Optional[Dict[str, Any]] = None


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


def classify_intent(message: str) -> Intent:
    m = message.lower()
    if any(k in m for k in ["find existing", "existing problems", "worksheet from web", "search", "look up"]):
        return "find_existing_problems"
    if any(k in m for k in ["latex error", "compile error", "tectonic", "pdflatex", "log says"]):
        return "explain_latex_error"
    if any(k in m for k in ["edit", "change", "update", "modify", "rewrite"]):
        return "edit_existing_task"
    if any(k in m for k in ["create", "make", "generate", "new task", "worksheet", "quiz"]):
        return "create_new_task"
    return "unknown"


async def openai_web_search(query: str) -> Dict[str, Any]:
    """
    Uses OpenAI web search tool (Responses API) if OPENAI_API_KEY is configured.
    Returns a structured object with citations/sources if available.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {
            "mode": "disabled",
            "query": query,
            "summary": "Web search is not configured (missing OPENAI_API_KEY).",
            "citations": [],
            "sources": [],
        }

    try:
        from openai import OpenAI  # type: ignore
    except Exception as e:  # pragma: no cover
        return {
            "mode": "error",
            "query": query,
            "summary": f"OpenAI SDK unavailable: {str(e)}",
            "citations": [],
            "sources": [],
        }

    client = OpenAI(api_key=api_key)
    model = os.getenv("OPENAI_WEB_SEARCH_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini"

    # Responses API with built-in web_search tool.
    resp = client.responses.create(
        model=model,
        input=f"Search the web for: {query}\nReturn a concise summary with citations.",
        tools=[
            {
                "type": "web_search",
                # Keep defaults; allow turning off live access in env if desired.
                "external_web_access": os.getenv("OPENAI_WEB_SEARCH_LIVE", "true").lower() != "false",
            }
        ],
    )

    # Normalize output: collect output_text + url_citation annotations.
    text_parts: List[str] = []
    citations: List[Dict[str, Any]] = []
    sources: List[Dict[str, Any]] = []

    for item in getattr(resp, "output", []) or []:
        if getattr(item, "type", None) == "message":
            for c in getattr(item, "content", []) or []:
                if getattr(c, "type", None) == "output_text":
                    text_parts.append(getattr(c, "text", "") or "")
                    for ann in getattr(c, "annotations", []) or []:
                        if getattr(ann, "type", None) == "url_citation":
                            citations.append(
                                {
                                    "url": getattr(ann, "url", None),
                                    "title": getattr(ann, "title", None),
                                    "start_index": getattr(ann, "start_index", None),
                                    "end_index": getattr(ann, "end_index", None),
                                }
                            )

    # Some tool calls expose sources in a dedicated field.
    # Keep best-effort since SDK objects can vary by version.
    if hasattr(resp, "sources") and resp.sources:
        try:
            sources = list(resp.sources)  # type: ignore
        except Exception:
            sources = []

    return {
        "mode": "web_search",
        "query": query,
        "summary": "\n".join([t for t in text_parts if t.strip()]).strip(),
        "citations": citations,
        "sources": sources,
    }


def build_graph():
    """
    Minimal LangGraph wiring to satisfy the plan:
    classify -> plan -> await_plan_approval -> (on approve) execute -> finalize
    """
    if StateGraph is None:
        return None

    class GraphState(BaseModel):
        intent: Intent = "unknown"
        message: str = ""
        latex: str = ""
        plan: List[Dict[str, Any]] = []
        web: Optional[Dict[str, Any]] = None
        proposedLatex: Optional[str] = None

    def node_classify(state: Dict[str, Any]) -> Dict[str, Any]:
        return {"intent": classify_intent(state.get("message", ""))}

    def node_plan(state: Dict[str, Any]) -> Dict[str, Any]:
        intent: Intent = state.get("intent", "unknown")
        msg: str = state.get("message", "")
        # MVP: deterministic checkpoints; later we’ll LLM-generate these.
        checkpoints: List[Dict[str, Any]] = [
            {"id": "scope", "title": "Confirm scope", "status": "pending", "detail": "Summarize what will be created/changed."},
            {"id": "structure", "title": "Outline structure", "status": "pending", "detail": "Sections, number of problems, format."},
            {"id": "latex", "title": "Generate LaTeX", "status": "pending", "detail": "Produce a complete LaTeX document."},
        ]
        if intent == "find_existing_problems":
            checkpoints.insert(
                0,
                {"id": "web_search", "title": "Search for existing problems", "status": "pending", "detail": "Find sources and extract suitable problems."},
            )
        return {"plan": checkpoints, "message": msg}

    def node_execute(state: Dict[str, Any]) -> Dict[str, Any]:
        # MVP: basic LaTeX scaffold; later this becomes LLM-based + checkpointed patches.
        latex = state.get("latex") or state.get("latexContent") or ""
        user_msg = state.get("message", "")
        proposed = latex.strip() or "\\documentclass{article}\n\\begin{document}\n\\section*{Task}\n\n\\end{document}\n"
        if user_msg:
            proposed = proposed.replace("\\section*{Task}", f"\\section*{{Task}}\\n\\textbf{{Request:}} {user_msg}")
        return {"proposedLatex": proposed}

    def node_finalize(state: Dict[str, Any]) -> Dict[str, Any]:
        return state

    g = StateGraph(dict)
    g.add_node("classify", node_classify)
    g.add_node("plan", node_plan)
    g.add_node("execute", node_execute)
    g.add_node("finalize", node_finalize)
    g.set_entry_point("classify")
    g.add_edge("classify", "plan")
    g.add_edge("plan", "execute")
    g.add_edge("execute", "finalize")
    g.add_edge("finalize", END)
    return g.compile()


GRAPH = build_graph()


async def run_start_flow(run: WorkflowRun, message: str, latex: str) -> None:
    emit(run, "classified", {"intent": classify_intent(message)})

    intent = classify_intent(message)
    run.state["intent"] = intent
    run.state["message"] = message
    run.state["latex"] = latex or ""

    # Optional web search step (hybrid flow: still requires plan approval)
    if intent == "find_existing_problems":
        emit(run, "checkpoint_started", {"checkpointId": "web_search", "title": "Web search"})
        web = await openai_web_search(message)
        run.state["web"] = web
        emit(run, "web_search_results", web)
        emit(run, "checkpoint_completed", {"checkpointId": "web_search"})

    # Plan proposal + pause for approval
    plan = [
        {"id": "scope", "title": "Confirm scope", "status": "pending"},
        {"id": "structure", "title": "Outline structure", "status": "pending"},
        {"id": "latex", "title": "Generate LaTeX", "status": "pending"},
    ]
    emit(run, "plan_proposed", {"checkpoints": plan})
    run.state["plan"] = plan
    run.waiting_for = "plan_approval"
    emit(run, "awaiting_approval", {"checkpointId": "plan", "prompt": "Approve or edit the proposed checkpoints."})


async def run_after_approval(run: WorkflowRun, checkpoint_id: str, approved: bool, edits: Optional[Dict[str, Any]]) -> None:
    if run.waiting_for != "plan_approval":
        emit(run, "warning", {"message": "No approval is currently required."})
        return

    if checkpoint_id != "plan":
        emit(run, "warning", {"message": "Only plan approval is supported in this MVP."})
        return

    if not approved:
        emit(run, "cancelled", {"message": "Plan was rejected."})
        run.waiting_for = None
        return

    if edits and isinstance(edits.get("checkpoints"), list):
        run.state["plan"] = edits["checkpoints"]
        emit(run, "plan_updated", {"checkpoints": run.state["plan"]})

    run.waiting_for = None

    # Execute minimal checkpoint flow and propose LaTeX (still require apply in app)
    emit(run, "checkpoint_started", {"checkpointId": "latex", "title": "Generate LaTeX"})
    proposed = "\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amsmath}\n\\begin{document}\n\\section*{Generated Task}\n\n"
    if run.state.get("web") and run.state["web"].get("summary"):
        proposed += "\\subsection*{Sources summary}\n" + run.state["web"]["summary"].replace("\n", "\n\n") + "\n\n"
    proposed += "\\subsection*{Request}\n" + (run.state.get("message") or "") + "\n\n\\end{document}\n"

    run.state["proposedLatex"] = proposed
    emit(run, "latex_proposed", {"assistantMessage": "Drafted LaTeX based on the approved plan.", "updatedLatex": proposed})
    emit(run, "checkpoint_completed", {"checkpointId": "latex"})
    emit(run, "done", {"message": "Workflow completed (proposal ready)."})


async def event_stream(run: WorkflowRun) -> AsyncIterator[Dict[str, str]]:
    # Always send a hello event so the client can correlate immediately.
    yield {"event": "hello", "data": json.dumps({"workflowRunId": run.run_id, "taskId": run.task_id})}
    while True:
        evt = await run.queue.get()
        yield {"event": evt.get("event", "message"), "data": json.dumps(evt)}
        if evt.get("event") in {"done", "cancelled"}:
            break


@app.post("/workflow/start")
async def workflow_start(req: StartRequest):
    run_id = f"wr_{uuid.uuid4().hex}"
    run = WorkflowRun(run_id=run_id, task_id=req.taskId, created_at_ms=now_ms())
    RUNS[run_id] = run

    asyncio.create_task(run_start_flow(run, req.message, req.latexContent or ""))
    return {"workflowRunId": run_id}


@app.post("/workflow/approve")
async def workflow_approve(req: ApproveRequest):
    run = RUNS.get(req.workflowRunId)
    if not run:
        raise HTTPException(status_code=404, detail="workflowRunId not found")

    asyncio.create_task(run_after_approval(run, req.checkpointId, req.approved, req.edits))
    return {"ok": True}


@app.get("/workflow/stream/{workflowRunId}")
async def workflow_stream(workflowRunId: str):
    run = RUNS.get(workflowRunId)
    if not run:
        raise HTTPException(status_code=404, detail="workflowRunId not found")

    return EventSourceResponse(event_stream(run))

