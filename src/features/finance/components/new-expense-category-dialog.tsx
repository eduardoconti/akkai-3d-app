import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close, Label, Save } from '@mui/icons-material';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import {
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface NewExpenseCategoryDialogProps {
  open: boolean;
  onClose: () => void;
}

type FormState = { nome: string };
type FormErrors = { nome?: string };

export default function NewExpenseCategoryDialog({
  open,
  onClose,
}: NewExpenseCategoryDialogProps) {
  const {
    criarCategoriaDespesa,
    fetchCategoriasDespesa,
    isSubmitting,
    clearSubmitError,
    submitErrorMessage,
  } = useFinanceStore(
    useShallow((state) => ({
      criarCategoriaDespesa: financeStoreSelectors.criarCategoriaDespesa(state),
      fetchCategoriasDespesa: financeStoreSelectors.fetchCategoriasDespesa(state),
      isSubmitting: financeStoreSelectors.isSubmitting(state),
      clearSubmitError: financeStoreSelectors.clearSubmitError(state),
      submitErrorMessage: financeStoreSelectors.submitErrorMessage(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const { form, setForm, problem, setProblem, localErrors, setLocalErrors, isSaving, setIsSaving, resetForm } =
    useFormDialog<FormState, FormErrors>({
      open,
      initialValues: { nome: '' },
      onReset: clearSubmitError,
    });

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isBusy = isSubmitting || isSaving;

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    handleClose();
  };

  const handleSubmit = async () => {
    const errors: FormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await criarCategoriaDespesa({ nome: form.nome.trim() });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await fetchCategoriasDespesa();
      showSuccess('Categoria cadastrada com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="xs">
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
              <Label color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Nova categoria
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Cadastre uma categoria para classificar despesas.
            </Typography>
          </Box>

          <IconButton
            onClick={handleDialogClose}
            aria-label="Fechar modal de categoria"
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Nome da categoria"
              placeholder="Ex: Matéria-prima"
              value={form.nome}
              onChange={(event) =>
                setForm((current) => ({ ...current, nome: event.target.value }))
              }
              error={Boolean(localErrors.nome || getFieldMessage(problem, 'nome'))}
              helperText={localErrors.nome ?? getFieldMessage(problem, 'nome')}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleDialogClose} color="inherit" disabled={isBusy}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Save />}
          size="large"
          disabled={isBusy}
        >
          {isBusy ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
