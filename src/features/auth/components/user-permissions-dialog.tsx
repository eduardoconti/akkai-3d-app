import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ConfirmDialog,
  FormFeedbackAlert,
  LoadingState,
  getProblemDetailsFromError,
  useFeedbackStore,
  type ProblemDetails,
} from '@/shared';
import {
  getUserPermissions,
  setUserPermissions,
  type AvailablePermission,
  type RoleWithPermissions,
  type UserPermissions,
} from '@/features/auth/api/permissions-admin-api';
import PermissionChecklist from '@/features/auth/components/permission-checklist';
import { PERMISSAO_ADMINISTRAR_PERMISSOES } from '@/features/auth/constants/permissions';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  countAdjustments,
  countPendingChanges,
  emptyAdjustments,
  getEffectivePermissions,
  isPermissionActive,
  normalizeAdjustments,
  setPermissionsActive,
  type PermissionAdjustments,
} from '@/features/auth/utils/permission-model';

interface UserPermissionsDialogProps {
  open: boolean;
  userId: number | null;
  permissions: AvailablePermission[];
  roles: RoleWithPermissions[];
  onClose: () => void;
  onSaved: () => void;
}

function savedAdjustments(detail: UserPermissions): PermissionAdjustments {
  return {
    granted: new Set(detail.concedidas),
    revoked: new Set(detail.revogadas),
  };
}

export default function UserPermissionsDialog({
  open,
  userId,
  permissions,
  roles,
  onClose,
  onSaved,
}: UserPermissionsDialogProps) {
  const { user: currentUser } = useAuth();
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [detail, setDetail] = useState<UserPermissions | null>(null);
  const [roleId, setRoleId] = useState<number | ''>('');
  const [adjustments, setAdjustments] =
    useState<PermissionAdjustments>(emptyAdjustments());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  useEffect(() => {
    if (!open || userId === null) {
      return;
    }

    let active = true;
    setIsLoading(true);
    setProblem(null);
    setDetail(null);

    getUserPermissions(userId)
      .then((response) => {
        if (!active) {
          return;
        }

        setDetail(response);
        setRoleId(response.idPapel);
        setAdjustments(savedAdjustments(response));
      })
      .catch((error: unknown) => {
        if (active) {
          setProblem(getProblemDetailsFromError(error));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, userId]);

  const allNames = useMemo(
    () => permissions.map((permission) => permission.name),
    [permissions],
  );
  const selectedRole = roles.find((role) => role.id === roleId);
  const rolePermissions = useMemo(
    () => new Set(selectedRole?.permissoes ?? []),
    [selectedRole],
  );
  const saved = useMemo(
    () => (detail ? savedAdjustments(detail) : emptyAdjustments()),
    [detail],
  );
  const roleChanged = detail !== null && roleId !== detail.idPapel;
  const pendingChanges = countPendingChanges(adjustments, saved, roleChanged);
  const isEditingSelf = detail !== null && currentUser?.id === detail.id;

  const handleRoleChange = (nextRoleId: number) => {
    const nextRole = roles.find((role) => role.id === nextRoleId);

    setRoleId(nextRoleId);
    setAdjustments((current) =>
      normalizeAdjustments(current, new Set(nextRole?.permissoes ?? [])),
    );
  };

  const handleToggle = (names: string[], active: boolean) => {
    setAdjustments((current) =>
      setPermissionsActive(names, active, rolePermissions, current),
    );
  };

  const handleResetToRole = () => {
    setAdjustments(emptyAdjustments());
  };

  const handleRequestClose = () => {
    if (isSaving) {
      return;
    }

    if (pendingChanges > 0) {
      setConfirmDiscardOpen(true);
      return;
    }

    onClose();
  };

  const handleSave = async () => {
    if (!detail || roleId === '') {
      return;
    }

    setIsSaving(true);
    setProblem(null);

    try {
      await setUserPermissions(detail.id, {
        idPapel: roleId,
        permissoes: getEffectivePermissions(
          allNames,
          rolePermissions,
          adjustments,
        ),
      });
      showSuccess(`Permissões de ${detail.name} atualizadas.`);
      onSaved();
      onClose();
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const isLockedForSelf = (name: string) =>
    isEditingSelf && name === PERMISSAO_ADMINISTRAR_PERMISSOES;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleRequestClose}
        fullWidth
        maxWidth="md"
        aria-labelledby="user-permissions-title"
      >
        <DialogTitle id="user-permissions-title">
          {detail ? `Permissões de ${detail.name}` : 'Permissões do usuário'}
          {detail ? (
            <Typography variant="body2" color="text.secondary">
              @{detail.login}
              {detail.isActive ? '' : ' · usuário inativo'}
            </Typography>
          ) : null}
        </DialogTitle>

        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
          <Stack spacing={2.5}>
            <FormFeedbackAlert message={problem?.detail} />

            {isLoading ? <LoadingState /> : null}

            {detail ? (
              <>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ sm: 'center' }}
                >
                  <TextField
                    select
                    label="Papel"
                    value={roleId}
                    onChange={(event) =>
                      handleRoleChange(Number(event.target.value))
                    }
                    helperText="O papel define o ponto de partida das permissões."
                    sx={{ minWidth: { sm: 260 } }}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Chip
                      size="small"
                      color="success"
                      variant="outlined"
                      label={`${adjustments.granted.size} concedida(s)`}
                    />
                    <Chip
                      size="small"
                      color="error"
                      variant="outlined"
                      label={`${adjustments.revoked.size} revogada(s)`}
                    />
                    <Button
                      size="small"
                      onClick={handleResetToRole}
                      disabled={countAdjustments(adjustments) === 0}
                    >
                      Voltar ao padrão do papel
                    </Button>
                  </Stack>
                </Stack>

                {isEditingSelf ? (
                  <Alert severity="info">
                    Você está editando o seu próprio acesso. A permissão de
                    administrar permissões não pode ser removida por você.
                  </Alert>
                ) : (
                  <Alert severity="info">
                    As alterações valem para o usuário em até 15 minutos, na
                    próxima renovação da sessão, ou assim que ele entrar de
                    novo.
                  </Alert>
                )}

                <PermissionChecklist
                  permissions={permissions}
                  isActive={(name) =>
                    isPermissionActive(name, rolePermissions, adjustments)
                  }
                  onToggle={handleToggle}
                  getBadge={(name) =>
                    adjustments.granted.has(name)
                      ? 'granted'
                      : adjustments.revoked.has(name)
                        ? 'revoked'
                        : null
                  }
                  getLockedReason={(name) =>
                    isLockedForSelf(name)
                      ? 'Você não pode remover esta permissão de si mesmo.'
                      : null
                  }
                />
              </>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ flexGrow: 1 }}
            aria-live="polite"
          >
            {pendingChanges > 0
              ? `${pendingChanges} alteração(ões) não salva(s)`
              : ''}
          </Typography>
          <Button color="inherit" onClick={handleRequestClose}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void handleSave();
            }}
            disabled={!detail || pendingChanges === 0 || isSaving}
          >
            {isSaving ? 'Salvando...' : 'Salvar permissões'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscardOpen}
        title="Descartar alterações?"
        message={`As ${pendingChanges} alteração(ões) de permissões não salvas serão perdidas.`}
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        destructive
        onClose={() => setConfirmDiscardOpen(false)}
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          onClose();
        }}
      />
    </>
  );
}
