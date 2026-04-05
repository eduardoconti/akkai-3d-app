import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormHelperText,
  IconButton,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { AccountBalanceWallet, Close, Save } from '@mui/icons-material';
import { useFinanceStore } from '@/features/finance/store/use-finance-store';
import {
  ALL_MEIOS_PAGAMENTO,
  MEIO_PAGAMENTO_LABEL,
  initialWalletFormState,
  type WalletFormErrors,
  type WalletFormState,
} from '@/features/finance/types/finance-form';
import type { MeioPagamento } from '@/shared';
import {
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  type ProblemDetails,
} from '@/shared';

interface NewWalletDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewWalletDialog({
  open,
  onClose,
}: NewWalletDialogProps) {
  const {
    clearSubmitError,
    criarCarteira,
    fetchCarteiras,
    isSubmitting,
    submitErrorMessage,
  } = useFinanceStore();
  const [form, setForm] = useState<WalletFormState>(initialWalletFormState);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<WalletFormErrors>({});
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (!open) {
      setForm(initialWalletFormState);
      setProblem(null);
      setLocalErrors({});
      clearSubmitError();
    }
  }, [open, clearSubmitError]);

  const handleClose = () => {
    setForm(initialWalletFormState);
    setProblem(null);
    setLocalErrors({});
    clearSubmitError();
    onClose();
  };

  const handleSubmit = async () => {
    const errors: WalletFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const result = await criarCarteira({
      nome: form.nome.trim(),
      ativa: form.ativa,
      meiosPagamento: form.meiosPagamento,
    });

    if (!result.success) {
      setProblem(result.problem);
      return;
    }

    await fetchCarteiras();
    showSuccess('Carteira cadastrada com sucesso.');
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
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
              <AccountBalanceWallet color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Nova carteira
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Preencha os dados para cadastrar uma carteira.
            </Typography>
          </Box>

          <IconButton onClick={handleClose} aria-label="Fechar modal de carteira">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField
              fullWidth
              label="Nome da carteira"
              placeholder="Ex: Nubank PIX"
              value={form.nome}
              onChange={(event) =>
                setForm((current) => ({ ...current, nome: event.target.value }))
              }
              error={Boolean(localErrors.nome || getFieldMessage(problem, 'nome'))}
              helperText={localErrors.nome ?? getFieldMessage(problem, 'nome')}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Meios de pagamento aceitos{' '}
              <Typography component="span" variant="caption" color="text.disabled">
                (vazio = aceita todos)
              </Typography>
            </Typography>
            <ToggleButtonGroup
              value={form.meiosPagamento}
              onChange={(_event, value: MeioPagamento[]) =>
                setForm((current) => ({ ...current, meiosPagamento: value }))
              }
              size="small"
            >
              {ALL_MEIOS_PAGAMENTO.map((meio) => (
                <ToggleButton key={meio} value={meio}>
                  {MEIO_PAGAMENTO_LABEL[meio]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <FormHelperText>
              Selecione quais meios serão aceitos nesta carteira.
            </FormHelperText>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.ativa}
                  onChange={(_event, checked) =>
                    setForm((current) => ({ ...current, ativa: checked }))
                  }
                />
              }
              label="Carteira ativa"
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
          {isSubmitting ? 'Salvando...' : 'Salvar Carteira'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
