import { forwardRef, type ChangeEvent } from 'react';
import type { InputBaseComponentProps } from '@mui/material/InputBase';
import { NumericFormat } from 'react-number-format';

const MoneyInput = forwardRef<HTMLInputElement, InputBaseComponentProps>(
  function MoneyInput(props, ref) {
    const { onChange, name, ...other } = props;

    return (
      <NumericFormat
        {...other}
        getInputRef={ref}
        onValueChange={(values) => {
          onChange?.({
            target: {
              name,
              value: values.value,
            },
          } as unknown as ChangeEvent<HTMLInputElement>);
        }}
        thousandSeparator="."
        decimalSeparator=","
        valueIsNumericString
        fixedDecimalScale
        decimalScale={2}
        allowLeadingZeros={false}
      />
    );
  },
);

export default MoneyInput;
