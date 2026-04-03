from typing import List, Optional

from pydantic import BaseModel, Field


class ChatTurn(BaseModel):
    role: str
    content: str


class StartRequest(BaseModel):
    taskId: str
    message: str = Field(min_length=1)
    latexContent: Optional[str] = None
    history: Optional[List[ChatTurn]] = None


class LatexEditRequest(BaseModel):
    taskId: str
    message: str = Field(min_length=1)
    latexContent: str = Field(min_length=1)
    history: Optional[List[ChatTurn]] = None
