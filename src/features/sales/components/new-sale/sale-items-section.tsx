import type { RefObject } from 'react';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
import type { PrecoProdutoFeira, ProblemDetails, Produto } from '@/shared';
import type {
  SaleFormItem,
  SaleItemErrors,
  SaleItemType,
} from '@/features/sales/types/sale-form';
import { SectionLabel } from './sale-form-parts';
import SaleItemCard from './sale-item-card';

interface SaleItemsSectionProps {
  catalogProducts: Produto[];
  errorMessage?: string;
  fairProductPrices: PrecoProdutoFeira[];
  firstProductInputRef: RefObject<HTMLInputElement | null>;
  isBusy: boolean;
  isEditMode: boolean;
  isFetching: boolean;
  itemErrors: SaleItemErrors;
  items: SaleFormItem[];
  problem: ProblemDetails | null;
  topSellerProducts: Produto[];
  onAddItem: () => void;
  onChangeQuantity: (index: number, quantity: number) => void;
  onChangeType: (index: number, tipoItem: SaleItemType) => void;
  onQuickAddProduct: (product: Produto) => void;
  onRemove: (index: number) => void;
  onSelectCatalogProduct: (
    index: number,
    product: { id: number; nome: string; valor: number } | null,
  ) => void;
  onUpdate: (index: number, partial: Partial<SaleFormItem>) => void;
}

export default function SaleItemsSection({
  catalogProducts,
  errorMessage,
  fairProductPrices,
  firstProductInputRef,
  isBusy,
  isEditMode,
  isFetching,
  itemErrors,
  items,
  problem,
  topSellerProducts,
  onAddItem,
  onChangeQuantity,
  onChangeType,
  onQuickAddProduct,
  onRemove,
  onSelectCatalogProduct,
  onUpdate,
}: SaleItemsSectionProps) {
  return (
    <Box>
      <SectionLabel>Itens da venda</SectionLabel>

      {!isEditMode && topSellerProducts.length > 0 ? (
        <Box sx={{ mb: 1.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 0.75 }}
          >
            Mais vendidos — toque para adicionar
          </Typography>
          <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75}>
            {topSellerProducts.map((product) => (
              <Chip
                key={product.id}
                label={product.nome}
                size="small"
                variant="outlined"
                color="primary"
                onClick={() => onQuickAddProduct(product)}
                sx={{ maxWidth: 180 }}
              />
            ))}
          </Stack>
        </Box>
      ) : null}

      {errorMessage ? (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {errorMessage}
        </Alert>
      ) : null}

      <Stack spacing={1.5}>
        {items.map((item, index) => (
          <SaleItemCard
            key={`${index}-${item.tipoItem}-${item.idProduto ?? 'novo'}`}
            catalogProducts={catalogProducts}
            errors={itemErrors[index]}
            fairProductPrices={fairProductPrices}
            firstProductInputRef={firstProductInputRef}
            index={index}
            isBusy={isBusy}
            isEditMode={isEditMode}
            isFetching={isFetching}
            isLastItem={index === items.length - 1}
            isOnlyItem={items.length === 1}
            item={item}
            problem={problem}
            onChangeQuantity={onChangeQuantity}
            onChangeType={onChangeType}
            onRemove={onRemove}
            onSelectCatalogProduct={onSelectCatalogProduct}
            onUpdate={onUpdate}
          />
        ))}

        <Button
          startIcon={<Add />}
          onClick={onAddItem}
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
    </Box>
  );
}
