import asyncio
import logging
from typing import Any, Dict, List, Optional

from app.runs.store import WorkflowRun, emit
from app.workflow.graph import COMPILED_GRAPH

logger = logging.getLogger(__name__)


async def run_start_flow(
    run: WorkflowRun,
    message: str,
    latex: str,
    history: Optional[List[Dict[str, Any]]] = None,
) -> None:
    logger.debug("run_start_flow begin run_id=%s", run.run_id)
    if COMPILED_GRAPH is None:
        emit(run, "error", {"message": "LangGraph workflow is not available."})
        emit(run, "done", {})
        return

    emit(
        run,
        "received",
        {"taskId": run.task_id, "messageChars": len(message), "latexChars": len(latex or "")},
    )

    config: Dict[str, Any] = {"configurable": {"thread_id": run.run_id}}
    initial: Dict[str, Any] = {
        "taskId": run.task_id,
        "message": message,
        "latex": latex or "",
        "history": list(history or []),
    }

    try:
        emit(run, "processing", {"step": "edit_latex"})
        final = await COMPILED_GRAPH.ainvoke(initial, config)
        assistant = final.get("assistantMessage") if isinstance(final, dict) else None
        updated = final.get("updatedLatex") if isinstance(final, dict) else None
        if isinstance(assistant, str) and isinstance(updated, str):
            emit(
                run,
                "latex_proposed",
                {"assistantMessage": assistant, "updatedLatex": updated},
            )
        else:
            emit(run, "error", {"message": "Model did not return LaTeX output"})
    except asyncio.CancelledError:
        raise
    except Exception as e:
        logger.exception("run_start_flow error run_id=%s", run.run_id)
        emit(run, "error", {"message": str(e)})
    finally:
        emit(run, "done", {})
        logger.debug("run_start_flow finished run_id=%s", run.run_id)
