/**
 * ApiClient auth / token resolution (runs from repo `tests/` only — not via frontend Jest).
 * Run: cd tests && npm install && npm run test:api-client
 */
import { describe, test, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

function installLocalStorage(): void {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem(k: string) {
      return store.has(k) ? store.get(k)! : null;
    },
    setItem(k: string, v: string) {
      store.set(k, v);
    },
    removeItem(k: string) {
      store.delete(k);
    },
    clear() {
      store.clear();
    },
    key() {
      return null;
    },
    get length() {
      return store.size;
    },
  } as Storage;
}

function authFromFetchCall(
  calls: Array<[string, RequestInit | undefined]>,
  index: number
): string | null {
  const init = calls[index]?.[1] ?? {};
  const headers = init.headers as Headers;
  return headers.get('Authorization');
}

let ApiClient: typeof import('../../frontend/src/utils/apiClient').default;

describe('ApiClient Supabase-backed auth', () => {
  let originalFetch: typeof fetch;

  before(async () => {
    installLocalStorage();
    const mod = await import('../../frontend/src/utils/apiClient');
    ApiClient = mod.default;
  });

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    installLocalStorage();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    globalThis.localStorage.clear();
  });

  test('fetchWithAuth uses the latest token from getAccessTokenGetter on each call', async () => {
    let accessToken = 'jwt-v1';
    const client = new ApiClient('http://api.test');
    client.setAccessTokenGetter(() => Promise.resolve(accessToken));

    const calls: Array<[string, RequestInit | undefined]> = [];
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push([String(url), init]);
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    await client.fetchWithAuth('http://api.test/tasks', { method: 'GET' });
    assert.equal(authFromFetchCall(calls, 0), 'Bearer jwt-v1');

    accessToken = 'jwt-v2-refreshed';
    await client.fetchWithAuth('http://api.test/tasks', { method: 'GET' });
    assert.equal(authFromFetchCall(calls, 1), 'Bearer jwt-v2-refreshed');
  });

  test('fetchWithAuth omits Authorization after logout even if getter would return a token', async () => {
    const client = new ApiClient('http://api.test');
    client.setAccessTokenGetter(() => Promise.resolve('still-in-supabase-storage'));

    const calls: Array<[string, RequestInit | undefined]> = [];
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push([String(url), init]);
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    await client.logout();
    await client.fetchWithAuth('http://api.test/tasks', { method: 'GET' });

    assert.equal(authFromFetchCall(calls, 0), null);
  });

  test('fetchWithAuth falls back to setToken mirror when no getter is set', async () => {
    const client = new ApiClient('http://api.test');
    client.setToken('mirror-only');

    const calls: Array<[string, RequestInit | undefined]> = [];
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push([String(url), init]);
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    await client.fetchWithAuth('http://api.test/x', { method: 'GET' });
    assert.equal(authFromFetchCall(calls, 0), 'Bearer mirror-only');
  });

  test('getter takes precedence over stale mirror token', async () => {
    const client = new ApiClient('http://api.test');
    client.setToken('stale-mirror');
    client.setAccessTokenGetter(() => Promise.resolve('from-session'));

    const calls: Array<[string, RequestInit | undefined]> = [];
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push([String(url), init]);
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    await client.fetchWithAuth('http://api.test/x', { method: 'GET' });
    assert.equal(authFromFetchCall(calls, 0), 'Bearer from-session');
  });
});
