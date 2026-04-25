import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close, LocalOffer, Save, Storefront } from '@mui/icons-material';
import FairProductPricesDialog from './fair-product-prices-dialog';
import { saleStoreSelectors, useSaleStore } from '../store/use-sale-store';
import {
  FormFeedbackAlert,
  getFieldMessage,
  getProblemDetailsFromError,
  useFeedbackStore,
  useFormDialog,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface FairDialogProps {
  open: boolean;
  fairId?: number | null;
  onClose: () => void;
}

interface FairFormState {
  nome: string;
  local: string;
  descricao: string;
  ativa: boolean;
}

interface FairFormErrors {
  nome?: string;
  local?: string;
  descricao?: string;
}

const initialFairFormState: FairFormState = {
  nome: '',
  local: '',
  descricao: '',
  ativa: true,
};

export default function FairDialog({ open, fairId, onClose }: FairDialogProps) {
  const isEditMode = fairId != null;
  const {
    clearSubmitError,
    criarFeira,
    atualizarFeira,
    fetchFeiras,
    fetchFeirasPaginadas,
    obterFeiraPorId,
    isSubmitting,
    submitErrorMessage,
  } = useSaleStore(
    useShallow((state) => ({
      clearSubmitError: saleStoreSelectors.clearSubmitError(state),
      criarFeira: saleStoreSelectors.criarFeira(state),
      atualizarFeira: saleStoreSelectors.atualizarFeira(state),
      fetchFeiras: saleStoreSelectors.fetchFeiras(state),
      fetchFeirasPaginadas: saleStoreSelectors.fetchFeirasPaginadas(state),
      obterFeiraPorId: saleStoreSelectors.obterFeiraPorId(state),
      isSubmitting: saleStoreSelectors.isSubmitting(state),
      submitErrorMessage: saleStoreSelectors.submitErrorMessage(state),
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
  } = useFormDialog<FairFormState, FairFormErrors>({
    open,
    initialValues: initialFairFormState,
    onReset: clearSubmitError,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [pricesDialogOpen, setPricesDialogOpen] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (!open || !isEditMode || fairId == null) return;

    let active = true;

    const loadFair = async () => {
      setIsLoading(true);
      setProblem(null);
      setLocalErrors({});

      try {
        const feira = await obterFeiraPorId(fairId);

        if (!active) {
          return;
        }

        setForm({
          nome: feira.nome,
          local: feira.local ?? '',
          descricao: feira.descricao ?? '',
          ativa: feira.ativa,
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

    void loadFair();

    return () => {
      active = false;
    };
  }, [fairId, isEditMode, obterFeiraPorId, open]);

  const isBusy = isSubmitting || isSaving || isLoading;

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    onClose();
  };

  const validateForm = (): FairFormErrors => {
    const errors: FairFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    if (form.local.trim().length > 120) {
      errors.local = 'O local deve ter no máximo 120 caracteres.';
    }

    if (form.descricao.trim().length > 500) {
      errors.descricao = 'A descrição deve ter no máximo 500 caracteres.';
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
        nome: form.nome.trim().toUpperCase(),
        local: form.local.trim() || undefined,
        descricao: form.descricao.trim() || undefined,
        ativa: form.ativa,
      };

      const result =
        isEditMode && fairId != null
          ? await atualizarFeira(fairId, payload)
          : await criarFeira(payload);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await Promise.all([fetchFeiras(), fetchFeirasPaginadas()]);
      showSuccess(
        isEditMode
          ? 'Feira alterada com sucesso.'
          : 'Feira cadastrada com sucesso.',
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const getErrorMessage = (field: keyof FairFormErrors) =>
    localErrors[field] ?? getFieldMessage(problem, field) ?? undefined;

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
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
            >
              <Storefront color="primary" />
              <Typography variant="h5" fontWeight={700}>
                {isEditMode ? 'Alterar feira' : 'Nova feira'}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {isEditMode
                ? 'Atualize os dados da feira selecionada.'
                : 'Preencha os dados para cadastrar uma nova feira.'}
            </Typography>
          </Box>

          <IconButton
            onClick={handleDialogClose}
            aria-label="Fechar modal de feira"
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Nome da feira"
              placeholder="Ex: MAUA"
              value={form.nome}
              disabled={isLoading}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  nome: event.target.value,
                }));
              }}
              error={Boolean(getErrorMessage('nome'))}
              helperText={getErrorMessage('nome')}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Local"
              placeholder="Ex: Praça Mauá"
              value={form.local}
              disabled={isLoading}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  local: event.target.value,
                }));
              }}
              error={Boolean(getErrorMessage('local'))}
              helperText={getErrorMessage('local') ?? 'Opcional'}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Descrição"
              placeholder="Descreva a feira, frequência ou observações úteis."
              value={form.descricao}
              disabled={isLoading}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  descricao: event.target.value,
                }));
              }}
              error={Boolean(getErrorMessage('descricao'))}
              helperText={getErrorMessage('descricao') ?? 'Opcional'}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.ativa}
                  disabled={isLoading}
                  onChange={(_event, checked) => {
                    setForm((current) => ({ ...current, ativa: checked }));
                  }}
                />
              }
              label="Feira ativa"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          justifyContent: 'space-between',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          {isEditMode ? (
            <Button
              variant="outlined"
              startIcon={<LocalOffer />}
              onClick={() => setPricesDialogOpen(true)}
              disabled={isBusy}
            >
              Cadastrar preços
            </Button>
          ) : null}
        </Box>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            flexDirection: { xs: 'column', sm: 'row' },
            width: { xs: '100%', sm: 'auto' },
          }}
        >
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
            {isBusy
              ? 'Salvando...'
              : isEditMode
                ? 'Salvar Feira'
                : 'Cadastrar Feira'}
          </Button>
        </Box>
      </DialogActions>

      <FairProductPricesDialog
        open={pricesDialogOpen}
        fairId={fairId ?? null}
        fairName={form.nome}
        onClose={() => setPricesDialogOpen(false)}
      />
    </Dialog>
  );
}
