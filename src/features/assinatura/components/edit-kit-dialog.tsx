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
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  AutoAwesome,
  Close,
  Delete,
  Inventory2,
  Save,
} from '@mui/icons-material';
import { listAllProducts } from '@/features/products/api/products-api';
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
  ProductAutocompleteField,
  type GerarCiclosResult,
  type Produto,
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
  } = useFormDialog<KitFormState, KitFormErrors>({
    open,
    initialValues: initialKitFormState,
    onReset: clearSubmitError,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] =
    useState<GerarCiclosResult | null>(null);
  const [kitLabel, setKitLabel] = useState('');
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    if (!open) return;

    let active = true;

    const loadProducts = async () => {
      setIsLoadingProducts(true);

      try {
        const response = await listAllProducts();

        if (active) {
          setProdutos(response);
        }
      } finally {
        if (active) {
          setIsLoadingProducts(false);
        }
      }
    };

    void loadProducts();

    return () => {
      active = false;
    };
  }, [open]);

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
                  idProduto: item.idProduto ?? item.produto?.id ?? '',
                  quantidade: item.quantidade,
                  observacao: item.observacao ?? '',
                }))
              : [{ ...initialItemCicloFormState }],
          titulo: kit.titulo ?? '',
          descricao: kit.descricao ?? '',
          chamada: kit.chamada ?? '',
          ativo: kit.ativo ?? false,
          itensVitrine: kit.itensVitrine ?? [],
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

  const isBusy =
    isSubmitting ||
    isLoading ||
    isSaving ||
    isDeleting ||
    isGenerating ||
    isLoadingProducts;

  const handleDialogClose = () => {
    if (isBusy) return;
    handleClose();
  };

  const setItem = (index: number, patch: Partial<ItemCicloFormState>) => {
    setForm((c) => ({
      ...c,
      itens: c.itens.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
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

  const addVitrineItem = () => {
    setForm((c) => ({ ...c, itensVitrine: [...c.itensVitrine, ''] }));
  };

  const setVitrineItem = (index: number, value: string) => {
    setForm((c) => ({
      ...c,
      itensVitrine: c.itensVitrine.map((v, i) => (i === index ? value : v)),
    }));
  };

  const removeVitrineItem = (index: number) => {
    setForm((c) => ({
      ...c,
      itensVitrine: c.itensVitrine.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (kitId === null) return;

    const errors: KitFormErrors = {};

    const itensPreenchidos = form.itens.filter(
      (item) => item.idProduto !== '' || item.quantidade !== '',
    );

    const itensInvalidos = itensPreenchidos.some(
      (item) =>
        item.idProduto === '' ||
        item.quantidade === '' ||
        Number(item.quantidade) <= 0,
    );

    if (itensInvalidos) {
      errors.itens =
        'Todos os itens preenchidos devem ter produto e quantidade maior que zero.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);

    try {
      const itensValidos = form.itens.filter(
        (item) => item.idProduto !== '' && item.quantidade !== '' && Number(item.quantidade) > 0,
      );

      const result = await atualizarKit(kitId, {
        itens: itensValidos.length
          ? itensValidos.map((item) => ({
              idProduto: item.idProduto as number,
              quantidade: item.quantidade as number,
              observacao: item.observacao.trim() || undefined,
            }))
          : undefined,
        titulo: form.titulo.trim() || undefined,
        descricao: form.descricao.trim() || undefined,
        chamada: form.chamada.trim() || undefined,
        ativo: form.ativo,
        itensVitrine: form.itensVitrine.filter((v) => v.trim()).length
          ? form.itensVitrine.map((v) => v.trim()).filter(Boolean)
          : undefined,
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
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
              >
                <Inventory2 color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Alterar kit mensal
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {kitLabel || 'Atualize os itens do kit selecionado.'}
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

          {generateResult ? (
            <Alert
              severity={generateResult.criados > 0 ? 'success' : 'info'}
              sx={{ mb: 2 }}
              onClose={() => setGenerateResult(null)}
            >
              {generateResult.criados > 0 ? (
                <>
                  <strong>{generateResult.criados}</strong>{' '}
                  {generateResult.criados === 1
                    ? 'ciclo criado'
                    : 'ciclos criados'}
                  .
                  {generateResult.ignorados > 0
                    ? ` ${generateResult.ignorados} ${generateResult.ignorados === 1 ? 'assinante ignorado' : 'assinantes ignorados'} (ciclo já existente).`
                    : null}
                </>
              ) : (
                'Nenhum ciclo criado — todos os assinantes ativos já possuem ciclo para este mês.'
              )}
            </Alert>
          ) : null}

          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Vitrine
          </Typography>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                disabled={isLoading}
                label="Título"
                placeholder="Ex: Kit Dinossauros"
                value={form.titulo}
                onChange={(e) =>
                  setForm((c) => ({ ...c, titulo: e.target.value }))
                }
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                disabled={isLoading}
                label="Chamada"
                placeholder="Ex: Edição especial de julho!"
                value={form.chamada}
                onChange={(e) =>
                  setForm((c) => ({ ...c, chamada: e.target.value }))
                }
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                disabled={isLoading}
                label="Descrição"
                placeholder="Descrição do kit para a vitrine"
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
                label="Ativar na vitrine (substitui o kit atual)"
              />
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                Itens da vitrine
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={addVitrineItem}
                disabled={isBusy}
              >
                Adicionar
              </Button>
            </Stack>

            {form.itensVitrine.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhum item adicionado.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {form.itensVitrine.map((value, index) => (
                  <Stack key={index} direction="row" spacing={1} alignItems="center">
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Ex: T-Rex em miniatura"
                      value={value}
                      onChange={(e) => setVitrineItem(index, e.target.value)}
                      disabled={isBusy}
                    />
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => removeVitrineItem(index)}
                      disabled={isBusy}
                      aria-label="Remover"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                Itens do kit
              </Typography>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={addItem}
                disabled={isBusy}
              >
                Adicionar item
              </Button>
            </Stack>

            {produtos.length === 0 && !isLoadingProducts ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Nenhum produto cadastrado. Cadastre produtos antes de montar o kit
                mensal.
              </Alert>
            ) : null}

            {localErrors.itens ? (
              <Typography
                variant="caption"
                color="error"
                sx={{ mb: 1, display: 'block' }}
              >
                {localErrors.itens}
              </Typography>
            ) : null}

            <Stack spacing={2} divider={<Divider flexItem />}>
              {form.itens.map((item, index) => (
                <Grid container spacing={2} key={index} alignItems="flex-start">
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <ProductAutocompleteField
                      products={produtos}
                      productId={item.idProduto}
                      loading={isLoadingProducts}
                      disabled={
                        isLoading || isLoadingProducts || produtos.length === 0
                      }
                      onChange={(newValue) =>
                        setItem(index, {
                          idProduto: newValue?.id ?? '',
                        })
                      }
                      helperText={
                        index === 0 ? 'Pesquise por nome ou código.' : undefined
                      }
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
                          quantidade:
                            e.target.value === '' ? '' : Number(e.target.value),
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
                      onChange={(e) =>
                        setItem(index, { observacao: e.target.value })
                      }
                    />
                  </Grid>

                  <Grid
                    size={{ xs: 6, sm: 1 }}
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
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
          sx={{
            px: 3,
            py: 2,
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              color="error"
              onClick={() => setConfirmDeleteOpen(true)}
              disabled={isBusy}
            >
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
              {isSaving || isSubmitting ? 'Salvando...' : 'Salvar kit'}
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
        <DialogTitle>Excluir kit mensal</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Tem certeza que deseja excluir este kit mensal? Essa ação não pode
            ser desfeita.
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
