const DEFAULT_BASE_URL = process.env.LANGGRAPH_SERVICE_URL || 'http://localhost:8000';

const START_TIMEOUT_MS = Number(process.env.LANGGRAPH_START_TIMEOUT_MS || 180000);
const EDIT_TIMEOUT_MS = Number(process.env.LANGGRAPH_EDIT_TIMEOUT_MS || 180000);

function getBaseUrl() {
  return (process.env.LANGGRAPH_SERVICE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function createTimeoutSignal(ms) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

async function startWorkflow({ taskId, message, latexContent, history }) {
  const { signal, cancel } = createTimeoutSignal(START_TIMEOUT_MS);
  try {
    const res = await fetch(`${getBaseUrl()}/workflow/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, message, latexContent, history: history || undefined }),
      signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`LangGraph start failed: HTTP ${res.status} ${text}`.trim());
    }
    return await res.json();
  } catch (e) {
    if (e && e.name === 'AbortError') {
      throw new Error(`LangGraph start timed out after ${START_TIMEOUT_MS}ms`);
    }
    throw e;
  } finally {
    cancel();
  }
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

async function editLatexViaLanggraph({ taskId, message, latexContent, history }) {
  const { signal, cancel } = createTimeoutSignal(EDIT_TIMEOUT_MS);
  try {
    const res = await fetch(`${getBaseUrl()}/editor/latex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, message, latexContent, history: history || undefined }),
      signal,
    });
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      throw new Error(`LangGraph editor failed: HTTP ${res.status} ${text}`.trim());
    }
    return JSON.parse(text);
  } catch (e) {
    if (e && e.name === 'AbortError') {
      throw new Error(`LangGraph editor timed out after ${EDIT_TIMEOUT_MS}ms`);
    }
    throw e;
  } finally {
    cancel();
  }
}

module.exports = { startWorkflow, streamWorkflow, editLatexViaLanggraph };
