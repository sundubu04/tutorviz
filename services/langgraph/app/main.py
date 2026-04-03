from dotenv import load_dotenv
from fastapi import FastAPI

from app.routes.editor import router as editor_router
from app.routes.workflow import router as workflow_router

load_dotenv()

app = FastAPI(title="Tutorviz LangGraph Service", version="0.2.0")
app.include_router(workflow_router)
app.include_router(editor_router)


@app.get("/")
async def root():
    return {"service": "tutorviz-langgraph", "ok": True}
