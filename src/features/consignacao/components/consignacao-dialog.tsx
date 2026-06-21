import { useEffect, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  AssignmentTurnedIn,
  Close,
  Delete,
  Save,
} from '@mui/icons-material';
import { listarTodosRevendedoresAtivos } from '@/features/consignacao/api/consignacao-api';
import {
  consignacaoStoreSelectors,
  useConsignacaoStore,
} from '@/features/consignacao/store/use-consignacao-store';
import { listAllProducts } from '@/features/products/api/products-api';
import type { Produto, Revendedor } from '@/shared';
import {
  CurrencyField,
  CurrencyValue,
  FormFeedbackAlert,
  ProductAutocompleteField,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface ConsignacaoDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

interface ItemConsignacaoFormState {
  idProduto: number | null;
  quantidade: string;
  valorUnitario: number;
}

interface ConsignacaoFormState {
  idRevendedor: number | null;
  itens: ItemConsignacaoFormState[];
}

interface ConsignacaoFormErrors {
  idRevendedor?: string;
  itens?: string;
}

const itemInicial: ItemConsignacaoFormState = {
  idProduto: null,
  quantidade: '1',
  valorUnitario: 0,
};

const initialFormState: ConsignacaoFormState = {
  idRevendedor: null,
  itens: [itemInicial],
};

function normalizarNumero(value: string): number {
  return Number(value.replace(',', '.'));
}

function criarItemVazio(): ItemConsignacaoFormState {
  return { ...itemInicial };
}

export default function ConsignacaoDialog({
  open,
  onClose,
  onSaved,
}: ConsignacaoDialogProps) {
  const {
    clearSubmitError,
    criarConsignacao,
    isSubmitting,
    submitErrorMessage,
  } = useConsignacaoStore(
    useShallow((state) => ({
      clearSubmitError: consignacaoStoreSelectors.clearSubmitError(state),
      criarConsignacao: consignacaoStoreSelectors.criarConsignacao(state),
      isSubmitting: consignacaoStoreSelectors.isSubmitting(state),
      submitErrorMessage: consignacaoStoreSelectors.submitErrorMessage(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [revendedores, setRevendedores] = useState<Revendedor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
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
    requestClose,
    discardChangesDialog,
  } = useFormDialog<ConsignacaoFormState, ConsignacaoFormErrors>({
    open,
    initialValues: initialFormState,
    onReset: clearSubmitError,
  });

  const isBusy = isSubmitting || isSaving;
  const revendedorSelecionado =
    revendedores.find((revendedor) => revendedor.id === form.idRevendedor) ??
    null;

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setIsLoadingOptions(true);

    Promise.all([listarTodosRevendedoresAtivos(), listAllProducts()])
      .then(([revendedoresResponse, produtosResponse]) => {
        if (!active) {
          return;
        }

        setRevendedores(revendedoresResponse);
        setProdutos(produtosResponse);
      })
      .finally(() => {
        if (active) {
          setIsLoadingOptions(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open]);

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

  const handleChangeItem = (
    index: number,
    changes: Partial<ItemConsignacaoFormState>,
  ) => {
    setForm((current) => ({
      ...current,
      itens: current.itens.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    }));
  };

  const handleChangeRevendedor = (value: Revendedor | null) => {
    setForm((current) => ({
      ...current,
      idRevendedor: value?.id ?? null,
    }));
  };

  const handleSelectProduct = (index: number, produto: Produto | null) => {
    handleChangeItem(index, {
      idProduto: produto?.id ?? null,
      valorUnitario: produto ? produto.valor / 100 : 0,
    });
  };

  const handleAddItem = () => {
    setForm((current) => ({
      ...current,
      itens: [...current.itens, criarItemVazio()],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setForm((current) => ({
      ...current,
      itens:
        current.itens.length === 1
          ? [criarItemVazio()]
          : current.itens.filter((_item, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async () => {
    const errors: ConsignacaoFormErrors = {};

    if (!form.idRevendedor) {
      errors.idRevendedor = 'Selecione o revendedor.';
    }

    const itensValidos = form.itens.filter((item) => {
      const quantidade = normalizarNumero(item.quantidade);
      return (
        item.idProduto &&
        Number.isInteger(quantidade) &&
        quantidade > 0 &&
        Number.isFinite(item.valorUnitario) &&
        item.valorUnitario >= 0
      );
    });

    if (itensValidos.length === 0) {
      errors.itens =
        'Informe pelo menos um produto com quantidade e valor válidos.';
    }

    const produtosRepetidos = new Set<number>();
    const produtosInformados = new Set<number>();

    itensValidos.forEach((item) => {
      if (!item.idProduto) {
        return;
      }

      if (produtosInformados.has(item.idProduto)) {
        produtosRepetidos.add(item.idProduto);
      }

      produtosInformados.add(item.idProduto);
    });

    if (produtosRepetidos.size > 0) {
      errors.itens = 'Agrupe produtos repetidos em uma única linha.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0 || !form.idRevendedor) {
      return;
    }

    setIsSaving(true);

    try {
      const result = await criarConsignacao({
        idRevendedor: form.idRevendedor,
        itens: itensValidos.map((item) => ({
          idProduto: item.idProduto as number,
          quantidade: normalizarNumero(item.quantidade),
          valorUnitario: Math.round(item.valorUnitario * 100),
        })),
      });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onSaved?.();
      showSuccess('Consignação cadastrada com sucesso.');
      resetForm();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const valorTotal = form.itens.reduce((total, item) => {
    const quantidade = normalizarNumero(item.quantidade);

    if (!Number.isFinite(quantidade) || !Number.isFinite(item.valorUnitario)) {
      return total;
    }

    return total + Math.round(item.valorUnitario * 100) * quantidade;
  }, 0);

  return (
    <Dialog open={open} onClose={handleDialogDismiss} fullWidth maxWidth="md">
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
              <AssignmentTurnedIn color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Nova consignação
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Registre as peças enviadas para venda consignada.
            </Typography>
          </Box>

          <IconButton
            onClick={handleDialogClose}
            aria-label="Fechar modal de consignação"
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Autocomplete
                options={revendedores}
                value={revendedorSelecionado}
                loading={isLoadingOptions}
                disabled={isBusy}
                getOptionLabel={(option) => option.nome}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                onChange={(_event, value) => handleChangeRevendedor(value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Revendedor"
                    required
                    error={Boolean(
                      localErrors.idRevendedor ||
                      getFieldMessage(problem, 'idRevendedor'),
                    )}
                    helperText={
                      localErrors.idRevendedor ??
                      getFieldMessage(problem, 'idRevendedor')
                    }
                  />
                )}
              />
            </Grid>
          </Grid>

          <Box>
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Itens consignados
              </Typography>
            </Box>

            <Stack spacing={1.5}>
              {form.itens.map((item, index) => (
                <Grid
                  container
                  spacing={1.5}
                  key={`${index}-${item.idProduto ?? 0}`}
                >
                  <Grid size={{ xs: 12, md: 6 }}>
                    <ProductAutocompleteField
                      products={produtos}
                      productId={item.idProduto}
                      loading={isLoadingOptions}
                      disabled={isBusy}
                      label="Produto"
                      required
                      onChange={(produto) =>
                        handleSelectProduct(index, produto)
                      }
                    />
                  </Grid>

                  <Grid size={{ xs: 6, md: 2 }}>
                    <TextField
                      fullWidth
                      label="Qtd."
                      required
                      type="number"
                      value={item.quantidade}
                      onChange={(event) =>
                        handleChangeItem(index, {
                          quantidade: event.target.value,
                        })
                      }
                      disabled={isBusy}
                      inputProps={{ min: 1, step: 1 }}
                    />
                  </Grid>

                  <Grid size={{ xs: 6, md: 3 }}>
                    <CurrencyField
                      fullWidth
                      label="Valor unitário"
                      required
                      value={item.valorUnitario}
                      onValueChange={(value) =>
                        handleChangeItem(index, { valorUnitario: value })
                      }
                      disabled={isBusy}
                    />
                  </Grid>

                  <Grid
                    size={{ xs: 12, md: 1 }}
                    sx={{ display: 'flex', alignItems: 'center' }}
                  >
                    <IconButton
                      onClick={() => handleRemoveItem(index)}
                      disabled={isBusy}
                      aria-label="Remover item"
                    >
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}

              <Button
                startIcon={<Add />}
                onClick={handleAddItem}
                variant="outlined"
                disabled={isBusy}
                sx={{
                  borderStyle: 'dashed',
                  py: 1.1,
                  justifyContent: 'center',
                }}
              >
                Adicionar item
              </Button>
            </Stack>

            {localErrors.itens ? (
              <Typography
                variant="caption"
                color="error"
                sx={{ mt: 1, display: 'block' }}
              >
                {localErrors.itens}
              </Typography>
            ) : null}
          </Box>

          <Typography variant="body2" color="text.secondary" textAlign="right">
            Total consignado:{' '}
            <strong>
              <CurrencyValue value={valorTotal} />
            </strong>
          </Typography>
        </Stack>
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
          Cadastrar
        </Button>
      </DialogActions>
      {discardChangesDialog}
    </Dialog>
  );
}
