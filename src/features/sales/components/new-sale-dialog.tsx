import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add, Delete, ShoppingCartCheckout } from '@mui/icons-material';
import { useProductStore } from '@/features/products/store/use-product-store';
import { useSaleStore } from '@/features/sales/store/use-sale-store';
import {
  emptySaleItem,
  initialSaleFormState,
  type SaleFormErrors,
  type SaleFormItem,
  type SaleFormState,
  type SaleItemErrors,
  type SaleItemType,
} from '@/features/sales/types/sale-form';
import {
  CurrencyField,
  FormFeedbackAlert,
  formatCurrency,
  getFieldMessage,
  useFeedbackStore,
  useOnlineStatus,
  type MeioPagamento,
  type ProblemDetails,
  type TipoVenda,
} from '@/shared';

interface NewSaleDialogProps {
  open: boolean;
  onClose: () => void;
}

function getCatalogProductValue(
  item: SaleFormItem,
  produtos: Array<{ id: number; valor: number }>,
) {
  const product = produtos.find((current) => current.id === item.idProduto);
  return product?.valor ?? 0;
}

export default function NewSaleDialog({ open, onClose }: NewSaleDialogProps) {
  const isOnline = useOnlineStatus();
  const {
    fetchErrorMessage: productFetchErrorMessage,
    fetchProdutos,
    isFetchingProducts,
    produtos,
  } = useProductStore();
  const {
    criarVenda,
    carteiras,
    fetchErrorMessage: saleFetchErrorMessage,
    fetchCarteiras,
    feiras,
    fetchFeiras,
    fetchVendas,
    isFetching: isFetchingSales,
    isSubmitting,
    submitErrorMessage,
    clearSubmitError,
  } = useSaleStore();

  const [form, setForm] = useState<SaleFormState>(initialSaleFormState);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<SaleFormErrors>({});
  const [itemErrors, setItemErrors] = useState<SaleItemErrors>([]);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (open) {
      void fetchProdutos();
      void fetchFeiras();
      void fetchCarteiras();
      return;
    }

    setForm(initialSaleFormState);
    setProblem(null);
    setLocalErrors({});
    setItemErrors([]);
    clearSubmitError();
  }, [open, fetchCarteiras, fetchFeiras, fetchProdutos, clearSubmitError]);

  useEffect(() => {
    const carteiraPadrao = carteiras.find((carteira) => carteira.ativa);

    if (open && form.idCarteira === '' && carteiraPadrao) {
      setForm((current) => ({
        ...current,
        idCarteira: carteiraPadrao.id,
      }));
    }
  }, [open, carteiras, form.idCarteira]);

  useEffect(() => {
    window.__AKKAI_PRODUCTS__ = produtos;
  }, [produtos]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let itemDiscounts = 0;

    form.itens.forEach((item) => {
      const unitValue =
        item.tipoItem === 'CATALOGO'
          ? getCatalogProductValue(item, produtos)
          : Math.round(item.valorUnitario * 100);

      subtotal += unitValue * item.quantidade;
      itemDiscounts += Math.round((item.desconto ?? 0) * 100);
    });

    const saleDiscount = Math.round((form.desconto ?? 0) * 100);

    return {
      subtotal,
      itemDiscounts,
      saleDiscount,
      total: Math.max(0, subtotal - itemDiscounts - saleDiscount),
    };
  }, [form, produtos]);

  const handleClose = () => {
    setForm(initialSaleFormState);
    setProblem(null);
    setLocalErrors({});
    setItemErrors([]);
    clearSubmitError();
    onClose();
  };

  const handleAddItem = () => {
    setForm((current) => ({
      ...current,
      itens: [...current.itens, { ...emptySaleItem }],
    }));
    setItemErrors((current) => [...current, {}]);
  };

  const handleRemoveItem = (index: number) => {
    setForm((current) => ({
      ...current,
      itens: current.itens.filter((_, currentIndex) => currentIndex !== index),
    }));
    setItemErrors((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const updateItem = (index: number, partial: Partial<SaleFormItem>) => {
    setForm((current) => {
      const itens = [...current.itens];
      itens[index] = {
        ...itens[index],
        ...partial,
      };
      return { ...current, itens };
    });
  };

  const handleChangeItemType = (index: number, tipoItem: SaleItemType) => {
    updateItem(index, {
      tipoItem,
      idProduto: null,
      nomeProduto: '',
      valorUnitario: 0,
      quantidade: 1,
      desconto: 0,
    });
  };

  const validateForm = () => {
    const nextLocalErrors: SaleFormErrors = {};
    const nextItemErrors: SaleItemErrors = form.itens.map((item) => {
      const errors: SaleItemErrors[number] = {};

      if (item.tipoItem === 'CATALOGO' && !item.idProduto) {
        errors.idProduto = 'Selecione um produto do catálogo.';
      }

      if (item.tipoItem === 'AVULSO' && !item.nomeProduto.trim()) {
        errors.nomeProduto = 'Informe o nome do item avulso.';
      }

      if (item.tipoItem === 'AVULSO' && item.valorUnitario <= 0) {
        errors.valorUnitario = 'Informe um valor unitário maior que zero.';
      }

      if (item.quantidade < 1) {
        errors.quantidade = 'Informe uma quantidade de pelo menos 1 unidade.';
      }

      if (item.desconto < 0) {
        errors.desconto = 'O desconto do item não pode ser negativo.';
      }

      return errors;
    });

    if (form.tipo === 'FEIRA' && form.idFeira === '') {
      nextLocalErrors.idFeira = 'Selecione a feira em que a venda aconteceu.';
    }

    if (form.idCarteira === '') {
      nextLocalErrors.idCarteira =
        'Selecione a carteira que recebeu essa venda.';
    }

    if (form.itens.length === 0) {
      nextLocalErrors.itens = 'Adicione ao menos um item na venda.';
    }

    return { nextLocalErrors, nextItemErrors };
  };

  const handleSubmit = async () => {
    const { nextLocalErrors, nextItemErrors } = validateForm();
    setLocalErrors(nextLocalErrors);
    setItemErrors(nextItemErrors);
    setProblem(null);

    const hasItemErrors = nextItemErrors.some(
      (item) => Object.keys(item).length > 0,
    );

    if (Object.keys(nextLocalErrors).length > 0 || hasItemErrors) {
      return;
    }

    const result = await criarVenda({
      meioPagamento: form.meioPagamento,
      tipo: form.tipo,
      idFeira: form.idFeira === '' ? undefined : form.idFeira,
      idCarteira: form.idCarteira === '' ? 0 : form.idCarteira,
      desconto: Math.round(form.desconto * 100),
      itens: form.itens.map((item) => {
        if (item.tipoItem === 'CATALOGO') {
          return {
            idProduto: item.idProduto ?? undefined,
            quantidade: item.quantidade,
            desconto: Math.round(item.desconto * 100),
          };
        }

        return {
          nomeProduto: item.nomeProduto.trim(),
          valorUnitario: Math.round(item.valorUnitario * 100),
          quantidade: item.quantidade,
          desconto: Math.round(item.desconto * 100),
        };
      }),
    });

    if (!result.success) {
      setProblem(result.problem);
      return;
    }

    if (result.data.id < 0) {
      showSuccess('Venda salva offline. Sincronize quando a internet voltar.');
      handleClose();
      return;
    }

    await fetchVendas();
    showSuccess('Venda cadastrada com sucesso.');
    handleClose();
  };

  const isFetching = isFetchingProducts || isFetchingSales;
  const globalMessage =
    problem?.detail ??
    submitErrorMessage ??
    saleFetchErrorMessage ??
    productFetchErrorMessage;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ fontWeight: 700 }}>Nova Venda Rápida</DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={globalMessage} />

        {!isOnline ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Você está offline. As vendas serão salvas localmente e poderão ser
            sincronizadas depois.
          </Alert>
        ) : null}

        {form.tipo === 'FEIRA' && feiras.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Nenhuma feira cadastrada até o momento. Cadastre uma feira no
            backend antes de registrar vendas desse tipo.
          </Alert>
        ) : null}

        {carteiras.length === 0 ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Nenhuma carteira cadastrada até o momento. Cadastre uma carteira
            para registrar vendas.
          </Alert>
        ) : null}

        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Tipo de Venda"
              value={form.tipo}
              onChange={(event) => {
                const type = event.target.value as TipoVenda;
                setForm((current) => ({
                  ...current,
                  tipo: type,
                  idFeira: type === 'FEIRA' ? current.idFeira : '',
                }));
              }}
            >
              <MenuItem value="FEIRA">Feira</MenuItem>
              <MenuItem value="LOJA">Loja</MenuItem>
              <MenuItem value="ONLINE">Online</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Carteira"
              value={form.idCarteira}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  idCarteira:
                    event.target.value === '' ? '' : Number(event.target.value),
                }));
              }}
              error={Boolean(
                localErrors.idCarteira ||
                  getFieldMessage(problem, 'idCarteira'),
              )}
              helperText={
                localErrors.idCarteira ??
                getFieldMessage(problem, 'idCarteira')
              }
            >
              <MenuItem value="">Selecione uma carteira</MenuItem>
              {carteiras
                .filter((carteira) => carteira.ativa)
                .map((carteira) => (
                  <MenuItem key={carteira.id} value={carteira.id}>
                    {carteira.nome}
                  </MenuItem>
                ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Meio de Pagamento"
              value={form.meioPagamento}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  meioPagamento: event.target.value as MeioPagamento,
                }));
              }}
            >
              <MenuItem value="DEB">Cartão débito</MenuItem>
              <MenuItem value="CRE">Cartão crédito</MenuItem>
              <MenuItem value="DIN">Dinheiro</MenuItem>
              <MenuItem value="PIX">Pix</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <CurrencyField
              fullWidth
              label="Desconto na Venda (R$)"
              value={form.desconto}
              onValueChange={(desconto) => {
                setForm((current) => ({ ...current, desconto }));
              }}
              name="desconto"
              error={Boolean(getFieldMessage(problem, 'desconto'))}
              helperText={getFieldMessage(problem, 'desconto')}
            />
          </Grid>

          {form.tipo === 'FEIRA' ? (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Feira"
                value={form.idFeira}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    idFeira:
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value),
                  }));
                }}
                error={Boolean(
                  localErrors.idFeira || getFieldMessage(problem, 'idFeira'),
                )}
                helperText={
                  localErrors.idFeira ?? getFieldMessage(problem, 'idFeira')
                }
              >
                <MenuItem value="">Selecione uma feira</MenuItem>
                {feiras.map((feira) => (
                  <MenuItem key={feira.id} value={feira.id}>
                    {feira.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          ) : null}
        </Grid>

        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
          Itens da Venda
        </Typography>

        {localErrors.itens ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {localErrors.itens}
          </Alert>
        ) : null}

        {form.itens.map((item, index) => {
          const itemLabel = item.tipoItem === 'CATALOGO' ? 'catalogo' : 'avulso';

          return (
            <Box
              key={`${index}-${item.tipoItem}-${item.idProduto ?? 'novo'}`}
              sx={{
                mb: 2,
                px: 0,
                py: 0.5,
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid size={{ xs: 12, sm: 2 }}>
                  <TextField
                    select
                    fullWidth
                    label="Tipo do item"
                    value={item.tipoItem}
                    onChange={(event) =>
                      handleChangeItemType(
                        index,
                        event.target.value as SaleItemType,
                      )
                    }
                  >
                    <MenuItem value="CATALOGO">Catalogo</MenuItem>
                    <MenuItem value="AVULSO">Avulso</MenuItem>
                  </TextField>
                </Grid>

                {item.tipoItem === 'CATALOGO' ? (
                  <>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Autocomplete
                        options={produtos}
                        getOptionLabel={(option) => `${option.nome} (${option.codigo})`}
                        value={
                          produtos.find((produto) => produto.id === item.idProduto) ??
                          null
                        }
                        loading={isFetching}
                        onChange={(_event, newValue) => {
                          updateItem(index, {
                            idProduto: newValue?.id ?? null,
                            nomeProduto: newValue?.nome ?? '',
                            valorUnitario: newValue ? newValue.valor / 100 : 0,
                          });
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Produto"
                            error={Boolean(
                              itemErrors[index]?.idProduto ||
                                getFieldMessage(
                                  problem,
                                  `itens[${index}].idProduto`,
                                ),
                            )}
                            helperText={
                              itemErrors[index]?.idProduto ??
                              getFieldMessage(problem, `itens[${index}].idProduto`)
                            }
                          />
                        )}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 2 }}>
                      <CurrencyField
                        fullWidth
                        label="Valor unitário"
                        value={getCatalogProductValue(item, produtos) / 100}
                        onValueChange={() => undefined}
                        name={`valorCatalogo-${index}`}
                        disabled
                      />
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        fullWidth
                        label="Nome do item"
                        value={item.nomeProduto}
                        onChange={(event) => {
                          updateItem(index, {
                            nomeProduto: event.target.value,
                          });
                        }}
                        error={Boolean(
                          itemErrors[index]?.nomeProduto ||
                            getFieldMessage(problem, `itens[${index}].nomeProduto`),
                        )}
                        helperText={
                          itemErrors[index]?.nomeProduto ??
                          getFieldMessage(problem, `itens[${index}].nomeProduto`)
                        }
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 2 }}>
                      <CurrencyField
                        fullWidth
                        label="Valor unitário"
                        value={item.valorUnitario}
                        onValueChange={(valorUnitario) => {
                          updateItem(index, { valorUnitario });
                        }}
                        name={`valorUnitario-${index}`}
                        error={Boolean(
                          itemErrors[index]?.valorUnitario ||
                            getFieldMessage(problem, `itens[${index}].valorUnitario`),
                        )}
                        helperText={
                          itemErrors[index]?.valorUnitario ??
                          getFieldMessage(problem, `itens[${index}].valorUnitario`)
                        }
                      />
                    </Grid>
                  </>
                )}

                <Grid size={{ xs: 4, sm: 1 }}>
                  <TextField
                    fullWidth
                    label="Qtd"
                    type="number"
                    value={item.quantidade}
                    onChange={(event) => {
                      updateItem(index, {
                        quantidade: Number(event.target.value),
                      });
                    }}
                    error={Boolean(
                      itemErrors[index]?.quantidade ||
                        getFieldMessage(problem, `itens[${index}].quantidade`),
                    )}
                    helperText={
                      itemErrors[index]?.quantidade ??
                      getFieldMessage(problem, `itens[${index}].quantidade`)
                    }
                  />
                </Grid>

                <Grid size={{ xs: 4, sm: 2 }}>
                  <CurrencyField
                    fullWidth
                    label="Desconto"
                    value={item.desconto}
                    onValueChange={(desconto) => {
                      updateItem(index, { desconto });
                    }}
                    name={`descontoItem-${index}`}
                    error={Boolean(
                      itemErrors[index]?.desconto ||
                        getFieldMessage(problem, `itens[${index}].desconto`),
                    )}
                    helperText={
                      itemErrors[index]?.desconto ??
                      getFieldMessage(problem, `itens[${index}].desconto`)
                    }
                  />
                </Grid>

                <Grid
                  size={{ xs: 2, sm: 1 }}
                  sx={{
                    display: 'flex',
                    justifyContent: { xs: 'flex-start', sm: 'center' },
                    alignItems: 'center',
                    minHeight: 56,
                  }}
                >
                  <IconButton
                    onClick={() => handleRemoveItem(index)}
                    color="error"
                    disabled={form.itens.length === 1 || isSubmitting}
                    aria-label={`Remover item ${itemLabel}`}
                  >
                    <Delete />
                  </IconButton>
                </Grid>
              </Grid>
            </Box>
          );
        })}

        <Button startIcon={<Add />} onClick={handleAddItem} variant="text" sx={{ mt: 1 }}>
          Adicionar outro item
        </Button>
      </DialogContent>

      <DialogActions sx={{ display: 'block', p: 0 }}>
        <Box sx={{ px: 3, pt: 2, pb: 1 }}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 12, sm: 6 }} sx={{ ml: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal ({form.itens.length} {form.itens.length === 1 ? 'item' : 'itens'})
                </Typography>
                <Typography variant="body2">{formatCurrency(totals.subtotal)}</Typography>
              </Box>

              {totals.itemDiscounts > 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Descontos nos itens
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    - {formatCurrency(totals.itemDiscounts)}
                  </Typography>
                </Box>
              ) : null}

              {totals.saleDiscount > 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Desconto na venda
                  </Typography>
                  <Typography variant="body2" color="error.main">
                    - {formatCurrency(totals.saleDiscount)}
                  </Typography>
                </Box>
              ) : null}

              <Divider sx={{ my: 1 }} />

              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="subtitle1" fontWeight={700}>
                  Total
                </Typography>
                <Typography variant="h6" fontWeight={700} color="success.main">
                  {formatCurrency(totals.total)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 1,
            px: 3,
            py: 2,
          }}
        >
          <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            size="large"
            startIcon={<ShoppingCartCheckout />}
            disabled={isSubmitting || isFetching}
          >
            {isSubmitting
              ? 'Salvando...'
              : isOnline
                ? 'Finalizar e Salvar'
                : 'Salvar offline'}
          </Button>
        </Box>
      </DialogActions>

      {isFetching ? (
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <CircularProgress size={20} />
        </Box>
      ) : null}
    </Dialog>
  );
}
