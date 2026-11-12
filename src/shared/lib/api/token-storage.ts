const REFRESH_TOKEN_KEY = 'akkai-refresh-token';
export const AUTH_SNAPSHOT_KEY = 'akkai-auth-snapshot';

let _accessToken: string | null = null;
let _onAuthFailure: (() => void) | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearTokens(): void {
  _accessToken = null;
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function setAuthFailureCallback(callback: () => void): void {
  _onAuthFailure = callback;
}

export function notifyAuthFailure(): void {
  _onAuthFailure?.();
}

/** Id do usuário da sessão atual, lido do snapshot salvo (funciona offline). */
export function getStoredUserId(): number | null {
  try {
    const snapshot = localStorage.getItem(AUTH_SNAPSHOT_KEY);
    const id = snapshot ? (JSON.parse(snapshot) as { id?: unknown }).id : null;

    return typeof id === 'number' ? id : null;
  } catch {
    return null;
  }
}
