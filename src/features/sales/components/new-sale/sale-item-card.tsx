import type { RefObject } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  CardGiftcard,
  Category,
  Delete,
  Inventory2,
  Remove,
} from '@mui/icons-material';
import {
  CurrencyField,
  formatCurrency,
  getFieldMessage,
  ProductAutocompleteField,
  type PrecoProdutoFeira,
  type ProblemDetails,
  type Produto,
} from '@/shared';
import type {
  SaleFormItem,
  SaleItemErrors,
  SaleItemType,
} from '@/features/sales/types/sale-form';
import { getCatalogProductValue } from './sale-form-helpers';

interface SaleItemCardProps {
  catalogProducts: Produto[];
  errors?: SaleItemErrors[number];
  fairProductPrices: PrecoProdutoFeira[];
  firstProductInputRef: RefObject<HTMLInputElement | null>;
  index: number;
  isBusy: boolean;
  isEditMode: boolean;
  isFetching: boolean;
  isLastItem: boolean;
  isOnlyItem: boolean;
  item: SaleFormItem;
  problem: ProblemDetails | null;
  onChangeQuantity: (index: number, quantity: number) => void;
  onChangeType: (index: number, tipoItem: SaleItemType) => void;
  onRemove: (index: number) => void;
  onSelectCatalogProduct: (
    index: number,
    product: { id: number; nome: string; valor: number } | null,
  ) => void;
  onUpdate: (index: number, partial: Partial<SaleFormItem>) => void;
}

export default function SaleItemCard({
  catalogProducts,
  errors,
  fairProductPrices,
  firstProductInputRef,
  index,
  isBusy,
  isEditMode,
  isFetching,
  isLastItem,
  isOnlyItem,
  item,
  problem,
  onChangeQuantity,
  onChangeType,
  onRemove,
  onSelectCatalogProduct,
  onUpdate,
}: SaleItemCardProps) {
  const itemLabel = item.tipoItem === 'CATALOGO' ? 'catalogo' : 'avulso';
  const unitValue = item.brinde
    ? 0
    : item.tipoItem === 'CATALOGO'
      ? getCatalogProductValue(item, catalogProducts, fairProductPrices) / 100
      : item.valorUnitario;
  const itemTotal = Math.round(unitValue * 100) * item.quantidade;
  const selectedProduct =
    item.tipoItem === 'CATALOGO' && item.idProduto !== null
      ? catalogProducts.find((product) => product.id === item.idProduto)
      : undefined;
  const availableStock = selectedProduct?.quantidadeEstoque;
  const exceedsStock =
    !item.brinde &&
    availableStock !== undefined &&
    item.quantidade > availableStock;

  return (
    <Paper
      elevation={2}
      sx={{
        borderRadius: 2,
        p: 1.5,
      }}
    >
      <Stack spacing={1.5}>
        <Grid container spacing={1} alignItems="flex-start">
          <Grid
            size={{
              xs: 10,
              sm: item.tipoItem === 'CATALOGO' ? 11 : 7,
            }}
          >
            {item.tipoItem === 'CATALOGO' ? (
              <ProductAutocompleteField
                products={catalogProducts}
                productId={item.idProduto}
                showStock
                loading={isFetching}
                size="small"
                required
                inputRef={index === 0 ? firstProductInputRef : undefined}
                autoFocus={!isEditMode && item.idProduto === null && isLastItem}
                onChange={(newValue) => {
                  onSelectCatalogProduct(index, newValue);
                }}
                error={Boolean(
                  errors?.idProduto ||
                  getFieldMessage(problem, `itens[${index}].idProduto`),
                )}
                helperText={
                  errors?.idProduto ??
                  getFieldMessage(problem, `itens[${index}].idProduto`)
                }
              />
            ) : (
              <TextField
                fullWidth
                size="small"
                label="Nome do item"
                required
                value={item.nomeProduto}
                onChange={(event) => {
                  onUpdate(index, {
                    nomeProduto: event.target.value,
                  });
                }}
                error={Boolean(
                  errors?.nomeProduto ||
                  getFieldMessage(problem, `itens[${index}].nomeProduto`),
                )}
                helperText={
                  errors?.nomeProduto ??
                  getFieldMessage(problem, `itens[${index}].nomeProduto`)
                }
              />
            )}
          </Grid>

          {item.tipoItem === 'AVULSO' ? (
            <Grid size={{ xs: 12, sm: 4 }}>
              <CurrencyField
                fullWidth
                size="small"
                label="Valor unit."
                required
                value={item.brinde ? 0 : item.valorUnitario}
                onValueChange={(valorUnitario) => {
                  onUpdate(index, { valorUnitario });
                }}
                name={`valorUnitario-${index}`}
                disabled={item.brinde}
                error={Boolean(
                  errors?.valorUnitario ||
                  getFieldMessage(problem, `itens[${index}].valorUnitario`),
                )}
                helperText={
                  errors?.valorUnitario ??
                  getFieldMessage(problem, `itens[${index}].valorUnitario`)
                }
              />
            </Grid>
          ) : null}

          <Grid size={{ xs: 2, sm: 1 }}>
            <IconButton
              onClick={() => onRemove(index)}
              color="error"
              disabled={isOnlyItem || isBusy}
              aria-label={`Remover item ${itemLabel}`}
              sx={{ mt: 0.25 }}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Grid>
        </Grid>

        {item.tipoItem === 'AVULSO' || item.brinde ? (
          <Stack direction="row" spacing={0.75} flexWrap="wrap">
            {item.tipoItem === 'AVULSO' ? (
              <Chip
                label="AVULSO"
                color="info"
                size="small"
                variant="outlined"
                sx={{ fontWeight: 700 }}
              />
            ) : null}
            {item.brinde ? (
              <Chip
                label="BRINDE"
                color="warning"
                size="small"
                sx={{ fontWeight: 800 }}
              />
            ) : null}
          </Stack>
        ) : null}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              onClick={() => onChangeQuantity(index, item.quantidade - 1)}
              disabled={item.quantidade <= 1 || isBusy}
              aria-label={`Diminuir quantidade do item ${itemLabel}`}
              sx={{
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
              }}
            >
              <Remove fontSize="small" />
            </IconButton>

            <TextField
              size="small"
              type="number"
              value={item.quantidade}
              onChange={(event) => {
                onChangeQuantity(index, Number(event.target.value));
              }}
              error={Boolean(
                errors?.quantidade ||
                getFieldMessage(problem, `itens[${index}].quantidade`),
              )}
              helperText={
                errors?.quantidade ??
                getFieldMessage(problem, `itens[${index}].quantidade`)
              }
              inputProps={{
                min: 1,
                'aria-label': `Quantidade do item ${itemLabel}`,
              }}
              sx={{
                width: 72,
                '& input': { textAlign: 'center' },
              }}
            />

            <IconButton
              onClick={() => onChangeQuantity(index, item.quantidade + 1)}
              disabled={isBusy}
              aria-label={`Aumentar quantidade do item ${itemLabel}`}
              sx={{
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
              }}
            >
              <Add fontSize="small" />
            </IconButton>

            <Button
              size="small"
              variant={item.brinde ? 'contained' : 'outlined'}
              color={item.brinde ? 'warning' : 'inherit'}
              startIcon={<CardGiftcard />}
              onClick={() => {
                const checked = !item.brinde;
                onUpdate(index, {
                  brinde: checked,
                  valorUnitario:
                    checked && item.tipoItem === 'AVULSO'
                      ? 0
                      : item.valorUnitario,
                });
              }}
            >
              Brinde
            </Button>

            <Button
              size="small"
              variant="text"
              startIcon={
                item.tipoItem === 'CATALOGO' ? <Category /> : <Inventory2 />
              }
              onClick={() =>
                onChangeType(
                  index,
                  item.tipoItem === 'CATALOGO' ? 'AVULSO' : 'CATALOGO',
                )
              }
              sx={{ textTransform: 'none' }}
            >
              {item.tipoItem === 'CATALOGO' ? 'Item avulso' : 'Usar catálogo'}
            </Button>
          </Stack>

          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="caption" color="text.secondary">
              Total do item
            </Typography>
            <Typography variant="subtitle1" fontWeight={800}>
              {formatCurrency(itemTotal)}
            </Typography>
          </Box>
        </Stack>

        {exceedsStock ? (
          <Typography variant="caption" color="warning.dark" role="status">
            Estoque disponível: {Math.max(availableStock, 0)}. A venda é
            permitida e o estoque ficará negativo.
          </Typography>
        ) : null}
      </Stack>
    </Paper>
  );
}
