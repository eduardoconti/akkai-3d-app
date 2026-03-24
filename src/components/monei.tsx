import React from 'react';
import { NumericFormat, type NumericFormatProps } from 'react-number-format';

const MoneyInputCustom = React.forwardRef<HTMLInputElement, NumericFormatProps>(
  function MoneyInputCustom(props, ref) {
    const { onChange, ...other } = props;

    return (
      <NumericFormat
        {...other}
        getInputRef={ref}
        onValueChange={(values) => {
          onChange?.({
            target: {
              name: props.name,
              value: values.value, // Envia apenas os números (ex: 60.00)
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
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

export default MoneyInputCustom;
