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
import { Close, Loyalty, Save } from '@mui/icons-material';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  initialPlanoFormState,
  type PlanoFormErrors,
  type PlanoFormState,
} from '@/features/assinatura/types/assinatura-form';
import {
  CurrencyField,
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface EditPlanDialogProps {
  open: boolean;
  planId: number | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

export default function EditPlanDialog({
  open,
  planId,
  onClose,
  onUpdated,
}: EditPlanDialogProps) {
  const {
    atualizarPlano,
    clearSubmitError,
    excluirPlano,
    isSubmitting,
    obterPlanoPorId,
    submitErrorMessage,
  } = useAssinaturaStore(
    useShallow((state) => ({
      atualizarPlano: assinaturaStoreSelectors.atualizarPlano(state),
      clearSubmitError: assinaturaStoreSelectors.clearSubmitError(state),
      excluirPlano: assinaturaStoreSelectors.excluirPlano(state),
      isSubmitting: assinaturaStoreSelectors.isSubmitting(state),
      obterPlanoPorId: assinaturaStoreSelectors.obterPlanoPorId(state),
      submitErrorMessage: assinaturaStoreSelectors.submitErrorMessage(state),
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
  } = useFormDialog<PlanoFormState, PlanoFormErrors>({
    open,
    initialValues: initialPlanoFormState,
    onReset: clearSubmitError,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open || planId === null) return;

    let active = true;

    const loadPlan = async () => {
      setIsLoading(true);
      setProblem(null);
      setLocalErrors({});

      try {
        const plano = await obterPlanoPorId(planId);

        if (!active) return;

        setForm({
          nome: plano.nome,
          descricao: plano.descricao ?? '',
          valor: plano.valor / 100,
          ativo: plano.ativo,
        });
      } catch (error) {
        if (!active) return;
        setProblem(getProblemDetailsFromError(error));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadPlan();

    return () => {
      active = false;
    };
  }, [obterPlanoPorId, open, planId]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isBusy = isSubmitting || isLoading || isSaving || isDeleting;

  const handleDialogClose = () => {
    if (isBusy) return;
    handleClose();
  };

  const handleSubmit = async () => {
    if (planId === null) return;

    const errors: PlanoFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    if (form.valor === '' || form.valor <= 0) {
      errors.valor = 'Informe um valor maior que zero.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);

    try {
      const result = await atualizarPlano(planId, {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || undefined,
        valor: Math.round((form.valor as number) * 100),
        ativo: form.ativo,
      });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onUpdated();
      showSuccess('Plano alterado com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (planId === null) return;

    setIsDeleting(true);
    setProblem(null);

    try {
      const result = await excluirPlano(planId);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onUpdated();
      showSuccess('Plano excluído com sucesso.');
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
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
              >
                <Loyalty color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Alterar plano
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Atualize os dados do plano selecionado.
              </Typography>
            </Box>
            <IconButton
              onClick={handleDialogClose}
              disabled={isBusy}
              aria-label="Fechar"
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                disabled={isLoading}
                label="Nome do plano"
                placeholder="Ex: Kit Mensal Básico"
                value={form.nome}
                onChange={(e) =>
                  setForm((c) => ({ ...c, nome: e.target.value }))
                }
                error={Boolean(
                  localErrors.nome ?? getFieldMessage(problem, 'nome'),
                )}
                helperText={
                  localErrors.nome ?? getFieldMessage(problem, 'nome')
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <CurrencyField
                label="Valor (R$)"
                value={form.valor === '' ? 0 : form.valor}
                onValueChange={(value) =>
                  setForm((c) => ({ ...c, valor: value }))
                }
                error={Boolean(
                  localErrors.valor ?? getFieldMessage(problem, 'valor'),
                )}
                helperText={
                  localErrors.valor ?? getFieldMessage(problem, 'valor')
                }
                disabled={isLoading}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                disabled={isLoading}
                label="Descrição"
                placeholder="Ex: Kit com 3 peças impressas em 3D"
                value={form.descricao}
                onChange={(e) =>
                  setForm((c) => ({ ...c, descricao: e.target.value }))
                }
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.ativo}
                    disabled={isLoading}
                    onChange={(_e, checked) =>
                      setForm((c) => ({ ...c, ativo: checked }))
                    }
                  />
                }
                label="Plano ativo"
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
            <Button
              color="error"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isBusy}
            >
              Excluir
            </Button>
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
              onClick={() => void handleSubmit()}
              variant="contained"
              startIcon={<Save />}
              size="large"
              disabled={isBusy}
            >
              {isSaving || isSubmitting ? 'Salvando...' : 'Salvar plano'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Excluir plano</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Tem certeza que deseja excluir este plano? Essa ação não pode ser
            desfeita.
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
            onClick={() => void handleConfirmDelete()}
            disabled={isDeleting}
          >
            {isDeleting ? 'Excluindo...' : 'Confirmar exclusão'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
