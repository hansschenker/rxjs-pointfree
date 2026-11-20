import { afterEach, describe, expect, it, vi } from 'vitest';
import { lastValueFrom, Subject, switchMap } from 'rxjs';
import { loginAt } from '../src/auth.js';
import type { Credentials, LoginResponse } from '../src/auth.js';

const endpoint = 'https://example.invalid/login';
const credentials: Credentials = { username: 'reader', password: 'test-only' };
const reply = () => new Response(JSON.stringify({ token: 'test-token' }), {
  headers: { 'Content-Type': 'application/json' },
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('loginAt: a configured, lazy and cancellable effect', () => {
  it('sends no request during construction and sends JSON only on subscription', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(reply());
    vi.stubGlobal('fetch', fetchMock);
    const request$ = loginAt(endpoint)(credentials);
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(lastValueFrom(request$)).resolves.toEqual({ token: 'test-token' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(endpoint);
    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('starts a fresh unshared request on each subscription', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => reply());
    vi.stubGlobal('fetch', fetchMock);
    const request$ = loginAt(endpoint)(credentials);
    await lastValueFrom(request$);
    await lastValueFrom(request$);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).not.toBe(fetchMock.mock.calls[1]?.[1]?.signal);
  });

  it('aborts an in-flight request when its subscription closes', () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);
    const received: LoginResponse[] = [];
    const subscription = loginAt(endpoint)(credentials).subscribe((value) => received.push(value));
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    expect(signal?.aborted).toBe(false);
    subscription.unsubscribe();
    expect(signal?.aborted).toBe(true);
    expect(received).toEqual([]);
  });

  it('retains abort coverage while the response body is being read', async () => {
    const response = reply();
    const readBody = vi.spyOn(response, 'json').mockImplementation(() => new Promise<unknown>(() => {}));
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock);
    const subscription = loginAt(endpoint)(credentials).subscribe();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(readBody).toHaveBeenCalledOnce();
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    expect(signal?.aborted).toBe(false);
    subscription.unsubscribe();
    expect(signal?.aborted).toBe(true);
  });

  it('turns HTTP error responses into stream errors', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('denied', { status: 401 })));
    await expect(lastValueFrom(loginAt(endpoint)(credentials))).rejects.toThrow('HTTP 401');
  });

  it('rejects an unexpected JSON shape instead of asserting a token exists', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{"token":42}')));
    await expect(lastValueFrom(loginAt(endpoint)(credentials))).rejects.toThrow('string token');
  });

  it('propagates transport failures', async () => {
    const failure = new Error('connection failed');
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(failure));
    await expect(lastValueFrom(loginAt(endpoint)(credentials))).rejects.toBe(failure);
  });

  it('lets switchMap cancel the old attempt and accept the latest reply', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockImplementationOnce(() => new Promise<Response>(() => {}))
      .mockResolvedValueOnce(reply());
    vi.stubGlobal('fetch', fetchMock);
    const attempts$ = new Subject<Credentials>(); // Explicitly live input in this test.
    const result = lastValueFrom(attempts$.pipe(switchMap(loginAt(endpoint))));
    attempts$.next({ username: 'old', password: 'test-only' });
    const oldSignal = fetchMock.mock.calls[0]?.[1]?.signal;
    attempts$.next(credentials);
    attempts$.complete();
    expect(oldSignal?.aborted).toBe(true);
    await expect(result).resolves.toEqual({ token: 'test-token' });
  });
});
