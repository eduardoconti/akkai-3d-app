import { useMemo, useState } from 'react';
import { Box, Button, Chip, Stack, TextField } from '@mui/material';
import { ResponsiveDataTable, type DataTableColumn } from '@/shared';
import type {
  AdminUser,
  AvailablePermission,
  RoleWithPermissions,
} from '@/features/auth/api/permissions-admin-api';
import UserPermissionsDialog from '@/features/auth/components/user-permissions-dialog';
import { StatusChip } from '@/shared';

interface UsersPermissionsPanelProps {
  users: AdminUser[];
  permissions: AvailablePermission[];
  roles: RoleWithPermissions[];
  isLoading: boolean;
  onChanged: () => void;
}

export default function UsersPermissionsPanel({
  users,
  permissions,
  roles,
  isLoading,
  onChanged,
}: UsersPermissionsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return term
      ? users.filter((user) =>
          [user.name, user.login, user.papel].some((value) =>
            value.toLowerCase().includes(term),
          ),
        )
      : users;
  }, [searchTerm, users]);

  const columns: DataTableColumn<AdminUser>[] = [
    {
      id: 'usuario',
      header: 'Usuário',
      mobile: 'title',
      cell: (user) => (
        <Box>
          <Box component="span" sx={{ fontWeight: 700 }}>
            {user.name}
          </Box>
          <Box
            component="span"
            sx={{ display: 'block', color: 'text.secondary', fontSize: 13 }}
          >
            @{user.login}
          </Box>
        </Box>
      ),
    },
    {
      id: 'papel',
      header: 'Papel',
      mobile: 'badge',
      cell: (user) => (
        <Chip size="small" variant="outlined" label={user.papel} />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      cell: (user) => (
        <StatusChip
          tone={user.isActive ? 'success' : 'default'}
          label={user.isActive ? 'Ativo' : 'Inativo'}
        />
      ),
    },
    {
      id: 'permissoes',
      header: 'Permissões',
      align: 'right',
      cell: (user) => user.quantidadePermissoes,
    },
    {
      id: 'ajustes',
      header: 'Ajustes individuais',
      cell: (user) =>
        user.quantidadeAjustes > 0 ? (
          <Chip
            size="small"
            color="warning"
            variant="outlined"
            label={`${user.quantidadeAjustes} ajuste(s)`}
          />
        ) : (
          'Padrão do papel'
        ),
    },
    {
      id: 'acoes',
      header: '',
      mobile: 'actions',
      align: 'right',
      cell: (user) => (
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            setEditingUserId(user.id);
          }}
          aria-label={`Gerenciar permissões de ${user.name}`}
        >
          Gerenciar
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <TextField
        label="Buscar usuário"
        placeholder="Nome, login ou papel"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        sx={{ maxWidth: { md: 420 } }}
      />

      <ResponsiveDataTable
        rows={filteredUsers}
        columns={columns}
        getRowId={(user) => user.id}
        ariaLabel="tabela de usuários"
        emptyMessage="Nenhum usuário encontrado."
        isLoading={isLoading}
        onRowClick={(user) => setEditingUserId(user.id)}
      />

      <UserPermissionsDialog
        open={editingUserId !== null}
        userId={editingUserId}
        permissions={permissions}
        roles={roles}
        onClose={() => setEditingUserId(null)}
        onSaved={onChanged}
      />
    </Stack>
  );
}
