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
import { useFinanceStore } from '@/features/finance/store/use-finance-store';
import {
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  type ProblemDetails,
} from '@/shared';

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
  const { criarCategoriaDespesa, fetchCategoriasDespesa, isSubmitting, clearSubmitError, submitErrorMessage } =
    useFinanceStore();
  const [form, setForm] = useState<FormState>({ nome: '' });
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<FormErrors>({});
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (!open) {
      setForm({ nome: '' });
      setProblem(null);
      setLocalErrors({});
      clearSubmitError();
    }
  }, [open, clearSubmitError]);

  const handleClose = () => {
    setForm({ nome: '' });
    setProblem(null);
    setLocalErrors({});
    clearSubmitError();
    onClose();
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

    const result = await criarCategoriaDespesa({ nome: form.nome.trim() });

    if (!result.success) {
      setProblem(result.problem);
      return;
    }

    await fetchCategoriasDespesa();
    showSuccess('Categoria cadastrada com sucesso.');
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
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

          <IconButton onClick={handleClose} aria-label="Fechar modal de categoria">
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
        <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Save />}
          size="large"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
