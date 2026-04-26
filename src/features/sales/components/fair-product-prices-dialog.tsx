import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close, LocalOffer, Save } from '@mui/icons-material';
import { listAllProducts } from '@/features/products/api/products-api';
import {
  deleteFairProductPrice,
  listFairProductPrices,
  upsertFairProductPrice,
} from '@/features/sales/api/sales-api';
import { saveCachedFairProductPrices } from '@/shared/lib/offline/indexed-db';
import {
  CurrencyField,
  FormFeedbackAlert,
  ProductAutocompleteField,
  getProblemDetailsFromError,
  useFeedbackStore,
  type PrecoProdutoFeira,
  type Produto,
} from '@/shared';

interface FairProductPricesDialogProps {
  open: boolean;
  fairId: number | null;
  fairName?: string;
  price?: PrecoProdutoFeira | null;
  onClose: () => void;
  onChanged?: () => Promise<void> | void;
}

export default function FairProductPricesDialog({
  open,
  fairId,
  fairName,
  price,
  onClose,
  onChanged,
}: FairProductPricesDialogProps) {
  const isEditMode = price != null;
  const [products, setProducts] = useState<Produto[]>([]);
  const [prices, setPrices] = useState<PrecoProdutoFeira[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [value, setValue] = useState(0);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  const isBusy = isLoadingProducts || isLoadingPrices || isSaving || isDeleting;

  useEffect(() => {
    if (!open || fairId == null) {
      setProducts([]);
      setPrices([]);
      setSelectedProductId(null);
      setValue(0);
      setIsLoadingProducts(false);
      setIsLoadingPrices(false);
      setIsSaving(false);
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
      setErrorMessage(null);
      return;
    }

    let active = true;

    const loadData = async () => {
      setIsLoadingProducts(true);
      setErrorMessage(null);
      setProducts([]);
      setPrices([]);
      setSelectedProductId(price?.idProduto ?? null);
      setValue((price?.valor ?? 0) / 100);
      setIsLoadingPrices(true);

      try {
        const [nextProducts, nextPrices] = await Promise.all([
          listAllProducts(),
          listFairProductPrices(fairId),
        ]);

        if (!active) {
          return;
        }

        setProducts(nextProducts);
        setPrices(nextPrices);
        setSelectedProductId(price?.idProduto ?? null);
        setValue((price?.valor ?? 0) / 100);
        void saveCachedFairProductPrices(fairId, nextPrices).catch(
          () => undefined,
        );
      } catch (error) {
        if (active) {
          setErrorMessage(getProblemDetailsFromError(error).detail);
        }
      } finally {
        if (active) {
          setIsLoadingProducts(false);
          setIsLoadingPrices(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [fairId, open, price]);

  const handleClose = () => {
    setConfirmDeleteOpen(false);
    onClose();
  };

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    handleClose();
  };

  const handleDeleteDialogClose = () => {
    if (isDeleting) {
      return;
    }

    setConfirmDeleteOpen(false);
  };

  const handleProductChange = (product: Produto | null) => {
    setSelectedProductId(product?.id ?? null);
    setErrorMessage(null);

    if (!product) {
      setValue(0);
      return;
    }

    const currentPrice = prices.find((price) => price.idProduto === product.id);
    setValue((currentPrice?.valor ?? product.valor) / 100);
  };

  const handleSave = async () => {
    if (fairId == null || selectedProductId == null) {
      setErrorMessage('Selecione um produto.');
      return;
    }

    const valueInCents = Math.round(value * 100);
    if (valueInCents < 50) {
      setErrorMessage('Informe um preço de pelo menos R$ 0,50.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const savedPrice = await upsertFairProductPrice(fairId, {
        idProduto: selectedProductId,
        valor: valueInCents,
      });

      const nextPrices = [
        ...prices.filter(
          (current) => current.idProduto !== savedPrice.idProduto,
        ),
        savedPrice,
      ];

      setPrices(nextPrices);
      void saveCachedFairProductPrices(fairId, nextPrices).catch(
        () => undefined,
      );
      setSelectedProductId(null);
      setValue(0);
      showSuccess(
        isEditMode
          ? 'Preço da feira alterado com sucesso.'
          : 'Preço da feira cadastrado com sucesso.',
      );
      await onChanged?.();
      handleClose();
    } catch (error) {
      setErrorMessage(getProblemDetailsFromError(error).detail);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!isEditMode || fairId == null || price == null) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      await deleteFairProductPrice(fairId, price.idProduto);
      const nextPrices = prices.filter(
        (current) => current.idProduto !== price.idProduto,
      );
      setPrices(nextPrices);
      void saveCachedFairProductPrices(fairId, nextPrices).catch(
        () => undefined,
      );
      showSuccess('Preço da feira excluído com sucesso.');
      await onChanged?.();
      handleClose();
    } catch (error) {
      setErrorMessage(getProblemDetailsFromError(error).detail);
      setConfirmDeleteOpen(false);
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
                <LocalOffer color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  {isEditMode
                    ? 'Alterar preço da feira'
                    : 'Cadastrar preço da feira'}
                </Typography>
              </Box>
              {fairName ? (
                <Typography variant="body2" color="text.secondary">
                  {fairName}
                </Typography>
              ) : null}
            </Box>

            <IconButton
              onClick={handleDialogClose}
              aria-label="Fechar modal de preços da feira"
              disabled={isBusy}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <FormFeedbackAlert message={errorMessage} />

          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <ProductAutocompleteField
                  products={products}
                  productId={selectedProductId}
                  onChange={handleProductChange}
                  loading={isLoadingProducts || isLoadingPrices}
                  disabled={isBusy || isEditMode}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <CurrencyField
                  fullWidth
                  label="Preço na feira"
                  value={value}
                  onValueChange={setValue}
                  name="precoProdutoFeira"
                  disabled={isBusy || selectedProductId == null}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            justifyContent: 'space-between',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            {isEditMode ? (
              <Button
                color="error"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={isBusy}
              >
                Excluir
              </Button>
            ) : null}
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
              onClick={() => void handleSave()}
              variant="contained"
              startIcon={<Save />}
              size="large"
              disabled={isBusy || selectedProductId == null}
            >
              {isSaving
                ? 'Salvando...'
                : isEditMode
                  ? 'Salvar preço'
                  : 'Cadastrar'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmDeleteOpen}
        onClose={handleDeleteDialogClose}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Excluir preço da feira</DialogTitle>
        <DialogContent dividers>
          <Typography>
            Tem certeza que deseja excluir este preço de feira? Essa ação não
            pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleDeleteDialogClose} disabled={isDeleting}>
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
