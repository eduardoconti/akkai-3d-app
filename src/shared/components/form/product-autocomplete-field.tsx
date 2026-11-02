import { useMemo, type Ref } from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import type { Produto } from '@/shared/lib/types/domain';

interface ProductAutocompleteFieldProps {
  products: Produto[];
  productId: number | null | '';
  onChange: (product: Produto | null) => void;
  label?: string;
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  required?: boolean;
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  /** Exibe o estoque atual ao lado de cada produto na lista. */
  showStock?: boolean;
}

export default function ProductAutocompleteField({
  products,
  productId,
  onChange,
  label = 'Produto',
  helperText,
  error = false,
  disabled = false,
  loading = false,
  fullWidth = true,
  size = 'medium',
  required = false,
  autoFocus = false,
  inputRef,
  showStock = false,
}: ProductAutocompleteFieldProps) {
  // Com o estoque visível, produtos disponíveis vêm primeiro na lista.
  const options = useMemo(
    () =>
      showStock
        ? [...products].sort(
            (a, b) =>
              Number((b.quantidadeEstoque ?? 1) > 0) -
              Number((a.quantidadeEstoque ?? 1) > 0),
          )
        : products,
    [products, showStock],
  );

  return (
    <Autocomplete
      options={options}
      autoHighlight
      noOptionsText="Nenhum produto encontrado"
      loadingText="Carregando produtos..."
      getOptionLabel={(option) => `${option.nome} (${option.codigo})`}
      value={products.find((product) => product.id === productId) ?? null}
      loading={loading}
      disabled={disabled}
      onChange={(_event, newValue) => onChange(newValue)}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderOption={
        showStock
          ? (props, option) => {
              const { key, ...optionProps } = props;
              const stock = option.quantidadeEstoque;
              const isOut = stock !== undefined && stock <= 0;

              return (
                <Box
                  component="li"
                  key={key}
                  {...optionProps}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 2,
                  }}
                >
                  <span>{`${option.nome} (${option.codigo})`}</span>
                  {stock !== undefined ? (
                    <Typography
                      variant="caption"
                      color={isOut ? 'warning.dark' : 'text.secondary'}
                      sx={{ flexShrink: 0, fontWeight: isOut ? 700 : 400 }}
                    >
                      {isOut ? 'Sem estoque' : `Estoque: ${stock}`}
                    </Typography>
                  ) : null}
                </Box>
              );
            }
          : undefined
      }
      renderInput={(params) => (
        <TextField
          {...params}
          fullWidth={fullWidth}
          size={size}
          label={label}
          required={required}
          autoFocus={autoFocus}
          inputRef={inputRef}
          error={error}
          helperText={helperText}
        />
      )}
    />
  );
}
