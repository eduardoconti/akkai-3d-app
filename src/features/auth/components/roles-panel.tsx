import { useState } from 'react';
import { Alert, Button, Chip, Stack } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { ResponsiveDataTable, type DataTableColumn } from '@/shared';
import type {
  AvailablePermission,
  RoleWithPermissions,
} from '@/features/auth/api/permissions-admin-api';
import RoleDialog from '@/features/auth/components/role-dialog';

interface RolesPanelProps {
  roles: RoleWithPermissions[];
  permissions: AvailablePermission[];
  isLoading: boolean;
  onChanged: () => void;
}

export default function RolesPanel({
  roles,
  permissions,
  isLoading,
  onChanged,
}: RolesPanelProps) {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    role: RoleWithPermissions | null;
  }>({ open: false, role: null });

  const columns: DataTableColumn<RoleWithPermissions>[] = [
    {
      id: 'papel',
      header: 'Papel',
      mobile: 'title',
      cell: (role) => role.name,
    },
    {
      id: 'tipo',
      header: 'Tipo',
      mobile: 'badge',
      cell: (role) => (
        <Chip
          size="small"
          variant="outlined"
          color={role.protegido ? 'default' : 'primary'}
          label={role.protegido ? 'Sistema' : 'Personalizado'}
        />
      ),
    },
    {
      id: 'descricao',
      header: 'Descrição',
      cell: (role) => role.description,
    },
    {
      id: 'usuarios',
      header: 'Usuários',
      align: 'right',
      cell: (role) => role.quantidadeUsuarios,
    },
    {
      id: 'permissoes',
      header: 'Permissões',
      align: 'right',
      cell: (role) => role.permissoes.length,
    },
    {
      id: 'acoes',
      header: '',
      mobile: 'actions',
      align: 'right',
      cell: (role) => (
        <Button
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            setDialogState({ open: true, role });
          }}
          aria-label={`Editar o papel ${role.name}`}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        O papel define as permissões de partida de cada usuário. Alterar um
        papel afeta todos os usuários que o utilizam.
      </Alert>

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={() => setDialogState({ open: true, role: null })}
        >
          Novo papel
        </Button>
      </Stack>

      <ResponsiveDataTable
        rows={roles}
        columns={columns}
        getRowId={(role) => role.id}
        ariaLabel="tabela de papéis"
        emptyMessage="Nenhum papel cadastrado."
        isLoading={isLoading}
        onRowClick={(role) => setDialogState({ open: true, role })}
      />

      <RoleDialog
        open={dialogState.open}
        role={dialogState.role}
        permissions={permissions}
        onClose={() =>
          setDialogState((current) => ({ ...current, open: false }))
        }
        onSaved={onChanged}
      />
    </Stack>
  );
}
