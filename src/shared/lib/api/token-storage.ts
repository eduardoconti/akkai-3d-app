const REFRESH_TOKEN_KEY = 'akkai-refresh-token';

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
