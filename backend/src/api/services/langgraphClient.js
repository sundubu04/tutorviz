const DEFAULT_BASE_URL = process.env.LANGGRAPH_SERVICE_URL || 'http://localhost:8000';

function getBaseUrl() {
  return (process.env.LANGGRAPH_SERVICE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

async function startWorkflow({ taskId, message, latexContent }) {
  const res = await fetch(`${getBaseUrl()}/workflow/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, message, latexContent }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LangGraph start failed: HTTP ${res.status} ${text}`.trim());
  }
  return await res.json();
}

async function approveWorkflow({ workflowRunId, checkpointId, approved, edits }) {
  const res = await fetch(`${getBaseUrl()}/workflow/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflowRunId, checkpointId, approved, edits }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`LangGraph approve failed: HTTP ${res.status} ${text}`.trim());
  }
  return await res.json();
}

async function streamWorkflow({ workflowRunId, signal }) {
  const res = await fetch(`${getBaseUrl()}/workflow/stream/${workflowRunId}`, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    },
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`LangGraph stream failed: HTTP ${res.status} ${text}`.trim());
  }

  return res;
}

module.exports = { startWorkflow, approveWorkflow, streamWorkflow };

