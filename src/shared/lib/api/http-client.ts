import {
  isProblemDetails,
  type ProblemDetails,
} from '../types/problem-details';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  notifyAuthFailure,
  setAccessToken,
  setRefreshToken,
} from './token-storage';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

const fallbackProblems = {
  network: {
    type: 'about:blank',
    title: 'Network Error',
    status: 0,
    detail:
      'Sem conexão com o servidor. Verifique a internet e tente novamente.',
    instance: '',
  },
  unknown: {
    type: 'about:blank',
    title: 'Unexpected Error',
    status: 500,
    detail: 'Ocorreu um erro inesperado ao processar a solicitação.',
    instance: '',
  },
};

export class ApiProblemError extends Error {
  problem: ProblemDetails;

  constructor(problem: ProblemDetails) {
    super(problem.detail);
    this.name = 'ApiProblemError';
    this.problem = problem;
  }
}

const REQUEST_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const HEALTH_TIMEOUT_MS = 5_000;

type NetworkActivityListener = (reachable: boolean) => void;

let networkActivityListener: NetworkActivityListener | null = null;

/**
 * Informa a cada resposta (ou falha de rede) se a API está alcançável, para que
 * o indicador de conexão reaja sem esperar a próxima verificação periódica.
 */
export function setNetworkActivityListener(
  listener: NetworkActivityListener | null,
): void {
  networkActivityListener = listener;
}

/**
 * `fetch` com limite de tempo: em sinal fraco a conexão pode ficar pendurada
 * sem nunca falhar, e o usuário ficaria preso esperando a resposta.
 */
async function fetchWithTimeout(
  input: string,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = init?.signal;
  const abortFromExternal = () => controller.abort();

  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener('abort', abortFromExternal);
  }

  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    networkActivityListener?.(true);
    return response;
  } catch (error) {
    if (!externalSignal?.aborted) {
      networkActivityListener?.(false);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abortFromExternal);
  }
}

type RefreshOutcome = 'ok' | 'rejected' | 'unreachable' | 'none';

let refreshRequestPromise: Promise<RefreshOutcome> | null = null;

/**
 * Renova a sessão uma única vez para todas as requisições concorrentes. Só
 * encerra a sessão quando o servidor recusa o refresh token: falha de rede ou
 * servidor fora do ar mantém os tokens, senão uma queda de sinal deslogaria o
 * usuário e travaria as vendas offline que ainda precisam ser sincronizadas.
 */
function refreshSession(): Promise<RefreshOutcome> {
  const storedRefreshToken = getRefreshToken();

  if (!storedRefreshToken) {
    return Promise.resolve('none');
  }

  if (!refreshRequestPromise) {
    refreshRequestPromise = (async (): Promise<RefreshOutcome> => {
      try {
        const refreshResponse = await fetchWithTimeout(
          `${API_BASE_URL}/auth/refresh`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken }),
          },
          REQUEST_TIMEOUT_MS,
        );

        if (refreshResponse.ok) {
          const data = (await refreshResponse.json()) as {
            accessToken: string;
            refreshToken: string;
          };
          setAccessToken(data.accessToken);
          setRefreshToken(data.refreshToken);
          return 'ok';
        }

        if (
          refreshResponse.status >= 500 ||
          refreshResponse.status === 408 ||
          refreshResponse.status === 429
        ) {
          return 'unreachable';
        }

        clearTokens();
        notifyAuthFailure();
        return 'rejected';
      } catch {
        return 'unreachable';
      } finally {
        refreshRequestPromise = null;
      }
    })();
  }

  return refreshRequestPromise;
}

async function parseResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';

  if (response.status === 204) {
    return null;
  }

  if (contentType.includes('application/problem+json')) {
    return response.json() as Promise<unknown>;
  }

  if (contentType.includes('application/json')) {
    return response.json() as Promise<unknown>;
  }

  return response.text();
}

function friendlyDetailForStatus(status: number): string {
  if (status === 403) {
    return 'Você não tem permissão para realizar esta ação.';
  }

  if (status === 404) {
    return 'O registro solicitado não foi encontrado.';
  }

  if (status === 429) {
    return 'Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.';
  }

  if (status >= 500) {
    return 'O servidor encontrou um problema. Tente novamente em instantes.';
  }

  return 'A solicitação não pôde ser processada.';
}

function buildProblemFromResponse(
  status: number,
  instance: string,
  body: unknown,
): ProblemDetails {
  if (isProblemDetails(body)) {
    return body;
  }

  if (typeof body === 'string' && body.length > 0) {
    return {
      type: 'about:blank',
      title: 'Request Error',
      status,
      detail: body,
      instance,
    };
  }

  return {
    type: 'about:blank',
    title: 'Request Error',
    status,
    detail: friendlyDetailForStatus(status),
    instance,
  };
}

export async function checkApiConnectivity(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/health`,
      { method: 'GET' },
      HEALTH_TIMEOUT_MS,
    );

    return response.ok;
  } catch {
    return false;
  }
}

interface RequestOptions {
  timeoutMs?: number;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  hasRetried = false,
  options?: RequestOptions,
): Promise<T> {
  let response: Response;

  const accessToken = getAccessToken();

  try {
    response = await fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...(init?.headers ?? {}),
        },
        ...init,
      },
      options?.timeoutMs ?? REQUEST_TIMEOUT_MS,
    );
  } catch {
    throw new ApiProblemError(fallbackProblems.network);
  }

  if (
    response.status === 401 &&
    !hasRetried &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/refresh')
  ) {
    const outcome = await refreshSession();

    if (outcome === 'ok') {
      return request<T>(path, init, true, options);
    }

    if (outcome === 'unreachable') {
      throw new ApiProblemError(fallbackProblems.network);
    }
  }

  const body = await parseResponse(response);

  if (!response.ok) {
    throw new ApiProblemError(
      buildProblemFromResponse(response.status, path, body),
    );
  }

  return body as T;
}

async function download(
  path: string,
  hasRetried = false,
): Promise<{ blob: Blob; filename: string }> {
  let response: Response;
  const accessToken = getAccessToken();

  try {
    response = await fetchWithTimeout(
      `${API_BASE_URL}${path}`,
      {
        method: 'GET',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      },
      DOWNLOAD_TIMEOUT_MS,
    );
  } catch {
    throw new ApiProblemError(fallbackProblems.network);
  }

  if (response.status === 401 && !hasRetried) {
    const outcome = await refreshSession();

    if (outcome === 'ok') {
      return download(path, true);
    }

    if (outcome === 'unreachable') {
      throw new ApiProblemError(fallbackProblems.network);
    }
  }

  if (!response.ok) {
    const body = await parseResponse(response);
    throw new ApiProblemError(
      buildProblemFromResponse(response.status, path, body),
    );
  }

  return {
    blob: await response.blob(),
    filename: obterNomeArquivo(response) ?? 'download.pdf',
  };
}

function obterNomeArquivo(response: Response): string | null {
  const contentDisposition = response.headers.get('content-disposition');
  const match = contentDisposition?.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? null;
}

function buildQueryString(query?: object): string {
  if (!query) {
    return '';
  }

  const searchParams = new URLSearchParams();

  Object.entries(query as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return;
      }

      searchParams.set(
        key,
        value
          .filter(
            (item) =>
              typeof item === 'string' ||
              typeof item === 'number' ||
              typeof item === 'boolean',
          )
          .map((item) => String(item))
          .join(','),
      );
      return;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export function getProblemDetailsFromError(error: unknown): ProblemDetails {
  if (error instanceof ApiProblemError) {
    return error.problem;
  }

  return fallbackProblems.unknown;
}

export const httpClient = {
  get: <T>(path: string, query?: object) =>
    request<T>(`${path}${buildQueryString(query)}`),
  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(
      path,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      false,
      options,
    ),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
  download,
};
