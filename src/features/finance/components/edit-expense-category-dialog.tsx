import { useEffect, useState } from 'react';
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
  type ProblemDetails,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface EditExpenseCategoryDialogProps {
  open: boolean;
  categoryId: number | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

type FormState = { nome: string };
type FormErrors = { nome?: string };

export default function EditExpenseCategoryDialog({
  open,
  categoryId,
  onClose,
  onUpdated,
}: EditExpenseCategoryDialogProps) {
  const {
    categoriasDespesa,
    atualizarCategoriaDespesa,
    isSubmitting,
    clearSubmitError,
  } = useFinanceStore(
    useShallow((state) => ({
      categoriasDespesa: financeStoreSelectors.categoriasDespesa(state),
      atualizarCategoriaDespesa:
        financeStoreSelectors.atualizarCategoriaDespesa(state),
      isSubmitting: financeStoreSelectors.isSubmitting(state),
      clearSubmitError: financeStoreSelectors.clearSubmitError(state),
    })),
  );
  const [form, setForm] = useState<FormState>({ nome: '' });
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (!open || categoryId === null) {
      setForm({ nome: '' });
      setProblem(null);
      setLocalErrors({});
      clearSubmitError();
      return;
    }

    const categoria = categoriasDespesa.find((c) => c.id === categoryId);
    if (categoria) {
      setForm({ nome: categoria.nome });
    }
  }, [open, categoryId, categoriasDespesa, clearSubmitError]);

  const handleClose = () => {
    setForm({ nome: '' });
    setProblem(null);
    setLocalErrors({});
    clearSubmitError();
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
    if (categoryId === null) return;

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
      const result = await atualizarCategoriaDespesa(categoryId, {
        nome: form.nome.trim(),
      });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onUpdated();
      showSuccess('Categoria alterada com sucesso.');
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
                Alterar categoria
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Atualize o nome da categoria selecionada.
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
        <FormFeedbackAlert message={problem?.detail} />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Nome da categoria"
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
