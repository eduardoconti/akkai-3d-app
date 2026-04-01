import { useId } from 'react';
import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import MoneyInput from '@/shared/components/inputs/money-input';

type CurrencyFieldProps = Omit<TextFieldProps, 'onChange' | 'value'> & {
  value: number;
  onValueChange: (value: number) => void;
};

export default function CurrencyField({
  onValueChange,
  value,
  InputProps,
  id,
  ...props
}: CurrencyFieldProps) {
  const generatedId = useId();

  return (
    <TextField
      {...props}
      id={id ?? generatedId}
      value={value}
      onChange={(event) => {
        onValueChange(Number(event.target.value));
      }}
      onFocus={(event) => event.target.select()}
      InputProps={{
        inputComponent: MoneyInput,
        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
        ...InputProps,
      }}
    />
  );
}
