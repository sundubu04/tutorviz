/**
 * Parse SSE frames from servers that use CRLF (e.g. sse-starlette) or LF-only line endings.
 */

function indexOfSseEventBoundary(buffer) {
  const crlf = buffer.indexOf('\r\n\r\n');
  const lf = buffer.indexOf('\n\n');
  if (crlf === -1 && lf === -1) return null;
  if (crlf === -1) return { idx: lf, sepLen: 2 };
  if (lf === -1) return { idx: crlf, sepLen: 4 };
  return crlf <= lf ? { idx: crlf, sepLen: 4 } : { idx: lf, sepLen: 2 };
}

function parseSseEventBlock(rawEvent) {
  let evtName = 'message';
  const dataParts = [];
  for (const line of rawEvent.split(/\r\n|\n|\r/)) {
    if (line.length === 0) continue;
    if (line.startsWith('event:')) evtName = line.slice('event:'.length).trim();
    else if (line.startsWith('data:')) {
      const rest = line.slice('data:'.length);
      dataParts.push(rest.startsWith(' ') ? rest.slice(1) : rest);
    }
  }
  return { evtName, dataStr: dataParts.join('\n') };
}

function sseFrameSeparator(sepLen) {
  return sepLen === 4 ? '\r\n\r\n' : '\n\n';
}

module.exports = { indexOfSseEventBoundary, parseSseEventBlock, sseFrameSeparator };
