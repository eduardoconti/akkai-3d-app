import { isProblemDetails, type ProblemDetails } from '../types/problem-details';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const fallbackProblems = {
  network: {
    type: 'about:blank',
    title: 'Network Error',
    status: 0,
    detail: 'Não foi possível se comunicar com a API.',
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
    detail: 'A solicitação não pôde ser processada.',
    instance,
  };
}

async function request<T>(
  path: string,
  init?: RequestInit,
  hasRetried = false,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch {
    throw new ApiProblemError(fallbackProblems.network);
  }

  if (
    response.status === 401 &&
    !hasRetried &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/refresh')
  ) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (refreshResponse.ok) {
        return request<T>(path, init, true);
      }
    } catch {
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

function buildQueryString(query?: object): string {
  if (!query) {
    return '';
  }

  const searchParams = new URLSearchParams();

  Object.entries(query as Record<string, unknown>).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === '' ||
      (typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean')
    ) {
      return;
    }

    searchParams.set(key, String(value));
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
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};
