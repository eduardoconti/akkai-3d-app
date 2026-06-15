import { useEffect, useMemo, useState } from 'react';
import {
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
import { Add, Close, Edit, Save } from '@mui/icons-material';
import {
  consignacaoStoreSelectors,
  useConsignacaoStore,
} from '@/features/consignacao/store/use-consignacao-store';
import { listAllProducts } from '@/features/products/api/products-api';
import type { Consignacao, ItemConsignacao, Produto } from '@/shared';
import {
  CurrencyField,
  FormFeedbackAlert,
  ProductAutocompleteField,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface ItemConsignacaoDialogProps {
  open: boolean;
  consignacao: Consignacao | null;
  item?: ItemConsignacao | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

interface ItemConsignacaoFormState {
  idProduto: number | null;
  quantidade: string;
  valorUnitario: number;
}

interface ItemConsignacaoFormErrors {
  idProduto?: string;
  quantidade?: string;
  valorUnitario?: string;
}

const initialFormState: ItemConsignacaoFormState = {
  idProduto: null,
  quantidade: '1',
  valorUnitario: 0,
};

function normalizarNumero(value: string): number {
  return Number(value.replace(',', '.'));
}

function obterNomeProduto(item: ItemConsignacao): string {
  return `${item.nomeProduto} (${item.codigoProduto})`;
}

export default function ItemConsignacaoDialog({
  open,
  consignacao,
  item,
  onClose,
  onSaved,
}: ItemConsignacaoDialogProps) {
  const {
    adicionarItemConsignacao,
    alterarItemConsignacao,
    clearSubmitError,
    isSubmitting,
    submitErrorMessage,
  } = useConsignacaoStore(
    useShallow((state) => ({
      adicionarItemConsignacao:
        consignacaoStoreSelectors.adicionarItemConsignacao(state),
      alterarItemConsignacao:
        consignacaoStoreSelectors.alterarItemConsignacao(state),
      clearSubmitError: consignacaoStoreSelectors.clearSubmitError(state),
      isSubmitting: consignacaoStoreSelectors.isSubmitting(state),
      submitErrorMessage: consignacaoStoreSelectors.submitErrorMessage(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
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
  } = useFormDialog<ItemConsignacaoFormState, ItemConsignacaoFormErrors>({
    open,
    initialValues: initialFormState,
    onReset: clearSubmitError,
  });

  const isEditing = Boolean(item);
  const isBusy = isSubmitting || isSaving;
  const quantidadeMinima = useMemo(() => {
    if (!item) {
      return 1;
    }

    return Math.max(1, item.quantidadeVendida + item.quantidadeDevolvida);
  }, [item]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setProblem(null);
    setLocalErrors({});
    setForm(
      item
        ? {
            idProduto: item.idProduto,
            quantidade: String(item.quantidadeEnviada),
            valorUnitario: item.valorUnitario / 100,
          }
        : initialFormState,
    );
  }, [item, open, setForm, setLocalErrors, setProblem]);

  useEffect(() => {
    if (!open || isEditing) {
      return;
    }

    let active = true;
    setIsLoadingOptions(true);

    listAllProducts()
      .then((produtosResponse) => {
        if (active) {
          setProdutos(produtosResponse);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingOptions(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isEditing, open]);

  const handleClose = () => {
    if (isBusy) {
      return;
    }

    resetForm();
    onClose();
  };

  const handleSelectProduct = (produto: Produto | null) => {
    setForm((current) => ({
      ...current,
      idProduto: produto?.id ?? null,
      valorUnitario: produto ? produto.valor / 100 : 0,
    }));
  };

  const handleSubmit = async () => {
    const errors: ItemConsignacaoFormErrors = {};
    const quantidade = normalizarNumero(form.quantidade);

    if (!isEditing && !form.idProduto) {
      errors.idProduto = 'Selecione o produto.';
    }

    if (!Number.isInteger(quantidade) || quantidade < quantidadeMinima) {
      errors.quantidade =
        quantidadeMinima > 1
          ? `Informe uma quantidade maior ou igual a ${quantidadeMinima}.`
          : 'Informe uma quantidade inteira maior que zero.';
    }

    if (!Number.isFinite(form.valorUnitario) || form.valorUnitario < 0) {
      errors.valorUnitario = 'Informe um valor unitário válido.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0 || !consignacao) {
      return;
    }

    setIsSaving(true);

    try {
      const dados = {
        quantidade,
        valorUnitario: Math.round(form.valorUnitario * 100),
      };
      const result =
        isEditing && item
          ? await alterarItemConsignacao(consignacao.id, item.id, dados)
          : await adicionarItemConsignacao(consignacao.id, {
              idProduto: form.idProduto as number,
              ...dados,
            });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await onSaved?.();
      showSuccess(
        isEditing
          ? 'Item da consignação alterado com sucesso.'
          : 'Item adicionado à consignação com sucesso.',
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
              {isEditing ? <Edit color="primary" /> : <Add color="primary" />}
              <Typography variant="h5" fontWeight={700}>
                {isEditing ? 'Alterar item' : 'Adicionar item'}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Consignação #{consignacao?.id}
            </Typography>
          </Box>

          <IconButton
            onClick={handleClose}
            aria-label="Fechar modal de item da consignação"
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {isEditing && item ? (
            <TextField
              label="Produto"
              value={obterNomeProduto(item)}
              disabled
              fullWidth
            />
          ) : (
            <ProductAutocompleteField
              products={produtos}
              productId={form.idProduto}
              loading={isLoadingOptions}
              disabled={isBusy}
              label="Produto"
              onChange={handleSelectProduct}
              error={Boolean(
                localErrors.idProduto || getFieldMessage(problem, 'idProduto'),
              )}
              helperText={
                localErrors.idProduto ?? getFieldMessage(problem, 'idProduto')
              }
            />
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth
                label="Quantidade enviada"
                type="number"
                value={form.quantidade}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    quantidade: event.target.value,
                  }))
                }
                disabled={isBusy}
                error={Boolean(
                  localErrors.quantidade ||
                    getFieldMessage(problem, 'quantidade'),
                )}
                helperText={
                  localErrors.quantidade ??
                  getFieldMessage(problem, 'quantidade')
                }
                inputProps={{ min: quantidadeMinima, step: 1 }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 7 }}>
              <CurrencyField
                fullWidth
                label="Valor unitário"
                value={form.valorUnitario}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    valorUnitario: value,
                  }))
                }
                disabled={isBusy}
                error={Boolean(
                  localErrors.valorUnitario ||
                    getFieldMessage(problem, 'valorUnitario'),
                )}
                helperText={
                  localErrors.valorUnitario ??
                  getFieldMessage(problem, 'valorUnitario')
                }
              />
            </Grid>
          </Grid>
        </Stack>
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
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
