import { useEffect, useMemo, useState, useRef } from 'react';
import {
  Alert,
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
import { Close, ReceiptLong, Save } from '@mui/icons-material';
import {
  financeStoreSelectors,
  useFinanceStore,
} from '@/features/finance/store/use-finance-store';
import {
  convertDateToApiDateTimeFormat,
  initialExpenseFormState,
  type ExpenseFormErrors,
  type ExpenseFormState,
} from '@/features/finance/types/finance-form';
import {
  DatePickerField,
  CurrencyField,
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  type Despesa,
  type MeioPagamento,
  type ProblemDetails,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface NewExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  despesa?: Despesa | null;
}

export default function NewExpenseDialog({
  open,
  onClose,
  despesa,
}: NewExpenseDialogProps) {
  const isEditMode = despesa != null;
  const {
    carteiras,
    categoriasDespesa,
    clearSubmitError,
    criarDespesa,
    excluirDespesa,
    atualizarDespesa,
    fetchCarteiras,
    fetchCategoriasDespesa,
    fetchDespesas,
    fetchFeiras,
    feiras,
    isSubmitting,
    submitErrorMessage,
  } = useFinanceStore(
    useShallow((state) => ({
      carteiras: financeStoreSelectors.carteiras(state),
      categoriasDespesa: financeStoreSelectors.categoriasDespesa(state),
      clearSubmitError: financeStoreSelectors.clearSubmitError(state),
      criarDespesa: financeStoreSelectors.criarDespesa(state),
      excluirDespesa: financeStoreSelectors.excluirDespesa(state),
      atualizarDespesa: financeStoreSelectors.atualizarDespesa(state),
      fetchCarteiras: financeStoreSelectors.fetchCarteiras(state),
      fetchCategoriasDespesa: financeStoreSelectors.fetchCategoriasDespesa(state),
      fetchDespesas: financeStoreSelectors.fetchDespesas(state),
      fetchFeiras: financeStoreSelectors.fetchFeiras(state),
      feiras: financeStoreSelectors.feiras(state),
      isSubmitting: financeStoreSelectors.isSubmitting(state),
      submitErrorMessage: financeStoreSelectors.submitErrorMessage(state),
    })),
  );
  const [form, setForm] = useState<ExpenseFormState>(initialExpenseFormState);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<ExpenseFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (open) {
      void fetchCarteiras();
      void fetchCategoriasDespesa();
      void fetchFeiras();

      if (despesa) {
        setForm({
          dataLancamento: despesa.dataLancamento.substring(0, 10),
          descricao: despesa.descricao,
          valor: despesa.valor / 100,
          idCategoria: despesa.idCategoria,
          meioPagamento: despesa.meioPagamento,
          idCarteira: despesa.idCarteira,
          idFeira: despesa.idFeira ?? '',
          observacao: despesa.observacao ?? '',
        });
      }
      return;
    }

    setForm(initialExpenseFormState);
    setProblem(null);
    setLocalErrors({});
    setConfirmDeleteOpen(false);
    clearSubmitError();
  }, [
    open,
    despesa,
    isEditMode,
    fetchCarteiras,
    fetchCategoriasDespesa,
    fetchFeiras,
    clearSubmitError,
  ]);

  useEffect(() => {
    const carteiraPadrao = carteiras.find((carteira) => carteira.ativa);

    if (open && !isEditMode && form.idCarteira === '' && carteiraPadrao) {
      setForm((current) => ({
        ...current,
        idCarteira: carteiraPadrao.id,
      }));
    }
  }, [open, isEditMode, carteiras, form.idCarteira]);

  useEffect(() => {
    if (open && !isEditMode && form.idCategoria === '' && categoriasDespesa.length > 0) {
      setForm((current) => ({
        ...current,
        idCategoria: categoriasDespesa[0]!.id,
      }));
    }
  }, [open, isEditMode, categoriasDespesa, form.idCategoria]);

  const activeWallets = useMemo(
    () => carteiras.filter((carteira) => carteira.ativa),
    [carteiras],
  );

  const availableMeiosPagamento = useMemo(() => {
    const carteira = carteiras.find((c) => c.id === form.idCarteira);
    if (!carteira?.meiosPagamento?.length) return ['DIN', 'DEB', 'CRE', 'PIX'] as MeioPagamento[];
    return carteira.meiosPagamento;
  }, [carteiras, form.idCarteira]);

  const prevCarteira = useRef(form.idCarteira);
  useEffect(() => {
    if (prevCarteira.current === form.idCarteira) return;
    prevCarteira.current = form.idCarteira;
    if (!availableMeiosPagamento.includes(form.meioPagamento)) {
      setForm((current) => ({
        ...current,
        meioPagamento: availableMeiosPagamento[0]!,
      }));
    }
  }, [form.idCarteira, form.meioPagamento, availableMeiosPagamento]);

  const handleClose = () => {
    setForm(initialExpenseFormState);
    setProblem(null);
    setLocalErrors({});
    setConfirmDeleteOpen(false);
    clearSubmitError();
    onClose();
  };

  const isBusy = isSubmitting || isSaving || isDeleting;

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    handleClose();
  };

  const handleConfirmDeleteDialogClose = () => {
    if (isBusy) {
      return;
    }

    setConfirmDeleteOpen(false);
  };

  const handleSubmit = async () => {
    const errors: ExpenseFormErrors = {};
    const dataLancamento = convertDateToApiDateTimeFormat(form.dataLancamento);

    if (!dataLancamento) {
      errors.dataLancamento = 'Selecione a data da despesa.';
    }

    if (form.descricao.trim().length < 2) {
      errors.descricao = 'Informe uma descrição com pelo menos 2 caracteres.';
    }

    if (form.valor <= 0) {
      errors.valor = 'Informe um valor maior que zero.';
    }

    if (form.idCategoria === '') {
      errors.idCategoria = 'Selecione a categoria da despesa.';
    }

    if (form.idCarteira === '') {
      errors.idCarteira = 'Selecione a carteira da despesa.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (
      Object.keys(errors).length > 0 ||
      !dataLancamento ||
      form.idCarteira === '' ||
      form.idCategoria === ''
    ) {
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        dataLancamento,
        descricao: form.descricao.trim(),
        valor: Math.round(form.valor * 100),
        idCategoria: form.idCategoria,
        meioPagamento: form.meioPagamento,
        idCarteira: form.idCarteira,
        idFeira: form.idFeira === '' ? undefined : form.idFeira,
        observacao: form.observacao.trim() || undefined,
      };

      const result = isEditMode
        ? await atualizarDespesa(despesa.id, payload)
        : await criarDespesa(payload);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await fetchDespesas({ pagina: 1 });
      showSuccess(isEditMode ? 'Despesa alterada com sucesso.' : 'Despesa cadastrada com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!despesa) return;

    setIsDeleting(true);
    setProblem(null);

    try {
      const result = await excluirDespesa(despesa.id);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await fetchDespesas();
      showSuccess('Despesa excluída com sucesso.');
      setConfirmDeleteOpen(false);
      handleClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
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
                <ReceiptLong color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  {isEditMode ? 'Alterar despesa' : 'Nova despesa'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {isEditMode
                  ? 'Altere os dados da despesa selecionada.'
                  : 'Preencha os dados para registrar uma despesa.'}
              </Typography>
            </Box>

            <IconButton
              onClick={handleDialogClose}
              aria-label="Fechar modal de despesa"
              disabled={isBusy}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

          {activeWallets.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Nenhuma carteira ativa encontrada. Cadastre ou ative uma carteira
              antes de lançar despesas.
            </Alert>
          ) : null}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, md: 3 }}>
              <DatePickerField
                label="Data"
                value={form.dataLancamento}
                onValueChange={(dataLancamento) =>
                  setForm((current) => ({
                    ...current,
                    dataLancamento,
                  }))
                }
                slotProps={{
                  textField: {
                    error: Boolean(
                      localErrors.dataLancamento ||
                      getFieldMessage(problem, 'dataLancamento'),
                    ),
                    helperText:
                      localErrors.dataLancamento ??
                      getFieldMessage(problem, 'dataLancamento'),
                  },
                }}
              />
            </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Descrição"
              value={form.descricao}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  descricao: event.target.value,
                }))
              }
              error={Boolean(
                localErrors.descricao || getFieldMessage(problem, 'descricao'),
              )}
              helperText={
                localErrors.descricao ?? getFieldMessage(problem, 'descricao')
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 3 }}>
            <CurrencyField
              fullWidth
              label="Valor"
              value={form.valor}
              onValueChange={(valor) =>
                setForm((current) => ({ ...current, valor }))
              }
              error={Boolean(
                localErrors.valor || getFieldMessage(problem, 'valor'),
              )}
              helperText={
                localErrors.valor ?? getFieldMessage(problem, 'valor')
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Categoria"
              value={form.idCategoria}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  idCategoria: Number(event.target.value),
                }))
              }
              error={Boolean(
                localErrors.idCategoria ||
                getFieldMessage(problem, 'idCategoria'),
              )}
              helperText={
                localErrors.idCategoria ??
                getFieldMessage(problem, 'idCategoria')
              }
            >
              <MenuItem value="">Selecione a categoria</MenuItem>
              {categoriasDespesa.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  {cat.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Carteira"
              value={form.idCarteira}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  idCarteira:
                    event.target.value === '' ? '' : Number(event.target.value),
                }))
              }
              error={Boolean(
                localErrors.idCarteira ||
                getFieldMessage(problem, 'idCarteira'),
              )}
              helperText={
                localErrors.idCarteira ?? getFieldMessage(problem, 'idCarteira')
              }
            >
              <MenuItem value="">Selecione a carteira</MenuItem>
              {activeWallets.map((carteira) => (
                <MenuItem key={carteira.id} value={carteira.id}>
                  {carteira.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Pagamento"
              value={form.meioPagamento}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  meioPagamento: event.target.value as MeioPagamento,
                }))
              }
            >
              {availableMeiosPagamento.includes('CRE') && <MenuItem value="CRE">Cartão crédito</MenuItem>}
              {availableMeiosPagamento.includes('DEB') && <MenuItem value="DEB">Cartão débito</MenuItem>}
              {availableMeiosPagamento.includes('DIN') && <MenuItem value="DIN">Dinheiro</MenuItem>}
              {availableMeiosPagamento.includes('PIX') && <MenuItem value="PIX">Pix</MenuItem>}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              select
              fullWidth
              label="Feira"
              value={form.idFeira}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  idFeira:
                    event.target.value === '' ? '' : Number(event.target.value),
                }))
              }
              helperText="Opcional"
            >
              <MenuItem value="">Sem feira</MenuItem>
              {feiras.map((feira) => (
                <MenuItem key={feira.id} value={feira.id}>
                  {feira.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Observação"
              value={form.observacao}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  observacao: event.target.value,
                }))
              }
              error={Boolean(
                localErrors.observacao ||
                getFieldMessage(problem, 'observacao'),
              )}
              helperText={
                localErrors.observacao ?? getFieldMessage(problem, 'observacao')
              }
            />
          </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{ px: 3, py: 2, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}
        >
          <Box>
            {isEditMode ? (
              <Button color="error" onClick={() => setConfirmDeleteOpen(true)} disabled={isBusy}>
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
              {isSaving || isSubmitting
                ? 'Salvando...'
                : isEditMode
                  ? 'Salvar alterações'
                  : 'Salvar Despesa'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
      <Dialog
        open={confirmDeleteOpen}
        onClose={handleConfirmDeleteDialogClose}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Excluir despesa</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Tem certeza que deseja excluir esta despesa? Essa ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleConfirmDeleteDialogClose} disabled={isDeleting}>
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
