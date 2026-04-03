export type WorkflowEventEnvelope = {
  type: 'workflow_event';
  event: string;
  workflowRunId: string;
  taskId: string;
  ts: number;
  payload: Record<string, unknown>;
};

export function parseWorkflowEnvelope(content: string): WorkflowEventEnvelope | null {
  if (!content || typeof content !== 'string') return null;
  if (!content.trim().startsWith('{')) return null;
  try {
    const obj = JSON.parse(content) as unknown;
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    const o = obj as Record<string, unknown>;
    if (o.type !== 'workflow_event' || typeof o.event !== 'string') return null;

    let payload: Record<string, unknown> = {};
    const rawPayload = o.payload;
    if (rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
      payload = rawPayload as Record<string, unknown>;
    }

    return {
      type: 'workflow_event',
      event: o.event,
      workflowRunId: typeof o.workflowRunId === 'string' ? o.workflowRunId : '',
      taskId: typeof o.taskId === 'string' ? o.taskId : '',
      ts: typeof o.ts === 'number' ? o.ts : 0,
      payload,
    };
  } catch {
    return null;
  }
}

/** sse-starlette uses CRLF between SSE fields; `\n\n` alone may not delimit events. */
export function indexOfSseBoundary(buf: string): { idx: number; sepLen: number } | null {
  const crlf = buf.indexOf('\r\n\r\n');
  const lf = buf.indexOf('\n\n');
  if (crlf === -1 && lf === -1) return null;
  if (crlf === -1) return { idx: lf, sepLen: 2 };
  if (lf === -1) return { idx: crlf, sepLen: 4 };
  return crlf <= lf ? { idx: crlf, sepLen: 4 } : { idx: lf, sepLen: 2 };
}

export function parseSseBlock(raw: string): { eventName: string; data: string } {
  let eventName = 'message';
  const dataParts: string[] = [];
  for (const line of raw.split(/\r\n|\n|\r/)) {
    if (!line.length) continue;
    if (line.startsWith('event:')) eventName = line.slice('event:'.length).trim();
    else if (line.startsWith('data:')) {
      const rest = line.slice('data:'.length);
      dataParts.push(rest.startsWith(' ') ? rest.slice(1) : rest);
    }
  }
  return { eventName, data: dataParts.join('\n') };
}
