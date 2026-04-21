import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add, AutoAwesome, Close, Delete, Inventory2, Save } from '@mui/icons-material';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  initialItemCicloFormState,
  initialKitFormState,
  MESES_LABEL,
  type ItemCicloFormState,
  type KitFormErrors,
  type KitFormState,
} from '@/features/assinatura/types/assinatura-form';
import {
  FormFeedbackAlert,
  type GerarCiclosResult,
  useFeedbackStore,
  useFormDialog,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface EditKitDialogProps {
  open: boolean;
  kitId: number | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

export default function EditKitDialog({
  open,
  kitId,
  onClose,
  onUpdated,
}: EditKitDialogProps) {
  const {
    atualizarKit,
    clearSubmitError,
    excluirKit,
    gerarCiclosMensais,
    isSubmitting,
    obterKitPorId,
    submitErrorMessage,
  } = useAssinaturaStore(
    useShallow((state) => ({
      atualizarKit: assinaturaStoreSelectors.atualizarKit(state),
      clearSubmitError: assinaturaStoreSelectors.clearSubmitError(state),
      excluirKit: assinaturaStoreSelectors.excluirKit(state),
      gerarCiclosMensais: assinaturaStoreSelectors.gerarCiclosMensais(state),
      isSubmitting: assinaturaStoreSelectors.isSubmitting(state),
      obterKitPorId: assinaturaStoreSelectors.obterKitPorId(state),
      submitErrorMessage: assinaturaStoreSelectors.submitErrorMessage(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const { form, setForm, problem, setProblem, localErrors, setLocalErrors, isSaving, setIsSaving, resetForm } =
    useFormDialog<KitFormState, KitFormErrors>({
      open,
      initialValues: initialKitFormState,
      onReset: clearSubmitError,
    });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GerarCiclosResult | null>(null);
  const [kitLabel, setKitLabel] = useState('');

  useEffect(() => {
    if (!open || kitId === null) return;

    let active = true;

    const loadKit = async () => {
      setIsLoading(true);
      setProblem(null);
      setLocalErrors({});
      setGenerateResult(null);

      try {
        const kit = await obterKitPorId(kitId);

        if (!active) return;

        setKitLabel(
          `${kit.plano?.nome ?? `Plano #${kit.idPlano}`} — ${MESES_LABEL[kit.mesReferencia] ?? ''} / ${kit.anoReferencia}`,
        );
        setForm({
          idPlano: kit.idPlano,
          mesReferencia: kit.mesReferencia,
          anoReferencia: kit.anoReferencia,
          itens:
            kit.itens.length > 0
              ? kit.itens.map((item) => ({
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

    void loadKit();

    return () => {
      active = false;
    };
  }, [obterKitPorId, open, kitId]);

  const handleClose = () => {
    setKitLabel('');
    setGenerateResult(null);
    resetForm();
    onClose();
  };

  const isBusy = isSubmitting || isLoading || isSaving || isDeleting || isGenerating;

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
    if (kitId === null) return;

    const errors: KitFormErrors = {};

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
      const result = await atualizarKit(kitId, {
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
      showSuccess('Kit mensal alterado com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleGerarCiclos = async () => {
    if (kitId === null) return;

    setIsGenerating(true);
    setProblem(null);
    setGenerateResult(null);

    try {
      const result = await gerarCiclosMensais(kitId);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      setGenerateResult(result.data);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (kitId === null) return;

    setIsDeleting(true);
    setProblem(null);

    try {
      const result = await excluirKit(kitId);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onUpdated();
      showSuccess('Kit mensal excluído com sucesso.');
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
                <Inventory2 color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Alterar kit mensal
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {kitLabel || 'Atualize os itens do kit selecionado.'}
              </Typography>
            </Box>
            <IconButton onClick={handleDialogClose} disabled={isBusy} aria-label="Fechar">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

          {generateResult ? (
            <Alert
              severity={generateResult.criados > 0 ? 'success' : 'info'}
              sx={{ mb: 2 }}
              onClose={() => setGenerateResult(null)}
            >
              {generateResult.criados > 0 ? (
                <>
                  <strong>{generateResult.criados}</strong>{' '}
                  {generateResult.criados === 1 ? 'ciclo criado' : 'ciclos criados'}.
                  {generateResult.ignorados > 0
                    ? ` ${generateResult.ignorados} ${generateResult.ignorados === 1 ? 'assinante ignorado' : 'assinantes ignorados'} (ciclo já existente).`
                    : null}
                </>
              ) : (
                'Nenhum ciclo criado — todos os assinantes ativos já possuem ciclo para este mês.'
              )}
            </Alert>
          ) : null}

          <Box sx={{ mt: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Itens do kit
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
                      placeholder="Ex: Porta-copo dragão"
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
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="error" onClick={() => setConfirmDeleteOpen(true)} disabled={isBusy}>
              Excluir
            </Button>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<AutoAwesome />}
              onClick={() => void handleGerarCiclos()}
              disabled={isBusy}
            >
              {isGenerating ? 'Gerando...' : 'Gerar ciclos'}
            </Button>
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
              {isSaving || isSubmitting ? 'Salvando...' : 'Salvar kit'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Excluir kit mensal</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Tem certeza que deseja excluir este kit mensal? Essa ação não pode ser desfeita.
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
