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
}

type RevendedorFormErrors = Partial<Record<keyof RevendedorFormState, string>>;

const initialFormState: RevendedorFormState = {
  nome: '',
  telefone: '',
  status: 'ATIVO',
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
    problem,
    setProblem,
    localErrors,
    setLocalErrors,
    isSaving,
    setIsSaving,
    resetForm,
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

        setForm({
          nome: revendedor.nome,
          telefone: revendedor.telefone ?? '',
          status: revendedor.status,
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

  const handleSubmit = async () => {
    const errors: RevendedorFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    if (form.telefone.trim().length < 8) {
      errors.telefone = 'Informe um telefone com pelo menos 8 caracteres.';
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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
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
            onClick={handleClose}
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
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isBusy}>
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
    </Dialog>
  );
}
