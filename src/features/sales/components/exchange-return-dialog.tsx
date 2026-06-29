import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AccountBalanceWallet,
  Add,
  Close,
  CreditCard,
  Delete,
  LocalAtm,
  Pix,
  Save,
  SwapHoriz,
} from '@mui/icons-material';
import {
  saleStoreSelectors,
  useSaleStore,
} from '@/features/sales/store/use-sale-store';
import {
  emptyExchangeReturnItem,
  initialExchangeReturnFormState,
  type ExchangeReturnFormErrors,
  type ExchangeReturnFormItem,
  type ExchangeReturnFormState,
  type ExchangeReturnItemErrors,
} from '@/features/sales/types/sale-form';
import {
  CurrencyField,
  DatePickerField,
  FormFeedbackAlert,
  ProductAutocompleteField,
  formatCurrency,
  formatLocalDate,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
  type Carteira,
  type MeioPagamento,
  type Produto,
  type TipoDiferencaTrocaDevolucao,
  type TipoItemTrocaDevolucao,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface ExchangeReturnDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  produtos: Produto[];
  carteiras: Carteira[];
  isLoadingProducts?: boolean;
}

const tipoDiferencaLabel: Record<TipoDiferencaTrocaDevolucao, string> = {
  A_PAGAR: 'Cliente paga',
  A_DEVOLVER: 'Devolver ao cliente',
  SEM_DIFERENCA: 'Sem diferença',
};

function SectionLabel({ children }: { children: string }) {
  return (
    <Typography
      variant="overline"
      sx={{
        display: 'block',
        mb: 1.25,
        color: 'text.secondary',
        fontWeight: 800,
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </Typography>
  );
}

function WalletToggleGroup({
  error,
  onChange,
  value,
  wallets,
}: {
  error?: string;
  onChange: (idCarteira: number) => void;
  value: number | '';
  wallets: Array<{ id: number; nome: string; ativa: boolean }>;
}) {
  const activeWallets = wallets.filter((wallet) => wallet.ativa);

  return (
    <Stack spacing={0.75}>
      <Grid container spacing={1}>
        {activeWallets.map((wallet) => {
          const isSelected = wallet.id === value;

          return (
            <Grid
              key={wallet.id}
              size={{
                xs:
                  activeWallets.length === 1
                    ? 12
                    : activeWallets.length >= 3
                      ? 4
                      : 6,
                sm:
                  activeWallets.length === 1
                    ? 12
                    : activeWallets.length >= 3
                      ? 4
                      : 6,
              }}
            >
              <Button
                fullWidth
                variant={isSelected ? 'contained' : 'outlined'}
                color={isSelected ? 'primary' : 'inherit'}
                onClick={() => onChange(wallet.id)}
                sx={{
                  minHeight: 44,
                  justifyContent: 'center',
                  textTransform: 'none',
                  px: 1,
                }}
              >
                {wallet.nome}
              </Button>
            </Grid>
          );
        })}
      </Grid>

      {error ? (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      ) : null}
    </Stack>
  );
}

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

function calcularValorItem(item: ExchangeReturnFormItem): number {
  return Math.round(item.valorUnitario * 100) * item.quantidade;
}

function calcularTotais(form: ExchangeReturnFormState) {
  const valorDevolvido = form.itens
    .filter((item) => item.tipo === 'DEVOLVIDO')
    .reduce((total, item) => total + calcularValorItem(item), 0);
  const valorNovo = form.itens
    .filter((item) => item.tipo === 'ENTREGUE')
    .reduce((total, item) => total + calcularValorItem(item), 0);
  const valorDiferenca = Math.abs(valorNovo - valorDevolvido);
  const tipoDiferenca: TipoDiferencaTrocaDevolucao =
    valorNovo > valorDevolvido
      ? 'A_PAGAR'
      : valorNovo < valorDevolvido
        ? 'A_DEVOLVER'
        : 'SEM_DIFERENCA';

  return {
    valorDevolvido,
    valorNovo,
    valorDiferenca,
    tipoDiferenca,
    temDiferenca: valorDiferenca > 0,
  };
}

function atualizarItem(
  itens: ExchangeReturnFormItem[],
  index: number,
  patch: Partial<ExchangeReturnFormItem>,
): ExchangeReturnFormItem[] {
  return itens.map((item, currentIndex) =>
    currentIndex === index ? { ...item, ...patch } : item,
  );
}

export default function ExchangeReturnDialog({
  open,
  onClose,
  onSaved,
  produtos,
  carteiras,
  isLoadingProducts = false,
}: ExchangeReturnDialogProps) {
  const { criarTrocaDevolucao, isSubmitting, submitErrorMessage } =
    useSaleStore(
      useShallow((state) => ({
        criarTrocaDevolucao: saleStoreSelectors.criarTrocaDevolucao(state),
        isSubmitting: saleStoreSelectors.isSubmitting(state),
        submitErrorMessage: saleStoreSelectors.submitErrorMessage(state),
      })),
    );
  const {
    form,
    setForm,
    problem,
    setProblem,
    localErrors,
    setLocalErrors,
    isSaving,
    setIsSaving,
    resetForm,
    requestClose,
    discardChangesDialog,
  } = useFormDialog<ExchangeReturnFormState, ExchangeReturnFormErrors>({
    open,
    initialValues: initialExchangeReturnFormState,
  });
  const [itemErrors, setItemErrors] = useState<ExchangeReturnItemErrors>([]);
  const [showConfig, setShowConfig] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  const totais = useMemo(() => calcularTotais(form), [form]);
  const isBusy = isSubmitting || isSaving;
  const carteiraSelecionada = carteiras.find(
    (carteira) => carteira.id === form.idCarteira,
  );
  const meiosPagamentoDisponiveis = carteiraSelecionada?.meiosPagamento?.length
    ? carteiraSelecionada.meiosPagamento
    : (['DIN', 'DEB', 'CRE', 'PIX'] as MeioPagamento[]);
  const configSummary = formatLocalDate(
    form.dataTrocaDevolucao,
    'display-date',
  );

  const handleClose = () => {
    resetForm();
    setItemErrors([]);
    setShowConfig(false);
    onClose();
  };

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    requestClose(handleClose);
  };

  const handleDialogDismiss = () => {
    if (isBusy) {
      return;
    }

    onClose();
  };

  const addItem = (tipo: TipoItemTrocaDevolucao) => {
    setForm((current) => ({
      ...current,
      itens: [...current.itens, { ...emptyExchangeReturnItem, tipo }],
    }));
  };

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      itens:
        current.itens.length === 1
          ? current.itens
          : current.itens.filter(
              (_item, currentIndex) => currentIndex !== index,
            ),
    }));
    setItemErrors((current) =>
      current.filter((_item, currentIndex) => currentIndex !== index),
    );
  };

  const setProduct = (index: number, produto: Produto | null) => {
    setForm((current) => ({
      ...current,
      itens: atualizarItem(current.itens, index, {
        idProduto: produto?.id ?? '',
        valorUnitario: produto ? produto.valor / 100 : 0,
      }),
    }));
  };

  const handleChangeWallet = (idCarteira: number) => {
    const carteira = carteiras.find((current) => current.id === idCarteira);
    const meiosPagamento = carteira?.meiosPagamento?.length
      ? carteira.meiosPagamento
      : (['DIN', 'DEB', 'CRE', 'PIX'] as MeioPagamento[]);

    setForm((current) => ({
      ...current,
      idCarteira,
      meioPagamento: meiosPagamento.includes(current.meioPagamento)
        ? current.meioPagamento
        : meiosPagamento[0],
    }));
  };

  const validate = (): boolean => {
    const nextItemErrors: ExchangeReturnItemErrors = [];
    const nextErrors: ExchangeReturnFormErrors = {};

    if (!form.dataTrocaDevolucao) {
      nextErrors.dataTrocaDevolucao = 'Selecione a data.';
    }

    if (!form.itens.some((item) => item.tipo === 'DEVOLVIDO')) {
      nextErrors.itens = 'Adicione ao menos um produto devolvido.';
    }

    form.itens.forEach((item, index) => {
      const errors: ExchangeReturnItemErrors[number] = {};

      if (!item.idProduto) {
        errors.idProduto = 'Selecione um produto.';
      }

      if (item.quantidade <= 0) {
        errors.quantidade = 'Informe uma quantidade maior que zero.';
      }

      if (item.valorUnitario < 0) {
        errors.valorUnitario = 'Informe um valor unitário válido.';
      }

      nextItemErrors[index] = errors;
    });

    if (totais.temDiferenca) {
      if (!form.idCarteira) {
        nextErrors.idCarteira = 'Selecione a carteira.';
      }

      if (
        form.idCarteira &&
        carteiraSelecionada?.meiosPagamento?.length &&
        !carteiraSelecionada.meiosPagamento.includes(form.meioPagamento)
      ) {
        nextErrors.meioPagamento = 'Selecione um meio aceito pela carteira.';
      }
    }

    setLocalErrors(nextErrors);
    setItemErrors(nextItemErrors);

    return (
      Object.keys(nextErrors).length === 0 &&
      nextItemErrors.every((errors) => Object.keys(errors ?? {}).length === 0)
    );
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setProblem(null);
    setIsSaving(true);

    const result = await criarTrocaDevolucao({
      dataTrocaDevolucao: formatLocalDate(
        form.dataTrocaDevolucao,
        'api-date-time',
      ),
      itens: form.itens.map((item) => ({
        idProduto: item.idProduto as number,
        tipo: item.tipo,
        quantidade: item.quantidade,
        valorUnitario: Math.round(item.valorUnitario * 100),
      })),
      idCarteira:
        totais.temDiferenca && form.idCarteira ? form.idCarteira : undefined,
      meioPagamento: totais.temDiferenca ? form.meioPagamento : undefined,
      observacao: form.observacao.trim() || undefined,
    });

    setIsSaving(false);

    if (!result.success) {
      setProblem(result.problem);
      return;
    }

    showSuccess('Troca/devolução registrada com sucesso.');
    await onSaved();
    handleClose();
  };

  const helperText = (field: keyof ExchangeReturnFormErrors) =>
    localErrors[field] ?? getFieldMessage(problem, field) ?? undefined;

  return (
    <>
      <Dialog
        open={open}
        onClose={handleDialogDismiss}
        fullWidth
        maxWidth="md"
        aria-labelledby="exchange-return-dialog-title"
      >
        <DialogTitle id="exchange-return-dialog-title">
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <SwapHoriz color="primary" />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={800}>
                Troca/devolução
              </Typography>
              <Button
                color="inherit"
                size="small"
                onClick={() => setShowConfig((current) => !current)}
                sx={{
                  justifyContent: 'flex-start',
                  minWidth: 0,
                  px: 0,
                  mt: 0.25,
                  color: 'text.secondary',
                  textTransform: 'none',
                }}
              >
                <Typography variant="body2" noWrap>
                  {configSummary}
                </Typography>
              </Button>
            </Box>
            <IconButton
              aria-label="Fechar modal de troca/devolução"
              onClick={handleDialogClose}
              disabled={isBusy}
            >
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            <FormFeedbackAlert
              message={problem?.detail ?? submitErrorMessage}
            />

            <Collapse in={showConfig} unmountOnExit>
              <Paper elevation={2} sx={{ borderRadius: 2, p: 1.5 }}>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <DatePickerField
                      label="Data"
                      value={form.dataTrocaDevolucao}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          dataTrocaDevolucao: value,
                        }))
                      }
                      slotProps={{
                        textField: {
                          size: 'small',
                          required: true,
                          error: Boolean(helperText('dataTrocaDevolucao')),
                          helperText: helperText('dataTrocaDevolucao'),
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Collapse>

            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                spacing={1}
              >
                <Typography variant="subtitle2">Produtos</Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => addItem('DEVOLVIDO')}
                  >
                    Devolvido
                  </Button>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => addItem('ENTREGUE')}
                  >
                    Entregue
                  </Button>
                </Stack>
              </Stack>

              {helperText('itens') ? (
                <Typography variant="caption" color="error">
                  {helperText('itens')}
                </Typography>
              ) : null}

              <Stack spacing={1.5}>
                {form.itens.map((item, index) => {
                  const currentErrors = itemErrors[index] ?? {};

                  return (
                    <Paper
                      key={`${index}-${item.tipo}`}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 1 }}
                    >
                      <Grid container spacing={2} alignItems="flex-start">
                        <Grid size={{ xs: 12, md: 2 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            color={item.tipo === 'ENTREGUE' ? 'error' : 'info'}
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                itens: atualizarItem(current.itens, index, {
                                  tipo:
                                    item.tipo === 'DEVOLVIDO'
                                      ? 'ENTREGUE'
                                      : 'DEVOLVIDO',
                                }),
                              }))
                            }
                            sx={{
                              height: 56,
                              textTransform: 'none',
                              fontWeight: 800,
                            }}
                          >
                            {item.tipo === 'DEVOLVIDO'
                              ? 'Devolvido'
                              : 'Entregue'}
                          </Button>
                        </Grid>

                        <Grid size={{ xs: 12, md: 5 }}>
                          <ProductAutocompleteField
                            products={produtos}
                            productId={item.idProduto}
                            onChange={(produto) => setProduct(index, produto)}
                            label="Produto"
                            required
                            loading={isLoadingProducts}
                            disabled={
                              isLoadingProducts || produtos.length === 0
                            }
                            error={Boolean(currentErrors.idProduto)}
                            helperText={currentErrors.idProduto}
                          />
                        </Grid>

                        <Grid size={{ xs: 6, md: 2 }}>
                          <TextField
                            label="Qtd"
                            type="number"
                            fullWidth
                            value={item.quantidade}
                            inputProps={{ min: 1, max: 500 }}
                            error={Boolean(currentErrors.quantidade)}
                            helperText={currentErrors.quantidade}
                            onChange={(event) =>
                              setForm((current) => ({
                                ...current,
                                itens: atualizarItem(current.itens, index, {
                                  quantidade: Math.max(
                                    1,
                                    Number(event.target.value),
                                  ),
                                }),
                              }))
                            }
                          />
                        </Grid>

                        <Grid size={{ xs: 6, md: 2 }}>
                          <CurrencyField
                            label="Unitário"
                            value={item.valorUnitario}
                            onValueChange={(value) =>
                              setForm((current) => ({
                                ...current,
                                itens: atualizarItem(current.itens, index, {
                                  valorUnitario: value,
                                }),
                              }))
                            }
                            fullWidth
                            error={Boolean(currentErrors.valorUnitario)}
                            helperText={currentErrors.valorUnitario}
                          />
                        </Grid>

                        <Grid size={{ xs: 12, md: 1 }}>
                          <IconButton
                            aria-label="Remover item"
                            onClick={() => removeItem(index)}
                            disabled={form.itens.length === 1}
                          >
                            <Delete />
                          </IconButton>
                        </Grid>
                      </Grid>

                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                        sx={{ mt: 1.5 }}
                      >
                        <Typography variant="body2" fontWeight={700}>
                          {formatCurrency(calcularValorItem(item))}
                        </Typography>
                      </Stack>
                    </Paper>
                  );
                })}
              </Stack>
            </Stack>

            <Box>
              <SectionLabel>Forma de pagamento</SectionLabel>

              {!totais.temDiferenca ? (
                <Paper
                  elevation={2}
                  sx={{
                    borderRadius: 2,
                    p: 1.5,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Sem diferença financeira para registrar.
                  </Typography>
                </Paper>
              ) : (
                <>
                  <Stack spacing={1.25} sx={{ mb: 1.5 }}>
                    <WalletToggleGroup
                      value={form.idCarteira}
                      wallets={carteiras}
                      onChange={handleChangeWallet}
                      error={helperText('idCarteira')}
                    />
                  </Stack>

                  {helperText('meioPagamento') ? (
                    <Typography
                      variant="caption"
                      color="error"
                      sx={{ display: 'block', mb: 1 }}
                    >
                      {helperText('meioPagamento')}
                    </Typography>
                  ) : null}

                  <Grid container spacing={1}>
                    {paymentOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected = form.meioPagamento === option.value;
                      const isAvailable = meiosPagamentoDisponiveis.includes(
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
                              setForm((current) => ({
                                ...current,
                                meioPagamento: option.value,
                              }))
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
              )}
            </Box>

            <TextField
              label="Observação"
              value={form.observacao}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  observacao: event.target.value,
                }))
              }
              fullWidth
              multiline
              minRows={2}
              error={Boolean(helperText('observacao'))}
              helperText={helperText('observacao')}
              inputProps={{ maxLength: 500 }}
            />
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={2}
            divider={<Divider orientation="vertical" flexItem />}
            sx={{ flexWrap: 'wrap', rowGap: 1 }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Devolvido
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {formatCurrency(totais.valorDevolvido)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Entregue
              </Typography>
              <Typography variant="body2" fontWeight={700}>
                {formatCurrency(totais.valorNovo)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {tipoDiferencaLabel[totais.tipoDiferenca]}
              </Typography>
              <Typography
                variant="body2"
                fontWeight={800}
                color={
                  totais.tipoDiferenca === 'A_DEVOLVER'
                    ? 'error.main'
                    : totais.tipoDiferenca === 'A_PAGAR'
                      ? 'success.main'
                      : 'text.primary'
                }
              >
                {formatCurrency(totais.valorDiferenca)}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={handleDialogClose} disabled={isBusy}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              disabled={isBusy}
              onClick={() => {
                void handleSubmit();
              }}
            >
              {isBusy ? 'Salvando...' : 'Registrar'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {discardChangesDialog}
    </>
  );
}
