import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  FormHelperText,
  Typography,
  DialogContentText,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close, DeleteOutline, Edit, RequestQuote, Save } from '@mui/icons-material';
import {
  budgetStoreSelectors,
  useBudgetStore,
} from '@/features/budgets/store/use-budget-store';
import {
  ALL_STATUSES_ORCAMENTO,
  STATUS_ORCAMENTO_LABEL,
  initialBudgetFormState,
  type BudgetFormErrors,
  type BudgetFormState,
} from '@/features/budgets/types/budget-form';
import { saleStoreSelectors, useSaleStore } from '@/features/sales/store/use-sale-store';
import {
  CurrencyField,
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
} from '@/shared';
import type { Orcamento, TipoVenda } from '@/shared/lib/types/domain';
import { useShallow } from 'zustand/react/shallow';

interface NewBudgetDialogProps {
  open: boolean;
  budget?: Orcamento | null;
  onClose: () => void;
}

export default function NewBudgetDialog({
  open,
  budget,
  onClose,
}: NewBudgetDialogProps) {
  const isEditMode = budget != null;
  const {
    atualizarOrcamento,
    clearSubmitError,
    criarOrcamento,
    excluirOrcamento,
    fetchOrcamentos,
    isSubmitting,
    paginacao,
    submitErrorMessage,
  } = useBudgetStore(
    useShallow((state) => ({
      atualizarOrcamento: budgetStoreSelectors.atualizarOrcamento(state),
      clearSubmitError: budgetStoreSelectors.clearSubmitError(state),
      criarOrcamento: budgetStoreSelectors.criarOrcamento(state),
      excluirOrcamento: budgetStoreSelectors.excluirOrcamento(state),
      fetchOrcamentos: budgetStoreSelectors.fetchOrcamentos(state),
      isSubmitting: budgetStoreSelectors.isSubmitting(state),
      paginacao: budgetStoreSelectors.paginacao(state),
      submitErrorMessage: budgetStoreSelectors.submitErrorMessage(state),
    })),
  );
  const { feiras, fetchFeiras } = useSaleStore(
    useShallow((state) => ({
      feiras: saleStoreSelectors.feiras(state),
      fetchFeiras: saleStoreSelectors.fetchFeiras(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
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
  } = useFormDialog<BudgetFormState, BudgetFormErrors>({
    open,
    initialValues: initialBudgetFormState,
    onReset: clearSubmitError,
  });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      void fetchFeiras();
    }
  }, [open, fetchFeiras]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setProblem(null);
    setLocalErrors({});

    if (!budget) {
      setForm(initialBudgetFormState);
      return;
    }

    setForm({
      nomeCliente: budget.nomeCliente,
      telefoneCliente: budget.telefoneCliente ?? '',
      descricao: budget.descricao ?? '',
      linkSTL: budget.linkSTL ?? '',
      status: budget.status,
      tipo: budget.tipo,
      idFeira: budget.idFeira ?? '',
      valor: budget.valor != null ? budget.valor / 100 : 0,
      quantidade: budget.quantidade ?? '',
    });
  }, [budget, open, setForm, setLocalErrors, setProblem]);

  const handleClose = () => {
    setConfirmDeleteOpen(false);
    resetForm();
    onClose();
  };

  const isBusy = isSubmitting || isSaving || isDeleting;

  const handleDialogClose = () => {
    if (isBusy) return;
    handleClose();
  };

  const validateForm = (): BudgetFormErrors => {
    const errors: BudgetFormErrors = {};

    if (form.nomeCliente.trim().length < 2) {
      errors.nomeCliente = 'Informe o nome do cliente com pelo menos 2 caracteres.';
    }

    if (form.telefoneCliente.trim().length > 0 && form.telefoneCliente.trim().length < 8) {
      errors.telefoneCliente = 'Informe um telefone com pelo menos 8 caracteres.';
    }

    if (form.tipo === 'FEIRA' && form.idFeira === '') {
      errors.idFeira = 'Selecione a feira.';
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

    if (form.quantidade !== '' && Number(form.quantidade) < 1) {
      errors.quantidade = 'A quantidade deve ser maior que zero.';
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
      const payload = {
        nomeCliente: form.nomeCliente.trim(),
        telefoneCliente: form.telefoneCliente.trim() || undefined,
        descricao: form.descricao.trim() || undefined,
        linkSTL: form.linkSTL.trim() || undefined,
        status: form.status,
        tipo: form.tipo,
        idFeira: form.idFeira === '' ? undefined : form.idFeira,
        valor: form.valor > 0 ? Math.round(form.valor * 100) : undefined,
        quantidade: form.quantidade === '' ? undefined : Number(form.quantidade),
      };
      const result =
        isEditMode && budget
          ? await atualizarOrcamento(budget.id, payload)
          : await criarOrcamento(payload);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await fetchOrcamentos(
        isEditMode ? paginacao : { ...paginacao, pagina: 1 },
      );
      showSuccess(
        isEditMode
          ? 'Orçamento alterado com sucesso.'
          : 'Orçamento cadastrado com sucesso.',
      );
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClose = () => {
    if (isDeleting) {
      return;
    }

    setConfirmDeleteOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!budget) {
      return;
    }

    setIsDeleting(true);
    setProblem(null);

    try {
      const result = await excluirOrcamento(budget.id);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await fetchOrcamentos(paginacao);
      showSuccess('Orçamento excluído com sucesso.');
      setConfirmDeleteOpen(false);
      handleClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const globalMessage = problem?.detail ?? submitErrorMessage;
  const activeFeiras = feiras.filter((f) => f.ativa);

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
                {isEditMode ? <Edit color="primary" /> : <RequestQuote color="primary" />}
                <Typography variant="h5" fontWeight={700}>
                  {isEditMode ? 'Alterar orçamento' : 'Novo orçamento'}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {isEditMode
                  ? 'Atualize os dados do orçamento selecionado.'
                  : 'Preencha os dados para registrar um novo orçamento.'}
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

          {activeFeiras.length === 0 && form.tipo === 'FEIRA' ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Nenhuma feira ativa encontrada. Cadastre ou ative uma feira para usar esse
              tipo de orçamento.
            </Alert>
          ) : null}

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Nome do cliente"
              value={form.nomeCliente}
              disabled={isDeleting}
              onChange={(event) =>
                setForm((current) => ({ ...current, nomeCliente: event.target.value }))
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
              placeholder="Opcional"
              value={form.telefoneCliente}
              disabled={isDeleting}
              onChange={(event) =>
                setForm((current) => ({ ...current, telefoneCliente: event.target.value }))
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

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Tipo
            </Typography>
            <ToggleButtonGroup
              exclusive
              value={form.tipo}
              disabled={isDeleting}
              onChange={(_event, value: TipoVenda | null) => {
                if (!value) return;
                setForm((current) => ({
                  ...current,
                  tipo: value,
                  idFeira: value !== 'FEIRA' ? '' : current.idFeira,
                }));
              }}
              size="small"
            >
              <ToggleButton value="LOJA">Loja</ToggleButton>
              <ToggleButton value="FEIRA">Feira</ToggleButton>
              <ToggleButton value="ONLINE">Online</ToggleButton>
            </ToggleButtonGroup>
            {localErrors.tipo ? (
              <FormHelperText error>{localErrors.tipo}</FormHelperText>
            ) : null}
          </Grid>

          {form.tipo === 'FEIRA' && (
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                label="Feira"
                value={form.idFeira}
                disabled={isDeleting}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    idFeira: event.target.value === '' ? '' : Number(event.target.value),
                  }))
                }
                error={Boolean(
                  localErrors.idFeira || getFieldMessage(problem, 'idFeira'),
                )}
                helperText={localErrors.idFeira ?? getFieldMessage(problem, 'idFeira')}
              >
                <MenuItem value="">Selecione a feira</MenuItem>
                {activeFeiras.map((feira) => (
                  <MenuItem key={feira.id} value={feira.id}>
                    {feira.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}

          <Grid size={{ xs: 12, md: 4 }}>
            <CurrencyField
              fullWidth
              label="Valor estimado"
              value={form.valor}
              disabled={isDeleting}
              onValueChange={(valor) =>
                setForm((current) => ({ ...current, valor }))
              }
              error={Boolean(localErrors.valor || getFieldMessage(problem, 'valor'))}
              helperText={
                localErrors.valor ?? getFieldMessage(problem, 'valor') ?? 'Opcional'
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Quantidade"
              placeholder="Opcional"
              value={form.quantidade}
              disabled={isDeleting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  quantidade:
                    event.target.value === '' ? '' : Number(event.target.value),
                }))
              }
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              error={Boolean(
                localErrors.quantidade || getFieldMessage(problem, 'quantidade'),
              )}
              helperText={
                localErrors.quantidade ?? getFieldMessage(problem, 'quantidade')
              }
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={form.status}
              disabled={isDeleting}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as BudgetFormState['status'],
                }))
              }
            >
              {ALL_STATUSES_ORCAMENTO.map((status) => (
                <MenuItem key={status} value={status}>
                  {STATUS_ORCAMENTO_LABEL[status]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Descrição"
              value={form.descricao}
              disabled={isDeleting}
              onChange={(event) =>
                setForm((current) => ({ ...current, descricao: event.target.value }))
              }
              error={Boolean(
                localErrors.descricao || getFieldMessage(problem, 'descricao'),
              )}
              helperText={
                localErrors.descricao ?? getFieldMessage(problem, 'descricao')
              }
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Link STL"
              placeholder="https://..."
              value={form.linkSTL}
              disabled={isDeleting}
              onChange={(event) =>
                setForm((current) => ({ ...current, linkSTL: event.target.value }))
              }
              error={Boolean(
                localErrors.linkSTL || getFieldMessage(problem, 'linkSTL'),
              )}
              helperText={localErrors.linkSTL ?? getFieldMessage(problem, 'linkSTL')}
            />
          </Grid>
          </Grid>
        </DialogContent>

        <DialogActions
          sx={{ px: 3, py: 2, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}
        >
          <Box>
            {isEditMode ? (
              <Button
                color="error"
                startIcon={<DeleteOutline />}
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
              onClick={() => {
                void handleSubmit();
              }}
              variant="contained"
              startIcon={<Save />}
              size="large"
              disabled={isBusy}
            >
              {isSubmitting || isSaving
                ? 'Salvando...'
                : isEditMode
                  ? 'Salvar alterações'
                  : 'Salvar orçamento'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onClose={handleDeleteClose} fullWidth maxWidth="xs">
        <DialogTitle>Excluir orçamento</DialogTitle>
        <DialogContent dividers>
          <DialogContentText>
            Tem certeza que deseja excluir este orçamento? Essa ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleDeleteClose} disabled={isDeleting}>
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
