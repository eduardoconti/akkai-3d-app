import {
  Alert,
  Box,
  Button,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AccountBalanceWallet,
  CreditCard,
  Delete,
  LocalAtm,
  Pix,
} from '@mui/icons-material';
import {
  CurrencyField,
  formatCurrency,
  getFieldMessage,
  type Carteira,
  type MeioPagamento,
  type ProblemDetails,
} from '@/shared';
import type {
  SaleFormPayment,
  SalePaymentErrors,
} from '@/features/sales/types/sale-form';
import { SectionLabel, WalletToggleGroup } from './sale-form-parts';

const paymentOptions: Array<{
  value: MeioPagamento;
  label: string;
  icon: typeof LocalAtm;
}> = [
  { value: 'DIN', label: 'Dinheiro', icon: LocalAtm },
  { value: 'PIX', label: 'Pix', icon: Pix },
  { value: 'CRE', label: 'Crédito', icon: CreditCard },
  { value: 'DEB', label: 'Débito', icon: AccountBalanceWallet },
];

interface SalePaymentSectionProps {
  errorMessage?: string;
  getAvailableMethods: (idCarteira: number | '') => MeioPagamento[];
  hasEmptySplitPayment: boolean;
  isBusy: boolean;
  paymentErrors: SalePaymentErrors;
  payments: SaleFormPayment[];
  paymentsRemaining: number;
  primaryPayment: SaleFormPayment;
  problem: ProblemDetails | null;
  total: number;
  wallets: Carteira[];
  onAddPayment: () => void;
  onChangePaymentValue: (index: number, valor: number) => void;
  onChangeWallet: (index: number, idCarteira: number | '') => void;
  onFillRemaining: () => void;
  onRemovePayment: (index: number) => void;
  onUpdatePayment: (index: number, partial: Partial<SaleFormPayment>) => void;
}

export default function SalePaymentSection({
  errorMessage,
  getAvailableMethods,
  hasEmptySplitPayment,
  isBusy,
  paymentErrors,
  payments,
  paymentsRemaining,
  primaryPayment,
  problem,
  total,
  wallets,
  onAddPayment,
  onChangePaymentValue,
  onChangeWallet,
  onFillRemaining,
  onRemovePayment,
  onUpdatePayment,
}: SalePaymentSectionProps) {
  const availablePrimaryMethods = getAvailableMethods(
    primaryPayment.idCarteira,
  );

  return (
    <Box>
      <SectionLabel>Forma de pagamento</SectionLabel>

      {errorMessage ? (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {errorMessage}
        </Alert>
      ) : null}

      {payments.length === 1 ? (
        <>
          <Stack spacing={1.25} sx={{ mb: 1.5 }}>
            <WalletToggleGroup
              value={primaryPayment.idCarteira}
              wallets={wallets}
              onChange={(idCarteira) => onChangeWallet(0, idCarteira)}
              error={
                paymentErrors[0]?.idCarteira ??
                getFieldMessage(problem, 'pagamentos[0].idCarteira')
              }
            />
          </Stack>

          <Grid container spacing={1}>
            {paymentOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = primaryPayment.meioPagamento === option.value;
              const isAvailable = availablePrimaryMethods.includes(
                option.value,
              );

              return (
                <Grid key={option.value} size={{ xs: 6 }}>
                  <Button
                    fullWidth
                    variant={isSelected ? 'contained' : 'outlined'}
                    color={isSelected ? 'success' : 'inherit'}
                    disabled={!isAvailable || isBusy}
                    onClick={() =>
                      onUpdatePayment(0, { meioPagamento: option.value })
                    }
                    sx={{
                      height: 64,
                      flexDirection: 'column',
                      gap: 0.5,
                      textTransform: 'none',
                    }}
                  >
                    <Icon fontSize="small" />
                    {option.label}
                  </Button>
                </Grid>
              );
            })}
          </Grid>
        </>
      ) : null}

      {payments.length < 2 ? (
        <Button
          onClick={onAddPayment}
          variant="text"
          disabled={isBusy}
          sx={{ mt: 1.5, textTransform: 'none' }}
        >
          Dividir em mais formas de pagamento
        </Button>
      ) : null}

      <Collapse in={payments.length > 1} unmountOnExit>
        <Stack spacing={1.25} sx={{ mt: 1.5 }}>
          {payments.map((pagamento, index) => {
            const availableMeiosPagamento = getAvailableMethods(
              pagamento.idCarteira,
            );
            const paymentValue =
              payments.length === 1 ? total / 100 : pagamento.valor;

            return (
              <Paper
                key={`pagamento-${index}`}
                elevation={2}
                sx={{
                  borderRadius: 2,
                  p: 1.25,
                }}
              >
                <Stack spacing={1.25}>
                  <WalletToggleGroup
                    value={pagamento.idCarteira}
                    wallets={wallets}
                    onChange={(idCarteira) => onChangeWallet(index, idCarteira)}
                    error={
                      paymentErrors[index]?.idCarteira ??
                      getFieldMessage(
                        problem,
                        `pagamentos[${index}].idCarteira`,
                      )
                    }
                  />

                  <Grid container spacing={1.25} alignItems="flex-start">
                    <Grid size={{ xs: 4, sm: 3 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Meio"
                        required
                        value={pagamento.meioPagamento}
                        onChange={(event) => {
                          onUpdatePayment(index, {
                            meioPagamento: event.target.value as MeioPagamento,
                          });
                        }}
                        error={Boolean(
                          paymentErrors[index]?.meioPagamento ||
                          getFieldMessage(
                            problem,
                            `pagamentos[${index}].meioPagamento`,
                          ),
                        )}
                        helperText={
                          paymentErrors[index]?.meioPagamento ??
                          getFieldMessage(
                            problem,
                            `pagamentos[${index}].meioPagamento`,
                          )
                        }
                      >
                        {availableMeiosPagamento.includes('DEB') && (
                          <MenuItem value="DEB">Débito</MenuItem>
                        )}
                        {availableMeiosPagamento.includes('CRE') && (
                          <MenuItem value="CRE">Crédito</MenuItem>
                        )}
                        {availableMeiosPagamento.includes('DIN') && (
                          <MenuItem value="DIN">Dinheiro</MenuItem>
                        )}
                        {availableMeiosPagamento.includes('PIX') && (
                          <MenuItem value="PIX">Pix</MenuItem>
                        )}
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 6, sm: 8 }}>
                      <CurrencyField
                        fullWidth
                        size="small"
                        label="Valor"
                        required
                        value={paymentValue}
                        onValueChange={(valor) => {
                          onChangePaymentValue(index, valor);
                        }}
                        disabled={payments.length === 1}
                        error={Boolean(
                          paymentErrors[index]?.valor ||
                          getFieldMessage(
                            problem,
                            `pagamentos[${index}].valor`,
                          ),
                        )}
                        helperText={
                          paymentErrors[index]?.valor ??
                          getFieldMessage(problem, `pagamentos[${index}].valor`)
                        }
                      />
                    </Grid>

                    <Grid
                      size={{ xs: 2, sm: 1 }}
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <IconButton
                        onClick={() => onRemovePayment(index)}
                        color="error"
                        disabled={payments.length === 1 || isBusy}
                        aria-label={`Remover pagamento ${index + 1}`}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Stack>
              </Paper>
            );
          })}

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            role="status"
            aria-live="polite"
          >
            <Typography
              variant="body2"
              fontWeight={700}
              color={
                paymentsRemaining === 0 && hasEmptySplitPayment
                  ? 'warning.dark'
                  : paymentsRemaining === 0
                    ? 'success.main'
                    : paymentsRemaining > 0
                      ? 'warning.dark'
                      : 'error.main'
              }
            >
              {paymentsRemaining === 0 && hasEmptySplitPayment
                ? 'Informe um valor maior que zero em cada pagamento'
                : paymentsRemaining === 0
                  ? 'Pagamentos conferem com o total'
                  : paymentsRemaining > 0
                    ? `Falta ${formatCurrency(paymentsRemaining)}`
                    : `Excede ${formatCurrency(Math.abs(paymentsRemaining))}`}
            </Typography>
            {paymentsRemaining !== 0 ? (
              <Button size="small" onClick={onFillRemaining} disabled={isBusy}>
                Ajustar último valor
              </Button>
            ) : null}
          </Stack>
        </Stack>
      </Collapse>
    </Box>
  );
}
