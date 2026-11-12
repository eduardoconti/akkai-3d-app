import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ConfirmDialog,
  FormFeedbackAlert,
  getFieldMessage,
  getProblemDetailsFromError,
  useFeedbackStore,
  type ProblemDetails,
} from '@/shared';
import {
  createRole,
  deleteRole,
  updateRole,
  type AvailablePermission,
  type RoleWithPermissions,
} from '@/features/auth/api/permissions-admin-api';
import PermissionChecklist from '@/features/auth/components/permission-checklist';
import {
  PERMISSAO_ADMINISTRAR_PAPEL,
  PERMISSAO_ADMINISTRAR_PERMISSOES,
} from '@/features/auth/constants/permissions';
import { useAuth } from '@/features/auth/hooks/use-auth';

interface RoleDialogProps {
  open: boolean;
  /** Papel em edição; `null` cria um novo papel. */
  role: RoleWithPermissions | null;
  permissions: AvailablePermission[];
  onClose: () => void;
  onSaved: () => void;
}

const ADMIN_PERMISSIONS = [
  PERMISSAO_ADMINISTRAR_PERMISSOES,
  PERMISSAO_ADMINISTRAR_PAPEL,
];

function sameSet(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  return left.size === right.size && [...left].every((item) => right.has(item));
}

export default function RoleDialog({
  open,
  role,
  permissions,
  onClose,
  onSaved,
}: RoleDialogProps) {
  const { user: currentUser } = useAuth();
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setSelected(new Set(role?.permissoes ?? []));
    setProblem(null);
  }, [open, role]);

  const isEditing = role !== null;
  const initialPermissions = useMemo(
    () => new Set(role?.permissoes ?? []),
    [role],
  );
  const hasChanges = isEditing
    ? name.trim() !== role.name ||
      description.trim() !== (role.description ?? '') ||
      !sameSet(selected, initialPermissions)
    : name.trim() !== '' || description.trim() !== '' || selected.size > 0;
  const isOwnRole = isEditing && currentUser?.role === role.name;
  const deleteBlockedReason = !role
    ? null
    : role.protegido
      ? 'Papéis do sistema não podem ser excluídos.'
      : role.quantidadeUsuarios > 0
        ? `${role.quantidadeUsuarios} usuário(s) ainda usam este papel.`
        : null;
  const nameError =
    getFieldMessage(problem, 'name') ??
    (problem?.status === 409 ? problem.detail : undefined);

  const handleToggle = (names: string[], active: boolean) => {
    setSelected((current) => {
      const next = new Set(current);

      for (const permissionName of names) {
        if (active) {
          next.add(permissionName);
        } else {
          next.delete(permissionName);
        }
      }

      return next;
    });
  };

  const handleRequestClose = () => {
    if (isSaving) {
      return;
    }

    if (hasChanges) {
      setConfirmDiscardOpen(true);
      return;
    }

    onClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setProblem(null);

    const input = {
      name: name.trim(),
      description: description.trim() || undefined,
      permissoes: permissions
        .map((permission) => permission.name)
        .filter((permissionName) => selected.has(permissionName)),
    };

    try {
      if (role) {
        await updateRole(role.id, input);
      } else {
        await createRole(input);
      }

      showSuccess(
        role
          ? `Papel "${input.name}" atualizado.`
          : `Papel "${input.name}" criado.`,
      );
      onSaved();
      onClose();
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!role) {
      return;
    }

    setIsSaving(true);
    setProblem(null);

    try {
      await deleteRole(role.id);
      showSuccess(`Papel "${role.name}" excluído.`);
      setConfirmDeleteOpen(false);
      onSaved();
      onClose();
    } catch (error) {
      setConfirmDeleteOpen(false);
      setProblem(getProblemDetailsFromError(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleRequestClose}
        fullWidth
        maxWidth="md"
        aria-labelledby="role-dialog-title"
      >
        <DialogTitle id="role-dialog-title">
          {isEditing ? `Papel ${role.name}` : 'Novo papel'}
        </DialogTitle>

        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
          <Stack spacing={2.5}>
            <FormFeedbackAlert message={problem?.detail} />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                required
                label="Nome do papel"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={role?.protegido}
                error={Boolean(nameError)}
                helperText={
                  nameError ??
                  (role?.protegido
                    ? 'Papel do sistema: o nome não pode ser alterado.'
                    : undefined)
                }
                sx={{ flex: 1 }}
              />
              <TextField
                label="Descrição"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                error={Boolean(getFieldMessage(problem, 'description'))}
                helperText={getFieldMessage(problem, 'description')}
                sx={{ flex: 2 }}
              />
            </Stack>

            {isEditing && role.quantidadeUsuarios > 0 ? (
              <Alert severity="info">
                Este papel é usado por {role.quantidadeUsuarios} usuário(s). As
                alterações valem para eles em até 15 minutos, na próxima
                renovação da sessão.
              </Alert>
            ) : null}

            {isOwnRole ? (
              <Alert severity="warning">
                Este é o seu próprio papel. As permissões de administração ficam
                travadas para você não perder o acesso a este painel.
              </Alert>
            ) : null}

            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography fontWeight={700}>Permissões</Typography>
              <Chip
                size="small"
                variant="outlined"
                label={`${selected.size} de ${permissions.length} marcadas`}
              />
            </Stack>

            <PermissionChecklist
              permissions={permissions}
              isActive={(permissionName) => selected.has(permissionName)}
              onToggle={handleToggle}
              getLockedReason={(permissionName) =>
                isOwnRole && ADMIN_PERMISSIONS.includes(permissionName)
                  ? 'Você não pode remover esta permissão do seu próprio papel.'
                  : null
              }
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          {isEditing ? (
            <Tooltip title={deleteBlockedReason ?? ''}>
              <Box component="span">
                <Button
                  color="error"
                  disabled={deleteBlockedReason !== null || isSaving}
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  Excluir papel
                </Button>
              </Box>
            </Tooltip>
          ) : null}
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" onClick={handleRequestClose}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void handleSave();
            }}
            disabled={name.trim().length < 2 || !hasChanges || isSaving}
          >
            {isSaving
              ? 'Salvando...'
              : isEditing
                ? 'Salvar papel'
                : 'Criar papel'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscardOpen}
        title="Descartar alterações?"
        message="As alterações feitas neste papel não foram salvas e serão perdidas."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        destructive
        onClose={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          onClose();
        }}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Excluir papel?"
        message={`O papel "${role?.name ?? ''}" será excluído definitivamente. Nenhum usuário o utiliza.`}
        confirmLabel="Excluir"
        destructive
        isLoading={isSaving}
        loadingLabel="Excluindo..."
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </>
  );
}
