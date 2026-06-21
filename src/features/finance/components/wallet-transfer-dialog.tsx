import { useEffect, useMemo, useState } from 'react';
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
import { Close, Save, SwapHoriz } from '@mui/icons-material';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import {
  convertDateToApiDateTimeFormat,
  initialWalletTransferFormState,
  type WalletTransferFormErrors,
  type WalletTransferFormState,
} from '@/features/finance/types/finance-form';
import {
  CurrencyField,
  DatePickerField,
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
  type TransferenciaCarteira,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface WalletTransferDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  transferencia?: TransferenciaCarteira | null;
}

export default function WalletTransferDialog({
  open,
  onClose,
  onSaved,
  transferencia,
}: WalletTransferDialogProps) {
  const isEditMode = transferencia != null;
  const {
    atualizarTransferenciaCarteira,
    carteiras,
    clearSubmitError,
    criarTransferenciaCarteira,
    excluirTransferenciaCarteira,
    fetchCarteiras,
    fetchTransferenciasCarteira,
    isSubmitting,
    submitErrorMessage,
  } = useFinanceStore(
    useShallow((state) => ({
      carteiras: financeStoreSelectors.carteiras(state),
      atualizarTransferenciaCarteira:
        financeStoreSelectors.atualizarTransferenciaCarteira(state),
      clearSubmitError: financeStoreSelectors.clearSubmitError(state),
      criarTransferenciaCarteira:
        financeStoreSelectors.criarTransferenciaCarteira(state),
      excluirTransferenciaCarteira:
        financeStoreSelectors.excluirTransferenciaCarteira(state),
      fetchCarteiras: financeStoreSelectors.fetchCarteiras(state),
      fetchTransferenciasCarteira:
        financeStoreSelectors.fetchTransferenciasCarteira(state),
      isSubmitting: financeStoreSelectors.isSubmitting(state),
      submitErrorMessage: financeStoreSelectors.submitErrorMessage(state),
    })),
  );
  const {
    form,
    setForm,
    setInitialForm,
    problem,
    setProblem,
    localErrors,
    setLocalErrors,
    isSaving,
    setIsSaving,
    resetForm,
    requestClose,
    discardChangesDialog,
  } = useFormDialog<WalletTransferFormState, WalletTransferFormErrors>({
    open,
    initialValues: initialWalletTransferFormState,
    onReset: clearSubmitError,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const isBusy = isSubmitting || isSaving || isDeleting;

  const carteirasOrdenadas = useMemo(
    () => [...carteiras].sort((a, b) => a.nome.localeCompare(b.nome)),
    [carteiras],
  );
  const carteirasDisponiveis = useMemo(
    () =>
      isEditMode
        ? carteirasOrdenadas
        : carteirasOrdenadas.filter((carteira) => carteira.ativa),
    [carteirasOrdenadas, isEditMode],
  );
  const carteirasDestino = useMemo(
    () =>
      carteirasDisponiveis.filter(
        (carteira) => carteira.id !== form.idCarteiraOrigem,
      ),
    [carteirasDisponiveis, form.idCarteiraOrigem],
  );

  useEffect(() => {
    if (!open) {
      setConfirmDeleteOpen(false);
      return;
    }

    void fetchCarteiras();

    if (transferencia) {
      setInitialForm({
        dataTransferencia: transferencia.dataTransferencia.substring(0, 10),
        idCarteiraOrigem: transferencia.idCarteiraOrigem,
        idCarteiraDestino: transferencia.idCarteiraDestino,
        valor: transferencia.valor / 100,
      });
    }
  }, [fetchCarteiras, open, setForm, transferencia]);

  useEffect(() => {
    if (
      form.idCarteiraDestino !== '' &&
      form.idCarteiraDestino === form.idCarteiraOrigem
    ) {
      setForm((current) => ({ ...current, idCarteiraDestino: '' }));
    }
  }, [form.idCarteiraDestino, form.idCarteiraOrigem, setForm]);

  const handleClose = () => {
    if (isBusy) {
      return;
    }

    setConfirmDeleteOpen(false);
    resetForm();
    onClose();
  };

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    requestClose(handleClose);
  };

  const handleDialogDismiss = () => {
    if (isBusy) {
      return;
    }

    onClose();
  };

  const handleConfirmDeleteDialogClose = () => {
    if (isBusy) {
      return;
    }

    setConfirmDeleteOpen(false);
  };

  const helperText = (field: keyof WalletTransferFormErrors) =>
    localErrors[field] ?? getFieldMessage(problem, field) ?? undefined;

  const handleSubmit = async () => {
    const errors: WalletTransferFormErrors = {};
    const dataTransferencia = convertDateToApiDateTimeFormat(
      form.dataTransferencia,
    );

    if (!dataTransferencia) {
      errors.dataTransferencia = 'Selecione a data da transferência.';
    }

    if (form.idCarteiraOrigem === '') {
      errors.idCarteiraOrigem = 'Selecione a carteira de origem.';
    }

    if (form.idCarteiraDestino === '') {
      errors.idCarteiraDestino = 'Selecione a carteira de destino.';
    }

    if (
      form.idCarteiraOrigem !== '' &&
      form.idCarteiraDestino !== '' &&
      form.idCarteiraOrigem === form.idCarteiraDestino
    ) {
      errors.idCarteiraDestino =
        'A carteira de destino deve ser diferente da origem.';
    }

    if (form.valor <= 0) {
      errors.valor = 'Informe um valor maior que zero.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        idCarteiraOrigem: Number(form.idCarteiraOrigem),
        idCarteiraDestino: Number(form.idCarteiraDestino),
        valor: Math.round(form.valor * 100),
        dataTransferencia: dataTransferencia!,
      };

      const result = isEditMode
        ? await atualizarTransferenciaCarteira(transferencia.id, payload)
        : await criarTransferenciaCarteira(payload);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      showSuccess(
        isEditMode
          ? 'Transferência alterada com sucesso.'
          : 'Transferência registrada com sucesso.',
      );
      await fetchCarteiras();
      await fetchTransferenciasCarteira();
      await onSaved();
      resetForm();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!transferencia) return;

    setIsDeleting(true);
    setProblem(null);

    try {
      const result = await excluirTransferenciaCarteira(transferencia.id);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      showSuccess('Transferência excluída com sucesso.');
      await fetchCarteiras();
      await fetchTransferenciasCarteira();
      await onSaved();
      setConfirmDeleteOpen(false);
      resetForm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleDialogDismiss} fullWidth maxWidth="sm">
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
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
              >
                <SwapHoriz color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  {isEditMode ? 'Alterar transferência' : 'Nova transferência'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {isEditMode
                  ? 'Altere os dados da transferência selecionada.'
                  : 'Transfira valores entre carteiras financeiras.'}
              </Typography>
            </Box>

            <IconButton
              onClick={handleDialogClose}
              aria-label="Fechar modal de transferência"
              disabled={isBusy}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                label="Carteira de origem"
                required
                value={form.idCarteiraOrigem}
                disabled={isBusy}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    idCarteiraOrigem:
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value),
                  }))
                }
                error={Boolean(helperText('idCarteiraOrigem'))}
                helperText={helperText('idCarteiraOrigem')}
              >
                <MenuItem value="">Selecione a origem</MenuItem>
                {carteirasDisponiveis.map((carteira) => (
                  <MenuItem key={carteira.id} value={carteira.id}>
                    {carteira.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                label="Carteira de destino"
                required
                value={form.idCarteiraDestino}
                disabled={isBusy}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    idCarteiraDestino:
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value),
                  }))
                }
                error={Boolean(helperText('idCarteiraDestino'))}
                helperText={helperText('idCarteiraDestino')}
              >
                <MenuItem value="">Selecione o destino</MenuItem>
                {carteirasDestino.map((carteira) => (
                  <MenuItem key={carteira.id} value={carteira.id}>
                    {carteira.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <DatePickerField
                label="Data da transferência"
                value={form.dataTransferencia}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    dataTransferencia: value,
                  }))
                }
                slotProps={{
                  textField: {
                    required: true,
                    error: Boolean(helperText('dataTransferencia')),
                    helperText: helperText('dataTransferencia'),
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <CurrencyField
                label="Valor"
                required
                value={form.valor}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, valor: value }))
                }
                error={Boolean(helperText('valor'))}
                helperText={helperText('valor')}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
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
            <Button
              onClick={handleDialogClose}
              color="inherit"
              disabled={isBusy}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSubmit}
              disabled={isBusy}
            >
              {isSaving || isSubmitting
                ? 'Salvando...'
                : isEditMode
                  ? 'Salvar alterações'
                  : 'Salvar transferência'}
            </Button>
          </Box>
        </DialogActions>
        {discardChangesDialog}
      </Dialog>

      <Dialog
        open={confirmDeleteOpen}
        onClose={handleConfirmDeleteDialogClose}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Excluir transferência</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Tem certeza que deseja excluir esta transferência? Essa ação não
            pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleConfirmDeleteDialogClose}
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
