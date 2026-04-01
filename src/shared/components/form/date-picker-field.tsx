import dayjs from 'dayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { TextFieldProps } from '@mui/material';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  slotProps?: {
    textField?: TextFieldProps;
  };
}

export default function DatePickerField({
  label,
  value,
  onValueChange,
  slotProps,
  ...props
}: DatePickerFieldProps) {
  return (
    <DatePicker
      {...props}
      label={label}
      format="DD/MM/YYYY"
      value={value ? dayjs(value) : null}
      onChange={(nextValue) => {
        onValueChange(nextValue?.format('YYYY-MM-DD') ?? '');
      }}
      slotProps={{
        textField: {
          fullWidth: true,
          InputLabelProps: {
            shrink: true,
          },
          ...(slotProps?.textField ?? {}),
        },
      }}
    />
  );
}
