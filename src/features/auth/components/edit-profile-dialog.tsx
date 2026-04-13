import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Close,
  Lock,
  Person,
  Save,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { listRoles, type AuthRole } from '../api/auth-api';
import { useAuth } from '../hooks/use-auth';
import {
  FormFeedbackAlert,
  getFieldMessage,
  getProblemDetailsFromError,
  useFeedbackStore,
  type ProblemDetails,
} from '@/shared';

interface EditProfileDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ProfileFormState {
  name: string;
  login: string;
  isActive: boolean;
  roleId: number | '';
}

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function EditProfileDialog({
  open,
  onClose,
}: EditProfileDialogProps) {
  const { logout, updatePassword, updateProfile, user } = useAuth();
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [roles, setRoles] = useState<AuthRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileProblem, setProfileProblem] = useState<ProblemDetails | null>(null);
  const [passwordProblem, setPasswordProblem] = useState<ProblemDetails | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: '',
    login: '',
    isActive: true,
    roleId: '',
  });
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const canUpdateRole = user?.permissions.includes('auth.user.update_role') ?? false;
  const canUpdateStatus =
    user?.permissions.includes('auth.user.update_status') ?? false;

  useEffect(() => {
    if (!open || !user) {
      return;
    }

    setProfileForm({
      name: user.name,
      login: user.login,
      isActive: user.isActive,
      roleId: user.roleId,
    });
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setProfileErrors({});
    setPasswordErrors({});
    setProfileProblem(null);
    setPasswordProblem(null);

    let active = true;
    const loadRoles = async () => {
      if (!canUpdateRole) {
        setRoles([]);
        setIsLoadingRoles(false);
        return;
      }

      setIsLoadingRoles(true);
      try {
        const nextRoles = await listRoles();
        if (active) {
          setRoles(nextRoles);
        }
      } catch (error) {
        if (active) {
          setProfileProblem(getProblemDetailsFromError(error));
        }
      } finally {
        if (active) {
          setIsLoadingRoles(false);
        }
      }
    };

    void loadRoles();

    return () => {
      active = false;
    };
  }, [canUpdateRole, open, user]);

  const isBusy = isLoadingRoles || isSavingProfile || isSavingPassword;

  const roleDescription = useMemo(() => {
    return roles.find((role) => role.id === profileForm.roleId)?.description;
  }, [profileForm.roleId, roles]);

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    onClose();
  };

  const handleSaveProfile = async () => {
    const errors: Record<string, string> = {};

    if (profileForm.name.trim().length < 2) {
      errors.name = 'Informe um nome com pelo menos 2 caracteres.';
    }

    if (profileForm.login.trim().length < 3) {
      errors.login = 'Informe um login com pelo menos 3 caracteres.';
    } else if (!/^[A-Za-z]+$/.test(profileForm.login.trim())) {
      errors.login = 'O login deve conter apenas letras.';
    }

    if (canUpdateRole && profileForm.roleId === '') {
      errors.roleId = 'Selecione o papel do usuário.';
    }

    setProfileErrors(errors);
    setProfileProblem(null);

    if (
      Object.keys(errors).length > 0 ||
      (canUpdateRole && profileForm.roleId === '')
    ) {
      return;
    }

    setIsSavingProfile(true);
    try {
      const updatedUser = await updateProfile({
        name: profileForm.name.trim(),
        login: profileForm.login.trim(),
        isActive: profileForm.isActive,
        roleId:
          profileForm.roleId === '' ? (user?.roleId ?? 0) : profileForm.roleId,
      });

      showSuccess('Cadastro alterado com sucesso.');

      if (!updatedUser.isActive) {
        await logout();
      }

      onClose();
    } catch (error) {
      setProfileProblem(getProblemDetailsFromError(error));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    const errors: Record<string, string> = {};

    if (passwordForm.currentPassword.length < 6) {
      errors.currentPassword = 'Informe a senha atual com pelo menos 6 caracteres.';
    }

    if (passwordForm.newPassword.length < 6) {
      errors.newPassword = 'Informe a nova senha com pelo menos 6 caracteres.';
    }

    if (passwordForm.confirmPassword !== passwordForm.newPassword) {
      errors.confirmPassword = 'A confirmação da senha deve ser igual à nova senha.';
    }

    setPasswordErrors(errors);
    setPasswordProblem(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSavingPassword(true);
    try {
      await updatePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      showSuccess('Senha alterada com sucesso.');
    } catch (error) {
      setPasswordProblem(getProblemDetailsFromError(error));
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ px: 3, py: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Alterar cadastro
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Atualize os dados do usuário e altere a senha no mesmo modal.
            </Typography>
          </Box>

          <IconButton
            onClick={handleDialogClose}
            aria-label="Fechar modal de perfil"
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Dados cadastrais
                  </Typography>
                </Box>

                <FormFeedbackAlert message={profileProblem?.detail} />

                <TextField
                  fullWidth
                  label="Nome"
                  value={profileForm.name}
                  onChange={(event) => {
                    setProfileForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                  }}
                  error={Boolean(profileErrors.name || getFieldMessage(profileProblem, 'name'))}
                  helperText={
                    profileErrors.name ?? getFieldMessage(profileProblem, 'name')
                  }
                />

                <TextField
                  fullWidth
                  label="Login"
                  value={profileForm.login}
                  onChange={(event) => {
                    setProfileForm((current) => ({
                      ...current,
                      login: event.target.value,
                    }));
                  }}
                  error={Boolean(profileErrors.login || getFieldMessage(profileProblem, 'login'))}
                  helperText={
                    profileErrors.login ?? getFieldMessage(profileProblem, 'login')
                  }
                />

                {canUpdateRole ? (
                  <TextField
                    select
                    fullWidth
                    label="Papel"
                    value={profileForm.roleId}
                    onChange={(event) => {
                      setProfileForm((current) => ({
                        ...current,
                        roleId: Number(event.target.value),
                      }));
                    }}
                    error={Boolean(
                      profileErrors.roleId ||
                        getFieldMessage(profileProblem, 'roleId'),
                    )}
                    helperText={
                      profileErrors.roleId ??
                      getFieldMessage(profileProblem, 'roleId') ??
                      roleDescription ??
                      'Selecione o papel do usuário.'
                    }
                    disabled={isLoadingRoles}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : null}

                {canUpdateStatus ? (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={profileForm.isActive}
                        onChange={(_event, checked) => {
                          setProfileForm((current) => ({
                            ...current,
                            isActive: checked,
                          }));
                        }}
                      />
                    }
                    label="Usuário ativo"
                  />
                ) : null}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSaveProfile}
                    disabled={isBusy}
                  >
                    {isSavingProfile ? 'Salvando...' : 'Salvar cadastro'}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Lock color="primary" />
                  <Typography variant="h6" fontWeight={700}>
                    Senha
                  </Typography>
                </Box>

                <FormFeedbackAlert message={passwordProblem?.detail} />

                <TextField
                  fullWidth
                  type={showCurrentPassword ? 'text' : 'password'}
                  label="Senha atual"
                  value={passwordForm.currentPassword}
                  onChange={(event) => {
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }));
                  }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            onClick={() =>
                              setShowCurrentPassword((current) => !current)
                            }
                            onMouseDown={(event) => event.preventDefault()}
                            aria-label={
                              showCurrentPassword
                                ? 'Ocultar senha atual'
                                : 'Exibir senha atual'
                            }
                          >
                            {showCurrentPassword ? (
                              <VisibilityOff />
                            ) : (
                              <Visibility />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  error={Boolean(
                    passwordErrors.currentPassword ||
                      getFieldMessage(passwordProblem, 'currentPassword'),
                  )}
                  helperText={
                    passwordErrors.currentPassword ??
                    getFieldMessage(passwordProblem, 'currentPassword')
                  }
                />

                <TextField
                  fullWidth
                  type={showNewPassword ? 'text' : 'password'}
                  label="Nova senha"
                  value={passwordForm.newPassword}
                  onChange={(event) => {
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }));
                  }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            onClick={() => setShowNewPassword((current) => !current)}
                            onMouseDown={(event) => event.preventDefault()}
                            aria-label={
                              showNewPassword
                                ? 'Ocultar nova senha'
                                : 'Exibir nova senha'
                            }
                          >
                            {showNewPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  error={Boolean(
                    passwordErrors.newPassword ||
                      getFieldMessage(passwordProblem, 'newPassword'),
                  )}
                  helperText={
                    passwordErrors.newPassword ??
                    getFieldMessage(passwordProblem, 'newPassword')
                  }
                />

                <TextField
                  fullWidth
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirmar nova senha"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => {
                    setPasswordForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }));
                  }}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            onClick={() =>
                              setShowConfirmPassword((current) => !current)
                            }
                            onMouseDown={(event) => event.preventDefault()}
                            aria-label={
                              showConfirmPassword
                                ? 'Ocultar confirmação da senha'
                                : 'Exibir confirmação da senha'
                            }
                          >
                            {showConfirmPassword ? (
                              <VisibilityOff />
                            ) : (
                              <Visibility />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  error={Boolean(passwordErrors.confirmPassword)}
                  helperText={passwordErrors.confirmPassword}
                />

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto' }}>
                  <Button
                    variant="contained"
                    startIcon={<Save />}
                    onClick={handleSavePassword}
                    disabled={isBusy}
                  >
                    {isSavingPassword ? 'Salvando...' : 'Salvar senha'}
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleDialogClose} color="inherit" disabled={isBusy}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
