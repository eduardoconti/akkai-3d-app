import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AddCircleOutline,
  Close,
  History,
  RemoveCircleOutline,
  Save,
} from '@mui/icons-material';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import {
  convertDateToApiDateTimeFormat,
  formatApiDateToDisplay,
  initialWalletAdjustmentFormState,
  type WalletAdjustmentFormErrors,
  type WalletAdjustmentFormState,
} from '@/features/finance/types/finance-form';
import {
  CurrencyField,
  DatePickerField,
  FormFeedbackAlert,
  formatCurrency,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
  type AjusteCarteira,
  type Carteira,
  type TipoAjusteCarteira,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface WalletAdjustmentDialogProps {
  open: boolean;
  carteira: Carteira | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

const TIPO_AJUSTE_LABEL: Record<TipoAjusteCarteira, string> = {
  CREDITO: 'Crédito',
  DEBITO: 'Débito',
};

export default function WalletAdjustmentDialog({
  open,
  carteira,
  onClose,
  onSaved,
}: WalletAdjustmentDialogProps) {
  const {
    clearSubmitError,
    criarAjusteCarteira,
    isSubmitting,
    listarAjustesCarteira,
    submitErrorMessage,
  } = useFinanceStore(
    useShallow((state) => ({
      clearSubmitError: financeStoreSelectors.clearSubmitError(state),
      criarAjusteCarteira: financeStoreSelectors.criarAjusteCarteira(state),
      isSubmitting: financeStoreSelectors.isSubmitting(state),
      listarAjustesCarteira: financeStoreSelectors.listarAjustesCarteira(state),
      submitErrorMessage: financeStoreSelectors.submitErrorMessage(state),
    })),
  );
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
  } = useFormDialog<WalletAdjustmentFormState, WalletAdjustmentFormErrors>({
    open,
    initialValues: initialWalletAdjustmentFormState,
    onReset: clearSubmitError,
  });
  const [ajustes, setAjustes] = useState<AjusteCarteira[]>([]);
  const [isLoadingAjustes, setIsLoadingAjustes] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  const ajustesRecentes = useMemo(() => ajustes.slice(0, 5), [ajustes]);
  const isBusy = isSubmitting || isSaving;

  useEffect(() => {
    if (!open || !carteira) {
      setAjustes([]);
      return;
    }

    setIsLoadingAjustes(true);
    listarAjustesCarteira(carteira.id)
      .then(setAjustes)
      .catch(() => setAjustes([]))
      .finally(() => setIsLoadingAjustes(false));
  }, [open, carteira, listarAjustesCarteira]);

  const handleClose = () => {
    resetForm();
    setAjustes([]);
    onClose();
  };

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    handleClose();
  };

  const handleSubmit = async () => {
    if (!carteira) {
      return;
    }

    const errors: WalletAdjustmentFormErrors = {};
    const dataAjuste = convertDateToApiDateTimeFormat(form.dataAjuste);

    if (!dataAjuste) {
      errors.dataAjuste = 'Selecione a data do ajuste.';
    }

    if (form.valor <= 0) {
      errors.valor = 'Informe um valor maior que zero.';
    }

    if (form.motivo.trim().length < 3) {
      errors.motivo = 'Informe um motivo com pelo menos 3 caracteres.';
    }

    if (Object.keys(errors).length > 0) {
      setLocalErrors(errors);
      return;
    }

    setLocalErrors({});
    setProblem(null);
    setIsSaving(true);

    const result = await criarAjusteCarteira(carteira.id, {
      dataAjuste: dataAjuste!,
      tipo: form.tipo,
      valor: Math.round(form.valor * 100),
      motivo: form.motivo.trim(),
      observacao: form.observacao.trim() || undefined,
    });

    setIsSaving(false);

    if (!result.success) {
      setProblem(result.problem);
      return;
    }

    showSuccess('Ajuste de carteira lançado com sucesso.');
    await onSaved();
    const ajustesAtualizados = await listarAjustesCarteira(carteira.id);
    setAjustes(ajustesAtualizados);
    resetForm();
  };

  const helperText = (field: keyof WalletAdjustmentFormErrors) =>
    localErrors[field] ?? getFieldMessage(problem, field) ?? undefined;

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="wallet-adjustment-dialog-title"
    >
      <DialogTitle id="wallet-adjustment-dialog-title">
        <Stack direction="row" alignItems="center" spacing={1}>
          <History color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6">Ajustar saldo</Typography>
            <Typography variant="body2" color="text.secondary">
              {carteira?.nome ?? 'Carteira'}
            </Typography>
          </Box>
          <IconButton
            aria-label="Fechar modal de ajuste"
            onClick={handleDialogClose}
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

          <Box>
            <Typography variant="caption" color="text.secondary">
              Saldo atual
            </Typography>
            <Typography
              variant="h5"
              fontWeight={800}
              color={
                (carteira?.saldoAtual ?? 0) < 0 ? 'error.main' : 'success.main'
              }
            >
              {formatCurrency(carteira?.saldoAtual ?? 0)}
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <DatePickerField
                label="Data do ajuste"
                value={form.dataAjuste}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, dataAjuste: value }))
                }
                slotProps={{
                  textField: {
                    error: Boolean(helperText('dataAjuste')),
                    helperText: helperText('dataAjuste'),
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <CurrencyField
                label="Valor"
                value={form.valor}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, valor: value }))
                }
                error={Boolean(helperText('valor'))}
                helperText={helperText('valor')}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <ToggleButtonGroup
                exclusive
                fullWidth
                color="primary"
                value={form.tipo}
                onChange={(_event, value: TipoAjusteCarteira | null) => {
                  if (!value) return;
                  setForm((current) => ({ ...current, tipo: value }));
                }}
                aria-label="tipo do ajuste"
                sx={{ height: '56px' }}
              >
                <ToggleButton value="CREDITO" aria-label="crédito">
                  <AddCircleOutline sx={{ mr: 1 }} />
                  Crédito
                </ToggleButton>
                <ToggleButton value="DEBITO" aria-label="débito">
                  <RemoveCircleOutline sx={{ mr: 1 }} />
                  Débito
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Motivo"
                value={form.motivo}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    motivo: event.target.value,
                  }))
                }
                fullWidth
                error={Boolean(helperText('motivo'))}
                helperText={helperText('motivo')}
                inputProps={{ maxLength: 120 }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Observação"
                value={form.observacao}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    observacao: event.target.value,
                  }))
                }
                fullWidth
                multiline
                minRows={3}
                error={Boolean(helperText('observacao'))}
                helperText={helperText('observacao')}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>
          </Grid>

          <Divider />

          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Últimos ajustes</Typography>
            {isLoadingAjustes ? (
              <Typography variant="body2" color="text.secondary">
                Carregando ajustes...
              </Typography>
            ) : ajustesRecentes.length > 0 ? (
              <Stack divider={<Divider flexItem />}>
                {ajustesRecentes.map((ajuste) => (
                  <Stack
                    key={ajuste.id}
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ py: 1 }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          label={TIPO_AJUSTE_LABEL[ajuste.tipo]}
                          color={
                            ajuste.tipo === 'CREDITO' ? 'success' : 'error'
                          }
                          variant="outlined"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {formatApiDateToDisplay(ajuste.dataAjuste)}
                        </Typography>
                      </Stack>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ mt: 0.5 }}
                      >
                        {ajuste.motivo}
                      </Typography>
                      {ajuste.observacao ? (
                        <Typography variant="caption" color="text.secondary">
                          {ajuste.observacao}
                        </Typography>
                      ) : null}
                    </Box>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      color={
                        ajuste.tipo === 'CREDITO'
                          ? 'success.main'
                          : 'error.main'
                      }
                    >
                      {ajuste.tipo === 'CREDITO' ? '+' : '-'}
                      {formatCurrency(ajuste.valor)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Nenhum ajuste lançado para esta carteira.
              </Typography>
            )}
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleDialogClose} disabled={isBusy}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSubmit}
          disabled={isBusy}
        >
          {isBusy ? 'Salvando...' : 'Salvar ajuste'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
