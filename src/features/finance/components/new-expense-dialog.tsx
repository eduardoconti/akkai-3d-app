import { useEffect, useMemo, useState } from 'react';
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
import { useFinanceStore } from '@/features/finance/store/use-finance-store';
import {
  convertDateToApiFormat,
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
  type CategoriaDespesa,
  type MeioPagamento,
  type ProblemDetails,
} from '@/shared';

interface NewExpenseDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function NewExpenseDialog({
  open,
  onClose,
}: NewExpenseDialogProps) {
  const {
    carteiras,
    clearSubmitError,
    criarDespesa,
    fetchCarteiras,
    fetchDespesas,
    isSubmitting,
    submitErrorMessage,
  } = useFinanceStore();
  const [form, setForm] = useState<ExpenseFormState>(initialExpenseFormState);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<ExpenseFormErrors>({});
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (open) {
      void fetchCarteiras();
      return;
    }

    setForm(initialExpenseFormState);
    setProblem(null);
    setLocalErrors({});
    clearSubmitError();
  }, [open, fetchCarteiras, clearSubmitError]);

  useEffect(() => {
    const carteiraPadrao = carteiras.find((carteira) => carteira.ativa);

    if (open && form.idCarteira === '' && carteiraPadrao) {
      setForm((current) => ({
        ...current,
        idCarteira: carteiraPadrao.id,
      }));
    }
  }, [open, carteiras, form.idCarteira]);

  const activeWallets = useMemo(
    () => carteiras.filter((carteira) => carteira.ativa),
    [carteiras],
  );

  const handleClose = () => {
    setForm(initialExpenseFormState);
    setProblem(null);
    setLocalErrors({});
    clearSubmitError();
    onClose();
  };

  const handleSubmit = async () => {
    const errors: ExpenseFormErrors = {};
    const dataLancamento = convertDateToApiFormat(form.dataLancamento);

    if (!dataLancamento) {
      errors.dataLancamento = 'Selecione a data da despesa.';
    }

    if (form.descricao.trim().length < 2) {
      errors.descricao = 'Informe uma descrição com pelo menos 2 caracteres.';
    }

    if (form.valor <= 0) {
      errors.valor = 'Informe um valor maior que zero.';
    }

    if (form.idCarteira === '') {
      errors.idCarteira = 'Selecione a carteira da despesa.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (
      Object.keys(errors).length > 0 ||
      !dataLancamento ||
      form.idCarteira === ''
    ) {
      return;
    }

    const result = await criarDespesa({
      dataLancamento,
      descricao: form.descricao.trim(),
      valor: Math.round(form.valor * 100),
      categoria: form.categoria,
      meioPagamento: form.meioPagamento,
      idCarteira: form.idCarteira,
      observacao: form.observacao.trim() || undefined,
    });

    if (!result.success) {
      setProblem(result.problem);
      return;
    }

    await fetchDespesas({ pagina: 1 });
    await fetchCarteiras();
    showSuccess('Despesa cadastrada com sucesso.');
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
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
                Nova despesa
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Preencha os dados para registrar uma despesa.
            </Typography>
          </Box>

          <IconButton onClick={handleClose} aria-label="Fechar modal de despesa">
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
          <Grid size={{ xs: 12, sm: 4 }}>
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

          <Grid size={{ xs: 12, sm: 4 }}>
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

          <Grid size={{ xs: 12, sm: 4 }}>
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

          <Grid size={{ xs: 12, sm: 6 }}>
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

          <Grid size={{ xs: 12, sm: 3 }}>
            <TextField
              select
              fullWidth
              label="Categoria"
              value={form.categoria}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  categoria: event.target.value as CategoriaDespesa,
                }))
              }
            >
              <MenuItem value="DESPESA_FIXA">Despesa fixa</MenuItem>
              <MenuItem value="MATERIA_PRIMA">Matéria-prima</MenuItem>
              <MenuItem value="EMBALAGEM">Embalagem</MenuItem>
              <MenuItem value="EVENTO">Evento</MenuItem>
              <MenuItem value="TRANSPORTE">Transporte</MenuItem>
              <MenuItem value="OUTROS">Outros</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 3 }}>
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
              <MenuItem value="CRE">Cartão crédito</MenuItem>
              <MenuItem value="DEB">Cartão débito</MenuItem>
              <MenuItem value="DIN">Dinheiro</MenuItem>
              <MenuItem value="PIX">Pix</MenuItem>
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
          {isSubmitting ? 'Salvando...' : 'Salvar Despesa'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
