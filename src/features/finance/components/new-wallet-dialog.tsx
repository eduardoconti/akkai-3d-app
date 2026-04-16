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
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
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
  useFormDialog,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface NewWalletDialogProps {
  open: boolean;
  onClose: () => void;
}

function normalizePercentualInput(value: string): string {
  return value.replace(',', '.');
}

function parsePercentualInput(value: string): number {
  return Number(normalizePercentualInput(value));
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
  } = useFinanceStore(
    useShallow((state) => ({
      clearSubmitError: financeStoreSelectors.clearSubmitError(state),
      criarCarteira: financeStoreSelectors.criarCarteira(state),
      fetchCarteiras: financeStoreSelectors.fetchCarteiras(state),
      isSubmitting: financeStoreSelectors.isSubmitting(state),
      submitErrorMessage: financeStoreSelectors.submitErrorMessage(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const { form, setForm, problem, setProblem, localErrors, setLocalErrors, isSaving, setIsSaving, resetForm } =
    useFormDialog<WalletFormState, WalletFormErrors>({
      open,
      initialValues: initialWalletFormState,
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
    const errors: WalletFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    if (form.consideraImpostoVenda) {
      const percentual = parsePercentualInput(form.percentualImpostoVenda);

      if (!Number.isFinite(percentual)) {
        errors.percentualImpostoVenda = 'Informe um percentual de imposto válido.';
      } else if (percentual < 0) {
        errors.percentualImpostoVenda = 'O percentual de imposto não pode ser negativo.';
      } else if (percentual > 100) {
        errors.percentualImpostoVenda = 'O percentual de imposto deve ser de no máximo 100.';
      }
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await criarCarteira({
        nome: form.nome.trim(),
        ativa: form.ativa,
        meiosPagamento: form.meiosPagamento,
        consideraImpostoVenda: form.consideraImpostoVenda,
        percentualImpostoVenda: form.consideraImpostoVenda
          ? parsePercentualInput(form.percentualImpostoVenda)
          : null,
      });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await fetchCarteiras();
      showSuccess('Carteira cadastrada com sucesso.');
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
              <AccountBalanceWallet color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Nova carteira
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Preencha os dados para cadastrar uma carteira.
            </Typography>
          </Box>

          <IconButton
            onClick={handleDialogClose}
            aria-label="Fechar modal de carteira"
            disabled={isBusy}
          >
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

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.consideraImpostoVenda}
                  onChange={(_event, checked) =>
                    setForm((current) => ({
                      ...current,
                      consideraImpostoVenda: checked,
                      percentualImpostoVenda: checked ? current.percentualImpostoVenda : '',
                    }))
                  }
                />
              }
              label="Considerar imposto sobre vendas"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Percentual do imposto"
              placeholder="Ex: 4,00"
              value={form.percentualImpostoVenda}
              disabled={!form.consideraImpostoVenda}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  percentualImpostoVenda: event.target.value,
                }))
              }
              error={Boolean(
                localErrors.percentualImpostoVenda ||
                  getFieldMessage(problem, 'percentualImpostoVenda'),
              )}
              helperText={
                localErrors.percentualImpostoVenda ??
                getFieldMessage(problem, 'percentualImpostoVenda') ??
                'Use vírgula ou ponto. Ex: 4,00'
              }
              slotProps={{
                htmlInput: {
                  inputMode: 'decimal',
                  pattern: '[0-9]*[.,]?[0-9]*',
                },
              }}
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
          {isBusy ? 'Salvando...' : 'Salvar Carteira'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
