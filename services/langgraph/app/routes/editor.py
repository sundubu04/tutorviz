import logging

from fastapi import APIRouter, HTTPException

from app.schemas import LatexEditRequest
from app.services.task_editor import edit_latex, MAX_LATEX_FOR_PROMPT_CHARS

router = APIRouter(tags=["editor"])
logger = logging.getLogger(__name__)


@router.post("/editor/latex")
async def editor_latex(req: LatexEditRequest):
    try:
        hist = [t.model_dump() for t in req.history] if req.history else None
        out = await edit_latex(
            task_id=req.taskId,
            message=req.message,
            latex_content=req.latexContent,
            history=hist,
        )
        return out
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
    except Exception as e:
        logger.exception("[langgraph-editor] latex edit failed taskId=%s", req.taskId)
        msg = str(e)
        if "too large" in msg.lower() or MAX_LATEX_FOR_PROMPT_CHARS in msg:
            raise HTTPException(status_code=400, detail=msg) from e
        raise HTTPException(status_code=500, detail=msg or "Edit failed") from e
