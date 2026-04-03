import json
import os
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI

MAX_LATEX_FOR_PROMPT_CHARS = 150_000


def _extract_json_object(text: str) -> Dict[str, Any]:
    first = text.find("{")
    last = text.rfind("}")
    if first == -1 or last == -1 or last <= first:
        raise ValueError("Model did not return a JSON object")
    return json.loads(text[first : last + 1])


def _model_id() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")


async def edit_latex(
    *,
    task_id: str,
    message: str,
    latex_content: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, str]:
    if not task_id or not task_id.strip():
        raise ValueError("taskId is required")
    if not message or not str(message).strip():
        raise ValueError("message must be a non-empty string")
    if not latex_content or not str(latex_content).strip():
        raise ValueError("latexContent must be a non-empty string")
    latex = latex_content.strip()
    if len(latex) > MAX_LATEX_FOR_PROMPT_CHARS:
        raise ValueError(f"latexContent is too large (max {MAX_LATEX_FOR_PROMPT_CHARS} chars)")

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    client = AsyncOpenAI(api_key=api_key)
    model = _model_id()

    system_prompt = (
        "You are an AI assistant that edits a full LaTeX document for a specific task.\n"
        "You are given:\n"
        "- taskId (string)\n"
        "- currentLatex (the entire LaTeX source document)\n"
        "- userRequest (what the user wants changed)\n\n"
        "Return ONLY a single valid JSON object with exactly these keys:\n"
        "- assistantMessage: a short user-facing explanation of what you changed\n"
        "- updatedLatex: the full updated LaTeX source document\n\n"
        "Rules:\n"
        "- Do not return markdown. Do not include code fences.\n"
        "- updatedLatex must be complete LaTeX source (not a diff).\n"
        "- Preserve the document structure unless the user requests otherwise."
    )

    hist_msgs: List[Dict[str, str]] = []
    if history:
        for m in history[-10:]:
            if not isinstance(m, dict):
                continue
            c = m.get("content")
            if not isinstance(c, str):
                continue
            role = m.get("role")
            r = "assistant" if role == "assistant" else "user"
            hist_msgs.append({"role": r, "content": c})

    user_prompt = "\n".join(
        [
            f"taskId: {task_id}",
            "",
            "currentLatex:",
            latex,
            "",
            f"userRequest: {message.strip()}",
        ]
    )

    completion = await client.chat.completions.create(
        model=model,
        temperature=0,
        messages=[
            {"role": "system", "content": system_prompt},
            *hist_msgs,
            {"role": "user", "content": user_prompt},
        ],
    )
    content = completion.choices[0].message.content or ""
    parsed = _extract_json_object(content)
    am = parsed.get("assistantMessage")
    ul = parsed.get("updatedLatex")
    if not isinstance(am, str) or not isinstance(ul, str):
        raise ValueError("Returned JSON did not include assistantMessage and updatedLatex strings")
    return {"assistantMessage": am[:2000], "updatedLatex": ul}
