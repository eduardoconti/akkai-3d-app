import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close, Loyalty, Save } from '@mui/icons-material';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  initialPlanoFormState,
  type PlanoFormErrors,
  type PlanoFormState,
} from '@/features/assinatura/types/assinatura-form';
import {
  CurrencyField,
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface NewPlanDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewPlanDialog({ open, onClose }: NewPlanDialogProps) {
  const { clearSubmitError, criarPlano, fetchPlanos, isSubmitting, submitErrorMessage } =
    useAssinaturaStore(
      useShallow((state) => ({
        clearSubmitError: assinaturaStoreSelectors.clearSubmitError(state),
        criarPlano: assinaturaStoreSelectors.criarPlano(state),
        fetchPlanos: assinaturaStoreSelectors.fetchPlanos(state),
        isSubmitting: assinaturaStoreSelectors.isSubmitting(state),
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
  } = useFormDialog<PlanoFormState, PlanoFormErrors>({
    open,
    initialValues: initialPlanoFormState,
    onReset: clearSubmitError,
  });

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
    const errors: PlanoFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    if (form.valor === '' || form.valor <= 0) {
      errors.valor = 'Informe um valor maior que zero.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);

    try {
      const result = await criarPlano({
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || undefined,
        valor: Math.round((form.valor as number) * 100),
        ativo: form.ativo,
      });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await fetchPlanos();
      showSuccess('Plano cadastrado com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

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
              <Loyalty color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Novo plano
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Cadastre um plano de kit mensal para oferecer aos assinantes.
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
              label="Nome do plano"
              placeholder="Ex: Kit Mensal Básico"
              value={form.nome}
              onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))}
              error={Boolean(localErrors.nome ?? getFieldMessage(problem, 'nome'))}
              helperText={localErrors.nome ?? getFieldMessage(problem, 'nome')}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <CurrencyField
              label="Valor (R$)"
              value={form.valor === '' ? 0 : form.valor}
              onValueChange={(value) => setForm((c) => ({ ...c, valor: value }))}
              error={Boolean(localErrors.valor ?? getFieldMessage(problem, 'valor'))}
              helperText={localErrors.valor ?? getFieldMessage(problem, 'valor')}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Descrição"
              placeholder="Ex: Kit com 3 peças impressas em 3D"
              value={form.descricao}
              onChange={(e) => setForm((c) => ({ ...c, descricao: e.target.value }))}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.ativo}
                  onChange={(_e, checked) => setForm((c) => ({ ...c, ativo: checked }))}
                />
              }
              label="Plano ativo"
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
          {isBusy ? 'Salvando...' : 'Salvar Plano'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
