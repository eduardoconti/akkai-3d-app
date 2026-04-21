import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add, AllInbox, Close, Delete, Save } from '@mui/icons-material';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  initialCicloFormState,
  initialItemCicloFormState,
  MESES_LABEL,
  STATUS_CICLO_LABEL,
  type CicloFormErrors,
  type CicloFormState,
  type ItemCicloFormState,
} from '@/features/assinatura/types/assinatura-form';
import {
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
  type StatusCiclo,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface EditCicloDialogProps {
  open: boolean;
  cicloId: number | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

export default function EditCicloDialog({
  open,
  cicloId,
  onClose,
  onUpdated,
}: EditCicloDialogProps) {
  const {
    atualizarCiclo,
    clearSubmitError,
    excluirCiclo,
    isSubmitting,
    obterCicloPorId,
    submitErrorMessage,
  } = useAssinaturaStore(
    useShallow((state) => ({
      atualizarCiclo: assinaturaStoreSelectors.atualizarCiclo(state),
      clearSubmitError: assinaturaStoreSelectors.clearSubmitError(state),
      excluirCiclo: assinaturaStoreSelectors.excluirCiclo(state),
      isSubmitting: assinaturaStoreSelectors.isSubmitting(state),
      obterCicloPorId: assinaturaStoreSelectors.obterCicloPorId(state),
      submitErrorMessage: assinaturaStoreSelectors.submitErrorMessage(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const { form, setForm, problem, setProblem, localErrors, setLocalErrors, isSaving, setIsSaving, resetForm } =
    useFormDialog<CicloFormState, CicloFormErrors>({
      open,
      initialValues: initialCicloFormState,
      onReset: clearSubmitError,
    });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assinanteName, setAssinanteName] = useState('');

  useEffect(() => {
    if (!open || cicloId === null) return;

    let active = true;

    const loadCiclo = async () => {
      setIsLoading(true);
      setProblem(null);
      setLocalErrors({});

      try {
        const ciclo = await obterCicloPorId(cicloId);

        if (!active) return;

        setAssinanteName(ciclo.assinante?.nome ?? `Assinante #${ciclo.idAssinante}`);
        setForm({
          idAssinante: ciclo.idAssinante,
          mesReferencia: ciclo.mesReferencia,
          anoReferencia: ciclo.anoReferencia,
          status: ciclo.status,
          codigoRastreio: ciclo.codigoRastreio ?? '',
          observacao: ciclo.observacao ?? '',
          itens:
            ciclo.itens.length > 0
              ? ciclo.itens.map((item) => ({
                  nomeProduto: item.nomeProduto,
                  quantidade: item.quantidade,
                  observacao: item.observacao ?? '',
                }))
              : [{ ...initialItemCicloFormState }],
        });
      } catch (error) {
        if (!active) return;
        setProblem(getProblemDetailsFromError(error));
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void loadCiclo();

    return () => {
      active = false;
    };
  }, [obterCicloPorId, open, cicloId]);

  const handleClose = () => {
    setAssinanteName('');
    resetForm();
    onClose();
  };

  const isBusy = isSubmitting || isLoading || isSaving || isDeleting;

  const handleDialogClose = () => {
    if (isBusy) return;
    handleClose();
  };

  const setItem = (index: number, patch: Partial<ItemCicloFormState>) => {
    setForm((c) => ({
      ...c,
      itens: c.itens.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = () => {
    setForm((c) => ({
      ...c,
      itens: [...c.itens, { ...initialItemCicloFormState }],
    }));
  };

  const removeItem = (index: number) => {
    setForm((c) => ({
      ...c,
      itens: c.itens.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (cicloId === null) return;

    const errors: CicloFormErrors = {};

    const itensInvalidos = form.itens.some(
      (item) => item.nomeProduto.trim().length === 0 || item.quantidade === '' || Number(item.quantidade) <= 0,
    );

    if (itensInvalidos) {
      errors.itens = 'Todos os itens devem ter nome e quantidade maior que zero.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);

    try {
      const result = await atualizarCiclo(cicloId, {
        status: form.status,
        codigoRastreio: form.codigoRastreio.trim() || undefined,
        observacao: form.observacao.trim() || undefined,
        itens: form.itens.map((item) => ({
          nomeProduto: item.nomeProduto.trim(),
          quantidade: item.quantidade as number,
          observacao: item.observacao.trim() || undefined,
        })),
      });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onUpdated();
      showSuccess('Ciclo alterado com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (cicloId === null) return;

    setIsDeleting(true);
    setProblem(null);

    try {
      const result = await excluirCiclo(cicloId);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onUpdated();
      showSuccess('Ciclo excluído com sucesso.');
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
                <AllInbox color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Alterar ciclo
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {assinanteName
                  ? `${assinanteName} — ${MESES_LABEL[form.mesReferencia] ?? ''} / ${form.anoReferencia}`
                  : 'Atualize os dados do ciclo selecionado.'}
              </Typography>
            </Box>
            <IconButton onClick={handleDialogClose} disabled={isBusy} aria-label="Fechar">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                disabled={isLoading}
                label="Status"
                value={form.status}
                onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as StatusCiclo }))}
              >
                {(Object.keys(STATUS_CICLO_LABEL) as StatusCiclo[]).map((s) => (
                  <MenuItem key={s} value={s}>
                    {STATUS_CICLO_LABEL[s]}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                disabled={isLoading}
                label="Código de rastreio"
                placeholder="Ex: BR123456789BR"
                value={form.codigoRastreio}
                onChange={(e) => setForm((c) => ({ ...c, codigoRastreio: e.target.value }))}
                error={Boolean(getFieldMessage(problem, 'codigoRastreio'))}
                helperText={getFieldMessage(problem, 'codigoRastreio') ?? 'Opcional'}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                disabled={isLoading}
                label="Observação"
                placeholder="Ex: Substituir peça X pelo modelo Y"
                value={form.observacao}
                onChange={(e) => setForm((c) => ({ ...c, observacao: e.target.value }))}
                helperText="Opcional"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Itens do ciclo
              </Typography>
              <Button size="small" startIcon={<Add />} onClick={addItem} disabled={isBusy}>
                Adicionar item
              </Button>
            </Stack>

            {localErrors.itens ? (
              <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
                {localErrors.itens}
              </Typography>
            ) : null}

            <Stack spacing={2} divider={<Divider flexItem />}>
              {form.itens.map((item, index) => (
                <Grid container spacing={2} key={index} alignItems="flex-start">
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <TextField
                      fullWidth
                      disabled={isLoading}
                      label="Nome do produto"
                      placeholder="Ex: Porta-copo"
                      value={item.nomeProduto}
                      onChange={(e) => setItem(index, { nomeProduto: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 6, sm: 2 }}>
                    <TextField
                      fullWidth
                      disabled={isLoading}
                      label="Qtd."
                      type="number"
                      slotProps={{ htmlInput: { min: 1 } }}
                      value={item.quantidade}
                      onChange={(e) =>
                        setItem(index, {
                          quantidade: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      disabled={isLoading}
                      label="Observação"
                      placeholder="Opcional"
                      value={item.observacao}
                      onChange={(e) => setItem(index, { observacao: e.target.value })}
                    />
                  </Grid>

                  <Grid size={{ xs: 6, sm: 1 }} sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton
                      color="error"
                      onClick={() => removeItem(index)}
                      disabled={isBusy || form.itens.length === 1}
                      aria-label="Remover item"
                    >
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Stack>
          </Box>
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
              onClick={() => void handleSubmit()}
              variant="contained"
              startIcon={<Save />}
              size="large"
              disabled={isBusy}
            >
              {isSaving || isSubmitting ? 'Salvando...' : 'Salvar ciclo'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Excluir ciclo</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Tem certeza que deseja excluir este ciclo? Essa ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmDeleteOpen(false)} disabled={isDeleting}>
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
