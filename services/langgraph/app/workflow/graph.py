from typing import List, TypedDict

from langgraph.graph import END, StateGraph

from app.services.task_editor import edit_latex


class EditState(TypedDict, total=False):
    taskId: str
    message: str
    latex: str
    history: List[dict]
    assistantMessage: str
    updatedLatex: str


async def node_edit_latex(state: EditState) -> EditState:
    tid = state.get("taskId") or ""
    msg = state.get("message") or ""
    latex = state.get("latex") or ""
    history = state.get("history") or []
    result = await edit_latex(
        task_id=tid,
        message=msg,
        latex_content=latex,
        history=list(history) if history else None,
    )
    return {
        "assistantMessage": result["assistantMessage"],
        "updatedLatex": result["updatedLatex"],
    }


def build_compiled_graph():
    g = StateGraph(EditState)
    g.add_node("edit", node_edit_latex)
    g.set_entry_point("edit")
    g.add_edge("edit", END)
    return g.compile()


try:
    COMPILED_GRAPH = build_compiled_graph()
except Exception:  # pragma: no cover
    COMPILED_GRAPH = None  # type: ignore[misc, assignment]
