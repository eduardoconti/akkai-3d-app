import { useEffect } from 'react';
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
import { Close, Save, Storefront } from '@mui/icons-material';
import {
  consignacaoStoreSelectors,
  useConsignacaoStore,
} from '@/features/consignacao/store/use-consignacao-store';
import type { StatusRevendedor } from '@/shared';
import {
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface RevendedorDialogProps {
  open: boolean;
  revendedorId?: number | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

interface RevendedorFormState {
  nome: string;
  telefone: string;
  status: StatusRevendedor;
  percentualDesconto: number;
}

type RevendedorFormErrors = Partial<Record<keyof RevendedorFormState, string>>;

const initialFormState: RevendedorFormState = {
  nome: '',
  telefone: '',
  status: 'ATIVO',
  percentualDesconto: 0,
};

export default function RevendedorDialog({
  open,
  revendedorId,
  onClose,
  onSaved,
}: RevendedorDialogProps) {
  const {
    atualizarRevendedor,
    clearSubmitError,
    criarRevendedor,
    isSubmitting,
    obterRevendedorPorId,
    submitErrorMessage,
  } = useConsignacaoStore(
    useShallow((state) => ({
      atualizarRevendedor: consignacaoStoreSelectors.atualizarRevendedor(state),
      clearSubmitError: consignacaoStoreSelectors.clearSubmitError(state),
      criarRevendedor: consignacaoStoreSelectors.criarRevendedor(state),
      isSubmitting: consignacaoStoreSelectors.isSubmitting(state),
      obterRevendedorPorId:
        consignacaoStoreSelectors.obterRevendedorPorId(state),
      submitErrorMessage: consignacaoStoreSelectors.submitErrorMessage(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
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
  } = useFormDialog<RevendedorFormState, RevendedorFormErrors>({
    open,
    initialValues: initialFormState,
    onReset: clearSubmitError,
  });

  const isEditing = Boolean(revendedorId);
  const isBusy = isSubmitting || isSaving;

  useEffect(() => {
    if (!open || !revendedorId) {
      return;
    }

    let active = true;
    setIsSaving(true);

    obterRevendedorPorId(revendedorId)
      .then((revendedor) => {
        if (!active) {
          return;
        }

        setInitialForm({
          nome: revendedor.nome,
          telefone: revendedor.telefone ?? '',
          status: revendedor.status,
          percentualDesconto: revendedor.percentualDesconto ?? 0,
        });
      })
      .finally(() => {
        if (active) {
          setIsSaving(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, obterRevendedorPorId, revendedorId, setForm, setIsSaving]);

  const handleClose = () => {
    if (isBusy) {
      return;
    }

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

  const handleSubmit = async () => {
    const errors: RevendedorFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    if (form.telefone.trim().length < 8) {
      errors.telefone = 'Informe um telefone com pelo menos 8 caracteres.';
    }

    if (
      !Number.isFinite(form.percentualDesconto) ||
      form.percentualDesconto < 0 ||
      form.percentualDesconto > 100
    ) {
      errors.percentualDesconto = 'Informe um desconto entre 0 e 100%.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const dados = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        status: form.status,
        percentualDesconto: form.percentualDesconto,
      };
      const result =
        isEditing && revendedorId
          ? await atualizarRevendedor(revendedorId, dados)
          : await criarRevendedor(dados);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onSaved?.();
      showSuccess(
        isEditing
          ? 'Revendedor atualizado com sucesso.'
          : 'Revendedor cadastrado com sucesso.',
      );
      resetForm();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
              <Storefront color="primary" />
              <Typography variant="h5" fontWeight={700}>
                {isEditing ? 'Editar revendedor' : 'Novo revendedor'}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Informe os dados básicos do revendedor consignado.
            </Typography>
          </Box>

          <IconButton
            onClick={handleDialogClose}
            aria-label="Fechar modal de revendedor"
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
              label="Nome"
              required
              value={form.nome}
              onChange={(event) =>
                setForm((current) => ({ ...current, nome: event.target.value }))
              }
              error={Boolean(
                localErrors.nome || getFieldMessage(problem, 'nome'),
              )}
              helperText={localErrors.nome ?? getFieldMessage(problem, 'nome')}
              disabled={isSaving}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              fullWidth
              label="Telefone"
              required
              value={form.telefone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  telefone: event.target.value,
                }))
              }
              error={Boolean(
                localErrors.telefone || getFieldMessage(problem, 'telefone'),
              )}
              helperText={
                localErrors.telefone ?? getFieldMessage(problem, 'telefone')
              }
              disabled={isSaving}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 5 }}>
            <TextField
              select
              fullWidth
              label="Status"
              required
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  status: event.target.value as StatusRevendedor,
                }))
              }
              disabled={isSaving}
            >
              <MenuItem value="ATIVO">Ativo</MenuItem>
              <MenuItem value="INATIVO">Inativo</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label="Desconto (%)"
              required
              type="number"
              value={form.percentualDesconto}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  percentualDesconto: Number(event.target.value),
                }))
              }
              error={Boolean(
                localErrors.percentualDesconto ||
                getFieldMessage(problem, 'percentualDesconto'),
              )}
              helperText={
                localErrors.percentualDesconto ??
                getFieldMessage(problem, 'percentualDesconto')
              }
              disabled={isSaving}
              inputProps={{ min: 0, max: 100, step: 0.01 }}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleDialogClose} disabled={isBusy}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSubmit}
          disabled={isBusy}
        >
          {isEditing ? 'Salvar' : 'Cadastrar'}
        </Button>
      </DialogActions>
      {discardChangesDialog}
    </Dialog>
  );
}
