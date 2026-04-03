#!/usr/bin/env python3
"""Exercise POST /workflow/start + GET /workflow/stream (in-process via Starlette TestClient).

Loads OPENAI_API_KEY from repo-root `.env`.
`httpx.ASGITransport` streaming does not reliably yield SSE chunks here; TestClient does.

Usage:
  cd services/langgraph && .venv/bin/python scripts/test_workflow_api.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from dotenv import load_dotenv
from starlette.testclient import TestClient

# scripts/ -> langgraph -> services -> repo root
REPO = Path(__file__).resolve().parents[3]
load_dotenv(REPO / ".env")


def main() -> int:
    lg_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(lg_root))
    from app.main import app

    with TestClient(app) as client:
        h = client.get("/health")
        h.raise_for_status()
        print("health:", h.json())

        body = {
            "taskId": "00000000-0000-4000-8000-000000000001",
            "message": "Add one short sentence to the introduction noting this is an API test.",
            "latexContent": (
                "\\documentclass{article}\n"
                "\\begin{document}\n"
                "\\section{Introduction}\n"
                "Hello.\n"
                "\\end{document}\n"
            ),
        }

        r = client.post("/workflow/start", json=body)
        r.raise_for_status()
        start = r.json()
        print("start:", start)
        run_id = start.get("workflowRunId")
        if not run_id:
            print("FAIL: missing workflowRunId")
            return 1

        events: list[str] = []
        cur_event: str | None = None

        with client.stream(
            "GET",
            f"/workflow/stream/{run_id}",
            headers={"Accept": "text/event-stream", "Cache-Control": "no-cache"},
        ) as stream:
            stream.raise_for_status()
            for raw in stream.iter_lines():
                if raw is None:
                    continue
                line = raw.decode("utf-8") if isinstance(raw, (bytes, bytearray)) else raw
                line = line.rstrip("\r")
                if line == "":
                    continue
                if line.startswith("event:"):
                    cur_event = line[6:].strip()
                elif line.startswith("data:"):
                    data_str = line[5:].lstrip()
                    try:
                        payload = json.loads(data_str)
                    except json.JSONDecodeError:
                        print("sse (non-json):", cur_event, data_str[:120])
                        continue
                    if isinstance(payload, dict) and payload.get("type") == "workflow_event":
                        label = str(payload.get("event") or cur_event or "message")
                    else:
                        label = cur_event or "message"
                    events.append(label)
                    preview = data_str[:120].replace("\n", " ")
                    print("sse:", label, preview + ("…" if len(data_str) > 120 else ""))

        if "latex_proposed" not in events and "error" not in events:
            print("FAIL: expected latex_proposed or error in stream, got:", events)
            return 1
        print("OK events:", events)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
