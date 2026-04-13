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
  login as loginRequest,
  updatePassword as updatePasswordRequest,
  updateProfile as updateProfileRequest,
  logout as logoutRequest,
  me,
  refresh as refreshRequest,
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCurrentUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const authenticatedUser = await me();
      setUser(authenticatedUser);
      persistUserSnapshot(authenticatedUser);
      return authenticatedUser;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (problem.status === 401) {
        setUser(null);
        persistUserSnapshot(null);
        return null;
      }

      if (problem.status === 0) {
        const snapshot = readUserSnapshot();

        if (snapshot) {
          setUser(snapshot);
          return snapshot;
        }
      }

      throw error;
    }
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        await loadCurrentUser();
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrapAuth();
  }, [loadCurrentUser]);

  const login = useCallback(async (input: LoginInput) => {
    await loginRequest(input);
    const authenticatedUser = await me();
    setUser(authenticatedUser);
    persistUserSnapshot(authenticatedUser);
    return authenticatedUser;
  }, []);

  const refresh = useCallback(async () => {
    try {
      await refreshRequest();
      const authenticatedUser = await me();
      setUser(authenticatedUser);
      persistUserSnapshot(authenticatedUser);
      return authenticatedUser;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (problem.status === 0) {
        const snapshot = readUserSnapshot();

        if (snapshot) {
          setUser(snapshot);
          return snapshot;
        }
      }

      setUser(null);
      persistUserSnapshot(null);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
      persistUserSnapshot(null);
    }
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const authenticatedUser = await updateProfileRequest(input);

    if (!authenticatedUser.isActive) {
      setUser(null);
      persistUserSnapshot(null);
      return authenticatedUser;
    }

    setUser(authenticatedUser);
    persistUserSnapshot(authenticatedUser);
    return authenticatedUser;
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
