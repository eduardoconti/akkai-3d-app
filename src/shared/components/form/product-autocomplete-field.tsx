import { Autocomplete, TextField } from '@mui/material';
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
}: ProductAutocompleteFieldProps) {
  return (
    <Autocomplete
      options={products}
      openOnFocus
      autoHighlight
      noOptionsText="Nenhum produto encontrado"
      loadingText="Carregando produtos..."
      getOptionLabel={(option) => `${option.nome} (${option.codigo})`}
      value={products.find((product) => product.id === productId) ?? null}
      loading={loading}
      disabled={disabled}
      onChange={(_event, newValue) => onChange(newValue)}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      renderInput={(params) => (
        <TextField
          {...params}
          fullWidth={fullWidth}
          size={size}
          label={label}
          required={required}
          autoFocus={autoFocus}
          error={error}
          helperText={helperText}
        />
      )}
    />
  );
}
