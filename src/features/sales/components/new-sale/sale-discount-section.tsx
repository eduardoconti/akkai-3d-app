import {
  Box,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { CurrencyField, getFieldMessage, type ProblemDetails } from '@/shared';
import type { DiscountMode } from '@/features/sales/types/sale-form';
import { SectionLabel } from './sale-form-parts';

interface SaleDiscountSectionProps {
  discount: number;
  discountMode: DiscountMode;
  error?: string;
  helperText?: string;
  problem: ProblemDetails | null;
  onChangeDiscount: (desconto: number) => void;
  onChangeMode: (descontoModo: DiscountMode) => void;
}

export default function SaleDiscountSection({
  discount,
  discountMode,
  error,
  helperText,
  problem,
  onChangeDiscount,
  onChangeMode,
}: SaleDiscountSectionProps) {
  const hasError = Boolean(error || getFieldMessage(problem, 'desconto'));

  return (
    <Box>
      <SectionLabel>Desconto</SectionLabel>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <ToggleButtonGroup
            exclusive
            value={discountMode}
            size="small"
            onChange={(_event, newValue: DiscountMode | null) => {
              if (!newValue) {
                return;
              }
              onChangeMode(newValue);
            }}
            sx={{
              flexShrink: 0,
              '& .MuiToggleButton-root': {
                width: 48,
                height: 40,
                fontWeight: 800,
              },
            }}
          >
            <ToggleButton value="VALOR">R$</ToggleButton>
            <ToggleButton value="PERCENTUAL">%</ToggleButton>
          </ToggleButtonGroup>

          {discountMode === 'VALOR' ? (
            <CurrencyField
              fullWidth
              size="small"
              placeholder="0,00"
              value={discount}
              onValueChange={(desconto) => {
                onChangeDiscount(Math.min(desconto, 999.99));
              }}
              name="desconto"
              error={hasError}
              inputProps={{
                'aria-label': 'Desconto em reais',
              }}
            />
          ) : (
            <TextField
              fullWidth
              size="small"
              type="number"
              placeholder="0"
              value={discount}
              onChange={(event) => {
                const desconto = Number(event.target.value);
                onChangeDiscount(
                  Number.isNaN(desconto) ? 0 : Math.min(desconto, 99),
                );
              }}
              inputProps={{
                min: 0,
                max: 99,
                step: 1,
                'aria-label': 'Desconto em percentual',
              }}
              error={hasError}
            />
          )}
        </Stack>

        {helperText ? (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );
}
