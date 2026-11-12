import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/use-auth';

interface RequirePermissionProps {
  permission: string;
  children: ReactNode;
}

/** Só renderiza a tela para quem possui a permissão; os demais voltam ao início. */
export default function RequirePermission({
  permission,
  children,
}: RequirePermissionProps) {
  const { user } = useAuth();

  if (!user?.permissions.includes(permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
