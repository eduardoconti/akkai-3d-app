import { useCallback, useEffect, useState } from 'react';
import { Alert, Stack, Tab, Tabs } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, getProblemDetailsFromError } from '@/shared';
import {
  listAdminUsers,
  listAvailablePermissions,
  listRolesWithPermissions,
  type AdminUser,
  type AvailablePermission,
  type RoleWithPermissions,
} from '@/features/auth/api/permissions-admin-api';
import RolesPanel from '@/features/auth/components/roles-panel';
import UsersPermissionsPanel from '@/features/auth/components/users-permissions-panel';
import { PERMISSAO_ADMINISTRAR_PAPEL } from '@/features/auth/constants/permissions';
import { useAuth } from '@/features/auth/hooks/use-auth';

type TabId = 'usuarios' | 'papeis';

export default function UserPermissionsPage() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [permissions, setPermissions] = useState<AvailablePermission[]>([]);
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canManageRoles =
    currentUser?.permissions.includes(PERMISSAO_ADMINISTRAR_PAPEL) ?? false;
  const activeTab: TabId =
    canManageRoles && searchParams.get('aba') === 'papeis'
      ? 'papeis'
      : 'usuarios';

  const reload = useCallback(async () => {
    try {
      const [nextUsers, nextRoles] = await Promise.all([
        listAdminUsers(),
        listRolesWithPermissions(),
      ]);
      setUsers(nextUsers);
      setRoles(nextRoles);
    } catch (error) {
      setErrorMessage(getProblemDetailsFromError(error).detail);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [nextUsers, nextPermissions, nextRoles] = await Promise.all([
          listAdminUsers(),
          listAvailablePermissions(),
          listRolesWithPermissions(),
        ]);

        if (active) {
          setUsers(nextUsers);
          setPermissions(nextPermissions);
          setRoles(nextRoles);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(getProblemDetailsFromError(error).detail);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Permissões"
        description="Defina o que cada papel e cada usuário pode fazer no sistema."
      />

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      {canManageRoles ? (
        <Tabs
          value={activeTab}
          onChange={(_event, value: TabId) =>
            setSearchParams(value === 'papeis' ? { aba: 'papeis' } : {}, {
              replace: true,
            })
          }
          aria-label="Administração de permissões"
        >
          <Tab
            value="usuarios"
            label="Usuários"
            id="aba-usuarios"
            aria-controls="painel-usuarios"
          />
          <Tab
            value="papeis"
            label="Papéis"
            id="aba-papeis"
            aria-controls="painel-papeis"
          />
        </Tabs>
      ) : null}

      <div
        role="tabpanel"
        id={`painel-${activeTab}`}
        aria-labelledby={`aba-${activeTab}`}
      >
        {activeTab === 'usuarios' ? (
          <UsersPermissionsPanel
            users={users}
            permissions={permissions}
            roles={roles}
            isLoading={isLoading}
            onChanged={() => {
              void reload();
            }}
          />
        ) : (
          <RolesPanel
            roles={roles}
            permissions={permissions}
            isLoading={isLoading}
            onChanged={() => {
              void reload();
            }}
          />
        )}
      </div>
    </Stack>
  );
}
