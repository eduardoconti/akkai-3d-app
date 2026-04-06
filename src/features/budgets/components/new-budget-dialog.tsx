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
import { Close, RequestQuote, Save } from '@mui/icons-material';
import { useBudgetStore } from '@/features/budgets/store/use-budget-store';
import {
  initialBudgetFormState,
  type BudgetFormErrors,
} from '@/features/budgets/types/budget-form';
import {
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  type ProblemDetails,
} from '@/shared';

interface NewBudgetDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewBudgetDialog({
  open,
  onClose,
}: NewBudgetDialogProps) {
  const { clearSubmitError, criarOrcamento, fetchOrcamentos, isSubmitting, submitErrorMessage } =
    useBudgetStore();
  const [form, setForm] = useState(initialBudgetFormState);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<BudgetFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (!open) {
      setForm(initialBudgetFormState);
      setProblem(null);
      setLocalErrors({});
      clearSubmitError();
    }
  }, [open, clearSubmitError]);

  const handleClose = () => {
    setForm(initialBudgetFormState);
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

  const validateForm = (): BudgetFormErrors => {
    const errors: BudgetFormErrors = {};

    if (form.nomeCliente.trim().length < 2) {
      errors.nomeCliente = 'Informe o nome do cliente com pelo menos 2 caracteres.';
    }

    if (form.telefoneCliente.trim().length < 8) {
      errors.telefoneCliente =
        'Informe um telefone com pelo menos 8 caracteres.';
    }

    if (form.descricao.trim().length > 1000) {
      errors.descricao = 'A descrição deve ter no máximo 1000 caracteres.';
    }

    if (form.linkSTL.trim().length > 0) {
      try {
        new URL(form.linkSTL.trim());
      } catch {
        errors.linkSTL = 'Informe um link STL válido.';
      }
    }

    return errors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    setLocalErrors(validationErrors);
    setProblem(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await criarOrcamento({
        nomeCliente: form.nomeCliente.trim(),
        telefoneCliente: form.telefoneCliente.trim(),
        descricao: form.descricao.trim() || undefined,
        linkSTL: form.linkSTL.trim() || undefined,
      });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await fetchOrcamentos({ pagina: 1 });
      showSuccess('Orçamento cadastrado com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const globalMessage = problem?.detail ?? submitErrorMessage;

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="md">
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
              <RequestQuote color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Novo orçamento
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Preencha os dados para registrar um novo orçamento.
            </Typography>
          </Box>

          <IconButton
            onClick={handleDialogClose}
            aria-label="Fechar modal de orçamento"
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={globalMessage} />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Nome do cliente"
              value={form.nomeCliente}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  nomeCliente: event.target.value,
                }))
              }
              error={Boolean(
                localErrors.nomeCliente || getFieldMessage(problem, 'nomeCliente'),
              )}
              helperText={
                localErrors.nomeCliente ?? getFieldMessage(problem, 'nomeCliente')
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Telefone do cliente"
              value={form.telefoneCliente}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  telefoneCliente: event.target.value,
                }))
              }
              error={Boolean(
                localErrors.telefoneCliente ||
                  getFieldMessage(problem, 'telefoneCliente'),
              )}
              helperText={
                localErrors.telefoneCliente ??
                getFieldMessage(problem, 'telefoneCliente')
              }
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Descrição"
              value={form.descricao}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  descricao: event.target.value,
                }))
              }
              error={Boolean(localErrors.descricao || getFieldMessage(problem, 'descricao'))}
              helperText={localErrors.descricao ?? getFieldMessage(problem, 'descricao')}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Link STL"
              placeholder="https://..."
              value={form.linkSTL}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  linkSTL: event.target.value,
                }))
              }
              error={Boolean(localErrors.linkSTL || getFieldMessage(problem, 'linkSTL'))}
              helperText={localErrors.linkSTL ?? getFieldMessage(problem, 'linkSTL')}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleDialogClose} color="inherit" disabled={isBusy}>
          Cancelar
        </Button>
        <Button
          onClick={() => {
            void handleSubmit();
          }}
          variant="contained"
          startIcon={<Save />}
          size="large"
          disabled={isBusy}
        >
          {isBusy ? 'Salvando...' : 'Salvar orçamento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
