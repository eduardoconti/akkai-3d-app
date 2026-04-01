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
  logout as logoutRequest,
  me,
  refresh as refreshRequest,
  type AuthUser,
  type LoginInput,
} from '@/features/auth/api/auth-api';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCurrentUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const authenticatedUser = await me();
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch (error) {
      const problem = getProblemDetailsFromError(error);

      if (problem.status === 401) {
        setUser(null);
        return null;
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

  const login = useCallback(
    async (input: LoginInput) => {
      await loginRequest(input);
      const authenticatedUser = await me();
      setUser(authenticatedUser);
      return authenticatedUser;
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      await refreshRequest();
      const authenticatedUser = await me();
      setUser(authenticatedUser);
      return authenticatedUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      refresh,
      logout,
    }),
    [isLoading, login, logout, refresh, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
