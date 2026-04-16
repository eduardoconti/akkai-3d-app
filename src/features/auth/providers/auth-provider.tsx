import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  AuthContext,
  type AuthContextValue,
} from '@/features/auth/context/auth-context';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  clearTokens,
  getRefreshToken,
  setAccessToken,
  setAuthFailureCallback,
  setRefreshToken,
} from '@/shared/lib/api/token-storage';
import {
  login as loginRequest,
  logout as logoutRequest,
  refresh as refreshRequest,
  updatePassword as updatePasswordRequest,
  updateProfile as updateProfileRequest,
  type AuthResponse,
  type AuthUser,
  type LoginInput,
  type UpdatePasswordInput,
  type UpdateProfileInput,
} from '@/features/auth/api/auth-api';

const AUTH_SNAPSHOT_KEY = 'akkai-auth-snapshot';

interface AuthProviderProps {
  children: ReactNode;
}

function readUserSnapshot(): AuthUser | null {
  const snapshot = window.localStorage.getItem(AUTH_SNAPSHOT_KEY);

  if (!snapshot) {
    return null;
  }

  try {
    return JSON.parse(snapshot) as AuthUser;
  } catch {
    window.localStorage.removeItem(AUTH_SNAPSHOT_KEY);
    return null;
  }
}

function persistUserSnapshot(user: AuthUser | null) {
  if (!user) {
    window.localStorage.removeItem(AUTH_SNAPSHOT_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_SNAPSHOT_KEY, JSON.stringify(user));
}

function extractUser(response: AuthResponse): AuthUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accessToken: _at, refreshToken: _rt, ...user } = response;
  return user;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthFailureCallback(() => {
      setUser(null);
      persistUserSnapshot(null);
      clearTokens();
    });
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const storedRefreshToken = getRefreshToken();

      if (!storedRefreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await refreshRequest(storedRefreshToken);
        setAccessToken(response.accessToken);
        setRefreshToken(response.refreshToken);
        const authUser = extractUser(response);
        setUser(authUser);
        persistUserSnapshot(authUser);
      } catch (error) {
        const problem = getProblemDetailsFromError(error);

        if (problem.status === 0) {
          const snapshot = readUserSnapshot();
          if (snapshot) {
            setUser(snapshot);
          }
        } else {
          clearTokens();
          setUser(null);
          persistUserSnapshot(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrapAuth();
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const response = await loginRequest(input);
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    const authUser = extractUser(response);
    setUser(authUser);
    persistUserSnapshot(authUser);
    return authUser;
  }, []);

  const refresh = useCallback(async () => {
    const storedRefreshToken = getRefreshToken();

    if (!storedRefreshToken) {
      setUser(null);
      persistUserSnapshot(null);
      return null;
    }

    try {
      const response = await refreshRequest(storedRefreshToken);
      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      const authUser = extractUser(response);
      setUser(authUser);
      persistUserSnapshot(authUser);
      return authUser;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (problem.status === 0) {
        const snapshot = readUserSnapshot();
        if (snapshot) {
          setUser(snapshot);
          return snapshot;
        }
      }

      clearTokens();
      setUser(null);
      persistUserSnapshot(null);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const storedRefreshToken = getRefreshToken();
      await logoutRequest(storedRefreshToken ?? undefined);
    } finally {
      clearTokens();
      setUser(null);
      persistUserSnapshot(null);
    }
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const response = await updateProfileRequest(input);

    if (!response.isActive) {
      clearTokens();
      setUser(null);
      persistUserSnapshot(null);
      return response;
    }

    if ('accessToken' in response) {
      const authResponse = response as AuthResponse;
      setAccessToken(authResponse.accessToken);
      setRefreshToken(authResponse.refreshToken);
      const authUser = extractUser(authResponse);
      setUser(authUser);
      persistUserSnapshot(authUser);
      return authUser;
    }

    setUser(response);
    persistUserSnapshot(response);
    return response;
  }, []);

  const updatePassword = useCallback(async (input: UpdatePasswordInput) => {
    await updatePasswordRequest(input);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      updateProfile,
      updatePassword,
      refresh,
      logout,
    }),
    [isLoading, login, logout, refresh, updatePassword, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
