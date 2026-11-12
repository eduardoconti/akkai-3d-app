import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getProblemDetailsFromError,
  httpClient,
  setNetworkActivityListener,
} from './http-client';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setAuthFailureCallback,
  setRefreshToken,
} from './token-storage';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken(null);
  setRefreshToken('refresh-1');
  setAuthFailureCallback(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  setNetworkActivityListener(null);
  setRefreshToken(null);
});

describe('timeout das requisições', () => {
  it('trata uma conexão pendurada como falta de conexão (status 0)', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('abortado', 'AbortError')),
          );
        }),
    );

    const request = httpClient
      .post('/venda', {}, { timeoutMs: 15_000 })
      .catch((error: unknown) => getProblemDetailsFromError(error));
    await vi.advanceTimersByTimeAsync(15_000);

    expect(await request).toMatchObject({ status: 0 });
  });
});

describe('atividade de rede', () => {
  it('avisa quando a API responde e quando a requisição falha', async () => {
    const listener = vi.fn();
    setNetworkActivityListener(listener);

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await httpClient.get('/a');
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await httpClient.get('/b').catch(() => undefined);

    expect(listener.mock.calls).toEqual([[true], [false]]);
  });
});

describe('renovação da sessão', () => {
  it('renova o token e repete a requisição original', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: 'expirado' }, 401))
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: 'novo', refreshToken: 'refresh-2' }),
      )
      .mockResolvedValueOnce(jsonResponse({ dado: 1 }));

    const result = await httpClient.get('/produto');

    expect(result).toEqual({ dado: 1 });
    expect(getAccessToken()).toBe('novo');
    expect(getRefreshToken()).toBe('refresh-2');
    expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({
      Authorization: 'Bearer novo',
    });
  });

  it('mantém a sessão quando a renovação falha por falta de conexão', async () => {
    const onAuthFailure = vi.fn();
    setAuthFailureCallback(onAuthFailure);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: 'expirado' }, 401))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const problem = await httpClient
      .get('/produto')
      .catch((error: unknown) => getProblemDetailsFromError(error));

    expect(problem).toMatchObject({ status: 0 });
    expect(getRefreshToken()).toBe('refresh-1');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('mantém a sessão quando o servidor está indisponível na renovação', async () => {
    const onAuthFailure = vi.fn();
    setAuthFailureCallback(onAuthFailure);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: 'expirado' }, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: 'fora do ar' }, 503));

    const problem = await httpClient
      .get('/produto')
      .catch((error: unknown) => getProblemDetailsFromError(error));

    expect(problem).toMatchObject({ status: 0 });
    expect(getRefreshToken()).toBe('refresh-1');
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it('encerra a sessão quando o servidor recusa o refresh token', async () => {
    const onAuthFailure = vi.fn();
    setAuthFailureCallback(onAuthFailure);
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ detail: 'expirado' }, 401))
      .mockResolvedValueOnce(jsonResponse({ detail: 'inválido' }, 401));

    const problem = await httpClient
      .get('/produto')
      .catch((error: unknown) => getProblemDetailsFromError(error));

    expect(problem).toMatchObject({ status: 401 });
    expect(getRefreshToken()).toBeNull();
    expect(onAuthFailure).toHaveBeenCalledTimes(1);
  });

  it('faz uma única renovação para requisições simultâneas', async () => {
    fetchMock.mockImplementation(async (url) => {
      const path = String(url);

      if (path.endsWith('/auth/refresh')) {
        return jsonResponse({ accessToken: 'novo', refreshToken: 'refresh-2' });
      }

      return getAccessToken() === 'novo'
        ? jsonResponse({ ok: true })
        : jsonResponse({ detail: 'expirado' }, 401);
    });

    await Promise.all([httpClient.get('/a'), httpClient.get('/b')]);

    const refreshCalls = fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
  });
});
