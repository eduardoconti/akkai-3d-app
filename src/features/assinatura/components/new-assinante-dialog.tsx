import { useEffect } from 'react';
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

interface NewAssinanteDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewAssinanteDialog({ open, onClose }: NewAssinanteDialogProps) {
  const { clearSubmitError, criarAssinante, fetchAssinantes, fetchPlanos, isSubmitting, planos, submitErrorMessage } =
    useAssinaturaStore(
      useShallow((state) => ({
        clearSubmitError: assinaturaStoreSelectors.clearSubmitError(state),
        criarAssinante: assinaturaStoreSelectors.criarAssinante(state),
        fetchAssinantes: assinaturaStoreSelectors.fetchAssinantes(state),
        fetchPlanos: assinaturaStoreSelectors.fetchPlanos(state),
        isSubmitting: assinaturaStoreSelectors.isSubmitting(state),
        planos: assinaturaStoreSelectors.planos(state),
        submitErrorMessage: assinaturaStoreSelectors.submitErrorMessage(state),
      })),
    );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const { form, setForm, problem, setProblem, localErrors, setLocalErrors, isSaving, setIsSaving, resetForm } =
    useFormDialog<AssinanteFormState, AssinanteFormErrors>({
      open,
      initialValues: initialAssinanteFormState,
      onReset: clearSubmitError,
    });

  useEffect(() => {
    if (!open) return;
    void fetchPlanos();
  }, [open, fetchPlanos]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isBusy = isSubmitting || isSaving;

  const handleDialogClose = () => {
    if (isBusy) return;
    handleClose();
  };

  const handleSubmit = async () => {
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
      const result = await criarAssinante({
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

      await fetchAssinantes({ pagina: 1 });
      showSuccess('Assinante cadastrado com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const activePlanos = planos.filter((p) => p.ativo);

  return (
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Person color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Novo assinante
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Cadastre um assinante e vincule-o a um plano mensal.
            </Typography>
          </Box>
          <IconButton onClick={handleDialogClose} disabled={isBusy} aria-label="Fechar">
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
              label="Nome"
              placeholder="Ex: João da Silva"
              value={form.nome}
              onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))}
              error={Boolean(localErrors.nome ?? getFieldMessage(problem, 'nome'))}
              helperText={localErrors.nome ?? getFieldMessage(problem, 'nome')}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={form.status}
              onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as StatusAssinante }))}
            >
              {(Object.keys(STATUS_ASSINANTE_LABEL) as StatusAssinante[]).map((s) => (
                <MenuItem key={s} value={s}>
                  {STATUS_ASSINANTE_LABEL[s]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              select
              fullWidth
              label="Plano"
              value={form.idPlano}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  idPlano: e.target.value === '' ? '' : Number(e.target.value),
                }))
              }
              error={Boolean(localErrors.idPlano ?? getFieldMessage(problem, 'idPlano'))}
              helperText={localErrors.idPlano ?? getFieldMessage(problem, 'idPlano')}
            >
              <MenuItem value="">Selecione um plano</MenuItem>
              {activePlanos.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="E-mail"
              placeholder="Ex: joao@email.com"
              value={form.email}
              onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))}
              error={Boolean(getFieldMessage(problem, 'email'))}
              helperText={getFieldMessage(problem, 'email') ?? 'Opcional'}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Telefone"
              placeholder="Ex: (11) 99999-9999"
              value={form.telefone}
              onChange={(e) => setForm((c) => ({ ...c, telefone: e.target.value }))}
              error={Boolean(getFieldMessage(problem, 'telefone'))}
              helperText={getFieldMessage(problem, 'telefone') ?? 'Opcional'}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Endereço de entrega"
              placeholder="Ex: Rua das Flores, 123 – São Paulo/SP"
              value={form.enderecoEntrega}
              onChange={(e) => setForm((c) => ({ ...c, enderecoEntrega: e.target.value }))}
              helperText="Opcional"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleDialogClose} color="inherit" disabled={isBusy}>
          Cancelar
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          variant="contained"
          startIcon={<Save />}
          size="large"
          disabled={isBusy}
        >
          {isBusy ? 'Salvando...' : 'Salvar assinante'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
