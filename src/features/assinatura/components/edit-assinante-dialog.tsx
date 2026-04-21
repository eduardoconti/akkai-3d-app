import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close, Person, Save } from '@mui/icons-material';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  initialAssinanteFormState,
  STATUS_ASSINANTE_LABEL,
  type AssinanteFormErrors,
  type AssinanteFormState,
} from '@/features/assinatura/types/assinatura-form';
import {
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
  type StatusAssinante,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface EditAssinanteDialogProps {
  open: boolean;
  assinanteId: number | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

export default function EditAssinanteDialog({
  open,
  assinanteId,
  onClose,
  onUpdated,
}: EditAssinanteDialogProps) {
  const {
    atualizarAssinante,
    clearSubmitError,
    excluirAssinante,
    fetchPlanos,
    isSubmitting,
    obterAssinantePorId,
    planos,
    submitErrorMessage,
  } = useAssinaturaStore(
    useShallow((state) => ({
      atualizarAssinante: assinaturaStoreSelectors.atualizarAssinante(state),
      clearSubmitError: assinaturaStoreSelectors.clearSubmitError(state),
      excluirAssinante: assinaturaStoreSelectors.excluirAssinante(state),
      fetchPlanos: assinaturaStoreSelectors.fetchPlanos(state),
      isSubmitting: assinaturaStoreSelectors.isSubmitting(state),
      obterAssinantePorId: assinaturaStoreSelectors.obterAssinantePorId(state),
      planos: assinaturaStoreSelectors.planos(state),
      submitErrorMessage: assinaturaStoreSelectors.submitErrorMessage(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const {
    form,
    setForm,
    problem,
    setProblem,
    localErrors,
    setLocalErrors,
    isSaving,
    setIsSaving,
    resetForm,
  } = useFormDialog<AssinanteFormState, AssinanteFormErrors>({
    open,
    initialValues: initialAssinanteFormState,
    onReset: clearSubmitError,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    void fetchPlanos();
  }, [open, fetchPlanos]);

  useEffect(() => {
    if (!open || assinanteId === null) return;

    let active = true;

    const loadAssinante = async () => {
      setIsLoading(true);
      setProblem(null);
      setLocalErrors({});

      try {
        const assinante = await obterAssinantePorId(assinanteId);

        if (!active) return;

        setForm({
          nome: assinante.nome,
          email: assinante.email ?? '',
          telefone: assinante.telefone ?? '',
          enderecoEntrega: assinante.enderecoEntrega ?? '',
          idPlano: assinante.idPlano,
          status: assinante.status,
        });
      } catch (error) {
        if (!active) return;
        setProblem(getProblemDetailsFromError(error));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadAssinante();

    return () => {
      active = false;
    };
  }, [obterAssinantePorId, open, assinanteId]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isBusy = isSubmitting || isLoading || isSaving || isDeleting;

  const handleDialogClose = () => {
    if (isBusy) return;
    handleClose();
  };

  const handleSubmit = async () => {
    if (assinanteId === null) return;

    const errors: AssinanteFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    if (form.idPlano === '') {
      errors.idPlano = 'Selecione um plano.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);

    try {
      const result = await atualizarAssinante(assinanteId, {
        nome: form.nome.trim(),
        email: form.email.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        enderecoEntrega: form.enderecoEntrega.trim() || undefined,
        idPlano: form.idPlano as number,
        status: form.status,
      });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onUpdated();
      showSuccess('Assinante alterado com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (assinanteId === null) return;

    setIsDeleting(true);
    setProblem(null);

    try {
      const result = await excluirAssinante(assinanteId);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onUpdated();
      showSuccess('Assinante excluído com sucesso.');
      setConfirmDeleteOpen(false);
      handleClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="sm">
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
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
              >
                <Person color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Alterar assinante
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Atualize os dados do assinante selecionado.
              </Typography>
            </Box>
            <IconButton
              onClick={handleDialogClose}
              disabled={isBusy}
              aria-label="Fechar"
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                disabled={isLoading}
                label="Nome"
                placeholder="Ex: João da Silva"
                value={form.nome}
                onChange={(e) =>
                  setForm((c) => ({ ...c, nome: e.target.value }))
                }
                error={Boolean(
                  localErrors.nome ?? getFieldMessage(problem, 'nome'),
                )}
                helperText={
                  localErrors.nome ?? getFieldMessage(problem, 'nome')
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                fullWidth
                disabled={isLoading}
                label="Status"
                value={form.status}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    status: e.target.value as StatusAssinante,
                  }))
                }
              >
                {(Object.keys(STATUS_ASSINANTE_LABEL) as StatusAssinante[]).map(
                  (s) => (
                    <MenuItem key={s} value={s}>
                      {STATUS_ASSINANTE_LABEL[s]}
                    </MenuItem>
                  ),
                )}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                select
                fullWidth
                disabled={isLoading}
                label="Plano"
                value={form.idPlano}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    idPlano:
                      e.target.value === '' ? '' : Number(e.target.value),
                  }))
                }
                error={Boolean(
                  localErrors.idPlano ?? getFieldMessage(problem, 'idPlano'),
                )}
                helperText={
                  localErrors.idPlano ?? getFieldMessage(problem, 'idPlano')
                }
              >
                <MenuItem value="">Selecione um plano</MenuItem>
                {planos.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                disabled={isLoading}
                label="E-mail"
                placeholder="Ex: joao@email.com"
                value={form.email}
                onChange={(e) =>
                  setForm((c) => ({ ...c, email: e.target.value }))
                }
                error={Boolean(getFieldMessage(problem, 'email'))}
                helperText={getFieldMessage(problem, 'email') ?? 'Opcional'}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                disabled={isLoading}
                label="Telefone"
                placeholder="Ex: (11) 99999-9999"
                value={form.telefone}
                onChange={(e) =>
                  setForm((c) => ({ ...c, telefone: e.target.value }))
                }
                error={Boolean(getFieldMessage(problem, 'telefone'))}
                helperText={getFieldMessage(problem, 'telefone') ?? 'Opcional'}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                disabled={isLoading}
                label="Endereço de entrega"
                placeholder="Ex: Rua das Flores, 123 – São Paulo/SP"
                value={form.enderecoEntrega}
                onChange={(e) =>
                  setForm((c) => ({ ...c, enderecoEntrega: e.target.value }))
                }
                helperText="Opcional"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box>
            <Button
              color="error"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isBusy}
            >
              Excluir
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              onClick={handleDialogClose}
              color="inherit"
              disabled={isBusy}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              variant="contained"
              startIcon={<Save />}
              size="large"
              disabled={isBusy}
            >
              {isSaving || isSubmitting ? 'Salvando...' : 'Salvar assinante'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Excluir assinante</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Tem certeza que deseja excluir este assinante? Essa ação não pode
            ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setConfirmDeleteOpen(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleConfirmDelete()}
            disabled={isDeleting}
          >
            {isDeleting ? 'Excluindo...' : 'Confirmar exclusão'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
