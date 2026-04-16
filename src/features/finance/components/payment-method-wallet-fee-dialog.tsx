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
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AccountBalanceWallet,
  Close,
  Percent,
  Save,
} from '@mui/icons-material';
import {
  ALL_MEIOS_PAGAMENTO,
  MEIO_PAGAMENTO_LABEL,
} from '@/features/finance/types/finance-form';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import {
  FormFeedbackAlert,
  getFieldMessage,
  getProblemDetailsFromError,
  useFeedbackStore,
  useFormDialog,
} from '@/shared';
import type {
  MeioPagamento,
  TaxaMeioPagamentoCarteiraInput,
} from '@/shared/lib/types/domain';
import { useShallow } from 'zustand/react/shallow';

interface PaymentMethodWalletFeeDialogProps {
  open: boolean;
  feeId?: number | null;
  onClose: () => void;
}

interface FeeFormState {
  idCarteira: number | '';
  meioPagamento: MeioPagamento;
  percentual: string;
  ativa: boolean;
}

interface FeeFormErrors {
  idCarteira?: string;
  percentual?: string;
}

const initialFeeFormState: FeeFormState = {
  idCarteira: '',
  meioPagamento: 'PIX',
  percentual: '',
  ativa: true,
};

function normalizePercentualInput(value: string): string {
  return value.replace(',', '.');
}

function parsePercentualInput(value: string): number {
  return Number(normalizePercentualInput(value));
}

export default function PaymentMethodWalletFeeDialog({
  open,
  feeId,
  onClose,
}: PaymentMethodWalletFeeDialogProps) {
  const isEditMode = feeId != null;
  const {
    carteiras,
    clearSubmitError,
    criarTaxaMeioPagamentoCarteira,
    atualizarTaxaMeioPagamentoCarteira,
    excluirTaxaMeioPagamentoCarteira,
    fetchCarteiras,
    fetchTaxasMeioPagamentoCarteira,
    obterTaxaMeioPagamentoCarteiraPorId,
    isSubmitting,
    submitErrorMessage,
  } = useFinanceStore(
    useShallow((state) => ({
      carteiras: financeStoreSelectors.carteiras(state),
      clearSubmitError: financeStoreSelectors.clearSubmitError(state),
      criarTaxaMeioPagamentoCarteira:
        financeStoreSelectors.criarTaxaMeioPagamentoCarteira(state),
      atualizarTaxaMeioPagamentoCarteira:
        financeStoreSelectors.atualizarTaxaMeioPagamentoCarteira(state),
      excluirTaxaMeioPagamentoCarteira:
        financeStoreSelectors.excluirTaxaMeioPagamentoCarteira(state),
      fetchCarteiras: financeStoreSelectors.fetchCarteiras(state),
      fetchTaxasMeioPagamentoCarteira:
        financeStoreSelectors.fetchTaxasMeioPagamentoCarteira(state),
      obterTaxaMeioPagamentoCarteiraPorId:
        financeStoreSelectors.obterTaxaMeioPagamentoCarteiraPorId(state),
      isSubmitting: financeStoreSelectors.isSubmitting(state),
      submitErrorMessage: financeStoreSelectors.submitErrorMessage(state),
    })),
  );
  const { form, setForm, problem, setProblem, localErrors, setLocalErrors, isSaving, setIsSaving } =
    useFormDialog<FeeFormState, FeeFormErrors>({
      open,
      initialValues: initialFeeFormState,
      onReset: clearSubmitError,
    });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (open) {
      void fetchCarteiras();
    }
  }, [fetchCarteiras, open]);

  useEffect(() => {
    if (!open) {
      setConfirmDeleteOpen(false);
      return;
    }

    if (!isEditMode || feeId == null) return;

    let active = true;

    const loadFee = async () => {
      setIsLoading(true);
      setProblem(null);
      setLocalErrors({});

      try {
        const taxa = await obterTaxaMeioPagamentoCarteiraPorId(feeId);

        if (!active) {
          return;
        }

        setForm({
          idCarteira: taxa.idCarteira,
          meioPagamento: taxa.meioPagamento,
          percentual: taxa.percentual.toFixed(2).replace('.', ','),
          ativa: taxa.ativa,
        });
      } catch (error) {
        if (active) {
          setProblem(getProblemDetailsFromError(error));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadFee();

    return () => {
      active = false;
    };
  }, [feeId, isEditMode, obterTaxaMeioPagamentoCarteiraPorId, open]);

  const availableWallets = useMemo(
    () => [...carteiras].sort((a, b) => a.nome.localeCompare(b.nome)),
    [carteiras],
  );

  const availablePaymentMethods = useMemo(() => {
    const carteiraSelecionada = availableWallets.find(
      (carteira) => carteira.id === form.idCarteira,
    );

    if (!carteiraSelecionada?.meiosPagamento?.length) {
      return ALL_MEIOS_PAGAMENTO;
    }

    return carteiraSelecionada.meiosPagamento;
  }, [availableWallets, form.idCarteira]);

  useEffect(() => {
    if (!availablePaymentMethods.includes(form.meioPagamento)) {
      setForm((current) => ({
        ...current,
        meioPagamento: availablePaymentMethods[0] ?? 'PIX',
      }));
    }
  }, [availablePaymentMethods, form.meioPagamento]);

  const isBusy = isSubmitting || isSaving || isLoading || isDeleting;

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    setConfirmDeleteOpen(false);
    onClose();
  };

  const validateForm = (): FeeFormErrors => {
    const errors: FeeFormErrors = {};
    const percentual = parsePercentualInput(form.percentual);

    if (form.idCarteira === '') {
      errors.idCarteira = 'Selecione a carteira da taxa.';
    }

    if (!Number.isFinite(percentual)) {
      errors.percentual = 'Informe um percentual válido.';
    } else if (percentual < 0) {
      errors.percentual = 'O percentual não pode ser negativo.';
    } else if (percentual > 100) {
      errors.percentual = 'O percentual deve ser de no máximo 100.';
    }

    return errors;
  };

  const buildPayload = (): TaxaMeioPagamentoCarteiraInput => ({
    idCarteira: Number(form.idCarteira),
    meioPagamento: form.meioPagamento,
    percentual: parsePercentualInput(form.percentual),
    ativa: form.ativa,
  });

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    setLocalErrors(validationErrors);
    setProblem(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = buildPayload();
      const result =
        isEditMode && feeId != null
          ? await atualizarTaxaMeioPagamentoCarteira(feeId, payload)
          : await criarTaxaMeioPagamentoCarteira(payload);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await fetchTaxasMeioPagamentoCarteira();
      showSuccess(
        isEditMode
          ? 'Taxa alterada com sucesso.'
          : 'Taxa cadastrada com sucesso.',
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!isEditMode || feeId == null) {
      return;
    }

    setIsDeleting(true);
    setProblem(null);

    try {
      const result = await excluirTaxaMeioPagamentoCarteira(feeId);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await fetchTaxasMeioPagamentoCarteira();
      showSuccess('Taxa excluída com sucesso.');
      setConfirmDeleteOpen(false);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const getErrorMessage = (field: keyof FeeFormErrors) =>
    localErrors[field] ?? getFieldMessage(problem, field) ?? undefined;

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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <AccountBalanceWallet color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  {isEditMode ? 'Alterar taxa' : 'Nova taxa'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Configure a taxa percentual por carteira e meio de pagamento.
              </Typography>
            </Box>

            <IconButton
              onClick={handleDialogClose}
              aria-label="Fechar modal de taxa"
              disabled={isBusy}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <TextField
                select
                fullWidth
                label="Carteira"
                value={form.idCarteira}
                disabled={isLoading}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    idCarteira:
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value),
                  }));
                }}
                error={Boolean(getErrorMessage('idCarteira'))}
                helperText={getErrorMessage('idCarteira')}
              >
                <MenuItem value="">Selecione a carteira</MenuItem>
                {availableWallets.map((carteira) => (
                  <MenuItem key={carteira.id} value={carteira.id}>
                    {carteira.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                select
                fullWidth
                label="Pagamento"
                value={form.meioPagamento}
                disabled={isLoading}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    meioPagamento: event.target.value as MeioPagamento,
                  }));
                }}
              >
                {availablePaymentMethods.map((meioPagamento) => (
                  <MenuItem key={meioPagamento} value={meioPagamento}>
                    {MEIO_PAGAMENTO_LABEL[meioPagamento]}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Percentual da taxa"
                placeholder="Ex: 2,99"
                value={form.percentual}
                disabled={isLoading}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    percentual: event.target.value,
                  }));
                }}
                error={Boolean(getErrorMessage('percentual'))}
                helperText={getErrorMessage('percentual') ?? 'Use até 2 casas decimais.'}
                slotProps={{
                  htmlInput: {
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.,]?[0-9]*',
                    min: 0,
                    max: 100,
                  },
                  input: {
                    startAdornment: <Percent fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.ativa}
                    disabled={isLoading}
                    onChange={(event) => {
                      setForm((current) => ({
                        ...current,
                        ativa: event.target.checked,
                      }));
                    }}
                  />
                }
                label="Taxa ativa"
                sx={{ mt: { xs: 0, md: 1 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            {isEditMode ? (
              <Button
                color="error"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={isBusy}
              >
                Excluir
              </Button>
            ) : null}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5 }}>
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
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onClose={handleDialogClose} fullWidth maxWidth="xs">
        <DialogTitle>Excluir taxa</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Tem certeza que deseja excluir esta taxa? Essa ação não pode ser desfeita.
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
            onClick={() => {
              void handleConfirmDelete();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? 'Excluindo...' : 'Confirmar exclusão'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
