import { httpClient } from '@/shared/lib/api/http-client';

export interface AuthUser {
  id: number;
  name: string;
  login: string;
  isActive: boolean;
  roleId: number;
  role: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse extends AuthUser {
  accessToken: string;
  refreshToken: string;
}

export interface LoginInput {
  login: string;
  password: string;
}

export interface AuthRole {
  id: number;
  name: string;
  description?: string;
}

export interface UpdateProfileInput {
  name: string;
  login: string;
  isActive: boolean;
  roleId: number;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return httpClient.post<AuthResponse>('/auth/login', input);
}

export function refresh(refreshToken: string): Promise<AuthResponse> {
  return httpClient.post<AuthResponse>('/auth/refresh', { refreshToken });
}

export function logout(refreshToken?: string): Promise<void> {
  return httpClient.post<void>('/auth/logout', { refreshToken });
}

export function me(): Promise<AuthUser> {
  return httpClient.get<AuthUser>('/auth/me');
}

export function listRoles(): Promise<AuthRole[]> {
  return httpClient.get<AuthRole[]>('/auth/roles');
}

export function updateProfile(
  input: UpdateProfileInput,
): Promise<AuthResponse | AuthUser> {
  return httpClient.put<AuthResponse | AuthUser>('/auth/me', input);
}

export function updatePassword(input: UpdatePasswordInput): Promise<void> {
  return httpClient.put<void>('/auth/me/password', input);
}
