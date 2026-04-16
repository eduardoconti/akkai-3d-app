import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  FormControlLabel,
  FormHelperText,
  IconButton,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { AccountBalanceWallet, Close, Save } from '@mui/icons-material';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
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

interface EditWalletDialogProps {
  open: boolean;
  walletId: number | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

function normalizePercentualInput(value: string): string {
  return value.replace(',', '.');
}

function parsePercentualInput(value: string): number {
  return Number(normalizePercentualInput(value));
}

export default function EditWalletDialog({
  open,
  walletId,
  onClose,
  onUpdated,
}: EditWalletDialogProps) {
  const {
    atualizarCarteira,
    clearSubmitError,
    excluirCarteira,
    isSubmitting,
    obterCarteiraPorId,
    submitErrorMessage,
  } = useFinanceStore(
    useShallow((state) => ({
      atualizarCarteira: financeStoreSelectors.atualizarCarteira(state),
      clearSubmitError: financeStoreSelectors.clearSubmitError(state),
      excluirCarteira: financeStoreSelectors.excluirCarteira(state),
      isSubmitting: financeStoreSelectors.isSubmitting(state),
      obterCarteiraPorId: financeStoreSelectors.obterCarteiraPorId(state),
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
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open || walletId === null) return;

    let active = true;

    const loadWallet = async () => {
      setIsLoading(true);
      setProblem(null);
      setLocalErrors({});

      try {
        const carteira = await obterCarteiraPorId(walletId);

        if (!active) {
          return;
        }

        setForm({
          nome: carteira.nome,
          ativa: carteira.ativa,
          meiosPagamento: carteira.meiosPagamento ?? [],
          consideraImpostoVenda: carteira.consideraImpostoVenda ?? false,
          percentualImpostoVenda:
            carteira.percentualImpostoVenda != null
              ? carteira.percentualImpostoVenda.toFixed(2).replace('.', ',')
              : '',
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setProblem(getProblemDetailsFromError(error));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadWallet();

    return () => {
      active = false;
    };
  }, [obterCarteiraPorId, open, walletId]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isBusy = isSubmitting || isLoading || isSaving || isDeleting;

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    handleClose();
  };

  const handleSubmit = async () => {
    if (walletId === null) {
      return;
    }

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
      const result = await atualizarCarteira(walletId, {
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

      await onUpdated();
      showSuccess('Carteira alterada com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (walletId === null) {
      return;
    }

    setIsDeleting(true);
    setProblem(null);

    try {
      const result = await excluirCarteira(walletId);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onUpdated();
      showSuccess('Carteira excluída com sucesso.');
      setConfirmDeleteOpen(false);
      handleClose();
    } finally {
      setIsDeleting(false);
    }
  };

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
                  Alterar carteira
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Atualize os dados da carteira selecionada.
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
                disabled={isLoading}
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
                disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                disabled={isLoading || !form.consideraImpostoVenda}
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

        <DialogActions
          sx={{ px: 3, py: 2, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}
        >
          <Box>
            <Button color="error" onClick={() => setConfirmDeleteOpen(true)} disabled={isBusy}>
              Excluir
            </Button>
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
              {isSaving || isSubmitting ? 'Salvando...' : 'Salvar carteira'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      <Dialog open={confirmDeleteOpen} onClose={handleDialogClose} fullWidth maxWidth="xs">
        <DialogTitle>Excluir carteira</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Tem certeza que deseja excluir esta carteira? Essa ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmDeleteOpen(false)} disabled={isDeleting}>
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
