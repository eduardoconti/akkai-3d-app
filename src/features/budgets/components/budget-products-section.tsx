import {
  Box,
  Button,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add,
  AddCircleOutline,
  DeleteOutline,
  Remove,
} from '@mui/icons-material';
import {
  ProductAutocompleteField,
  formatCurrency,
  getFieldMessage,
  type ProblemDetails,
  type Produto,
} from '@/shared';
import {
  MAX_BUDGET_ITEM_QUANTITY,
  MAX_BUDGET_ITEMS,
  type BudgetFormItem,
} from '@/features/budgets/types/budget-form';
import {
  getBudgetItemsTotal,
  setBudgetItemProduct,
  type BudgetItemsErrors,
} from '@/features/budgets/utils/budget-items';

interface BudgetProductsSectionProps {
  itens: BudgetFormItem[];
  produtos: Produto[];
  isLoadingProdutos: boolean;
  disabled?: boolean;
  errors?: BudgetItemsErrors;
  problem?: ProblemDetails | null;
  onChange: (itens: BudgetFormItem[]) => void;
}

const stepperButtonSx = {
  border: (theme: { palette: { divider: string } }) =>
    `1px solid ${theme.palette.divider}`,
  borderRadius: 1,
};

export default function BudgetProductsSection({
  itens,
  produtos,
  isLoadingProdutos,
  disabled = false,
  errors,
  problem,
  onChange,
}: BudgetProductsSectionProps) {
  const total = getBudgetItemsTotal(itens, produtos);

  const handleChangeQuantity = (index: number, quantidade: number) => {
    onChange(
      itens.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              quantidade: Math.min(
                Math.max(Number.isFinite(quantidade) ? quantidade : 1, 1),
                MAX_BUDGET_ITEM_QUANTITY,
              ),
            }
          : item,
      ),
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Produtos do catálogo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Opcional. Ao finalizar o orçamento com venda, estes produtos já vêm
            selecionados.
          </Typography>
        </Box>

        {errors?.general ? (
          <Typography color="error" variant="body2" role="alert">
            {errors.general}
          </Typography>
        ) : null}

        {itens.map((item, index) => {
          const produto = produtos.find(
            (current) => current.id === item.idProduto,
          );
          const rowErrors = errors?.rows[index];
          const productMessage =
            rowErrors?.idProduto ??
            getFieldMessage(problem ?? null, `itens[${index}].idProduto`);
          const quantityMessage =
            rowErrors?.quantidade ??
            getFieldMessage(problem ?? null, `itens[${index}].quantidade`);
          const itemLabel = produto?.nome ?? `${index + 1}`;

          return (
            <Box
              key={index}
              role="group"
              aria-label={`Produto ${index + 1} do orçamento`}
              sx={{
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <ProductAutocompleteField
                      products={produtos}
                      productId={item.idProduto}
                      loading={isLoadingProdutos}
                      disabled={disabled}
                      size="small"
                      required
                      onChange={(selected) =>
                        onChange(
                          setBudgetItemProduct(
                            itens,
                            index,
                            selected?.id ?? null,
                          ),
                        )
                      }
                      error={Boolean(productMessage)}
                      helperText={productMessage}
                    />
                  </Box>
                  <IconButton
                    color="error"
                    disabled={disabled}
                    onClick={() =>
                      onChange(
                        itens.filter((_item, itemIndex) => itemIndex !== index),
                      )
                    }
                    aria-label={`Remover ${itemLabel} do orçamento`}
                    sx={{ mt: 0.25 }}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton
                      onClick={() =>
                        handleChangeQuantity(index, item.quantidade - 1)
                      }
                      disabled={disabled || item.quantidade <= 1}
                      aria-label={`Diminuir quantidade de ${itemLabel}`}
                      sx={stepperButtonSx}
                    >
                      <Remove fontSize="small" />
                    </IconButton>

                    <TextField
                      size="small"
                      type="number"
                      value={item.quantidade}
                      disabled={disabled}
                      onChange={(event) =>
                        handleChangeQuantity(index, Number(event.target.value))
                      }
                      error={Boolean(quantityMessage)}
                      helperText={quantityMessage}
                      slotProps={{
                        htmlInput: {
                          min: 1,
                          max: MAX_BUDGET_ITEM_QUANTITY,
                          'aria-label': `Quantidade de ${itemLabel}`,
                        },
                      }}
                      sx={{ width: 72, '& input': { textAlign: 'center' } }}
                    />

                    <IconButton
                      onClick={() =>
                        handleChangeQuantity(index, item.quantidade + 1)
                      }
                      disabled={
                        disabled || item.quantidade >= MAX_BUDGET_ITEM_QUANTITY
                      }
                      aria-label={`Aumentar quantidade de ${itemLabel}`}
                      sx={stepperButtonSx}
                    >
                      <Add fontSize="small" />
                    </IconButton>
                  </Stack>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary">
                      Subtotal
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight={800}
                      aria-label={`Subtotal de ${itemLabel}`}
                    >
                      {formatCurrency(
                        produto ? produto.valor * item.quantidade : 0,
                      )}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Box>
          );
        })}

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1}
        >
          <Button
            startIcon={<AddCircleOutline />}
            disabled={disabled || itens.length >= MAX_BUDGET_ITEMS}
            onClick={() =>
              onChange([...itens, { idProduto: null, quantidade: 1 }])
            }
          >
            Adicionar produto
          </Button>

          {itens.length > 0 ? (
            <Typography fontWeight={700}>
              Soma dos produtos: {formatCurrency(Math.round(total * 100))}
            </Typography>
          ) : null}
        </Stack>
      </Stack>
    </Paper>
  );
}
