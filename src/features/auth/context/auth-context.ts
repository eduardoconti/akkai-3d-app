import { createContext } from 'react';
import type {
  AuthUser,
  LoginInput,
  UpdatePasswordInput,
  UpdateProfileInput,
} from '@/features/auth/api/auth-api';

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  updateProfile: (input: UpdateProfileInput) => Promise<AuthUser>;
  updatePassword: (input: UpdatePasswordInput) => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
