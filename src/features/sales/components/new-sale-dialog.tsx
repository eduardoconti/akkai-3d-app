import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add, Close, Delete, ShoppingCartCheckout } from '@mui/icons-material';
import { listAllProducts } from '@/features/products/api/products-api';
import { useSaleStore } from '@/features/sales/store/use-sale-store';
import {
  emptySaleItem,
  initialSaleFormState,
  type DiscountMode,
  type SaleFormErrors,
  type SaleFormItem,
  type SaleFormState,
  type SaleItemErrors,
  type SaleItemType,
} from '@/features/sales/types/sale-form';
import {
  getCachedProductCatalog,
  saveCachedProductCatalog,
} from '@/shared/lib/offline/indexed-db';
import {
  CurrencyField,
  FormFeedbackAlert,
  formatCurrency,
  getFieldMessage,
  useFeedbackStore,
  useOnlineStatus,
  type MeioPagamento,
  type ProblemDetails,
  type Produto,
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

function calculateSaleDiscount(
  subtotal: number,
  discountValue: number,
  discountMode: DiscountMode,
) {
  if (discountMode === 'PERCENTUAL') {
    const normalizedDiscount = Math.min(Math.max(discountValue, 0), 99);
    return Math.round((subtotal * normalizedDiscount) / 100);
  }

  return Math.round(Math.min(Math.max(discountValue, 0), 999.99) * 100);
}

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

type PersistedSaleConfig = Pick<SaleFormState, 'tipo' | 'idFeira'>;

function getResetFormState(config: PersistedSaleConfig): SaleFormState {
  return {
    ...initialSaleFormState,
    tipo: config.tipo,
    idFeira: config.tipo === 'FEIRA' ? config.idFeira : '',
  };
}

export default function NewSaleDialog({ open, onClose }: NewSaleDialogProps) {
  const isOnline = useOnlineStatus();
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
  const [persistedConfig, setPersistedConfig] = useState<PersistedSaleConfig>({
    tipo: initialSaleFormState.tipo,
    idFeira: initialSaleFormState.idFeira,
  });
  const [catalogProducts, setCatalogProducts] = useState<Produto[]>([]);
  const [catalogErrorMessage, setCatalogErrorMessage] = useState<string | null>(null);
  const [isLoadingCatalogProducts, setIsLoadingCatalogProducts] = useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<SaleFormErrors>({});
  const [itemErrors, setItemErrors] = useState<SaleItemErrors>([]);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    async function loadCatalogProducts() {
      setIsLoadingCatalogProducts(true);
      setCatalogErrorMessage(null);

      try {
        const nextProducts = await listAllProducts();
        setCatalogProducts(nextProducts);
        await saveCachedProductCatalog(nextProducts);
      } catch {
        const cachedProducts = await getCachedProductCatalog();

        if (cachedProducts) {
          setCatalogProducts(cachedProducts);
          setCatalogErrorMessage(null);
        } else {
          setCatalogErrorMessage('Nao foi possivel carregar o catalogo de produtos.');
        }
      } finally {
        setIsLoadingCatalogProducts(false);
      }
    }

    if (open) {
      setForm(getResetFormState(persistedConfig));
      void loadCatalogProducts();
      void fetchFeiras();
      void fetchCarteiras();
      return;
    }

    setForm(getResetFormState(persistedConfig));
    setCatalogProducts([]);
    setCatalogErrorMessage(null);
    setProblem(null);
    setLocalErrors({});
    setItemErrors([]);
    clearSubmitError();
  }, [open, fetchCarteiras, fetchFeiras, clearSubmitError]);

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
    window.__AKKAI_PRODUCTS__ = catalogProducts;
  }, [catalogProducts]);

  const totals = useMemo(() => {
    let subtotal = 0;
    form.itens.forEach((item) => {
      const unitValue = item.brinde
        ? 0
        : item.tipoItem === 'CATALOGO'
          ? getCatalogProductValue(item, catalogProducts)
          : Math.round(item.valorUnitario * 100);

      subtotal += unitValue * item.quantidade;
    });

    const saleDiscount = calculateSaleDiscount(
      subtotal,
      form.desconto ?? 0,
      form.descontoModo,
    );

    return {
      subtotal,
      saleDiscount,
      total: Math.max(0, subtotal - saleDiscount),
    };
  }, [form, catalogProducts]);

  const handleClose = () => {
    setForm(getResetFormState(persistedConfig));
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
      brinde: false,
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

      if (item.tipoItem === 'AVULSO' && !item.brinde && item.valorUnitario <= 0) {
        errors.valorUnitario = 'Informe um valor unitário maior que zero.';
      }

      if (item.quantidade < 1) {
        errors.quantidade = 'Informe uma quantidade de pelo menos 1 unidade.';
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

    if (form.desconto < 0) {
      nextLocalErrors.desconto = 'Informe um desconto válido.';
    }

    if (form.descontoModo === 'PERCENTUAL' && form.desconto > 99) {
      nextLocalErrors.desconto = 'O desconto em % deve ser de no máximo 99.';
    }

    if (form.descontoModo === 'VALOR' && form.desconto > 999.99) {
      nextLocalErrors.desconto = 'O desconto em R$ deve ser de no máximo 999,99.';
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
      desconto: totals.saleDiscount,
      itens: form.itens.map((item) => {
        if (item.tipoItem === 'CATALOGO') {
          return {
            idProduto: item.idProduto ?? undefined,
            quantidade: item.quantidade,
            brinde: item.brinde,
          };
        }

        return {
          nomeProduto: item.nomeProduto.trim(),
          valorUnitario: Math.round(item.valorUnitario * 100),
          quantidade: item.quantidade,
          brinde: item.brinde,
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

  const isFetching = isLoadingCatalogProducts || isFetchingSales;
  const globalMessage =
    problem?.detail ??
    submitErrorMessage ??
    saleFetchErrorMessage ??
    catalogErrorMessage;

  const discountHelperText =
    localErrors.desconto ??
    getFieldMessage(problem, 'desconto') ??
    (form.desconto > 0 && totals.subtotal > 0
      ? form.descontoModo === 'PERCENTUAL'
        ? `${form.desconto}% = ${formatCurrency(totals.saleDiscount)}`
        : `${((totals.saleDiscount / totals.subtotal) * 100).toFixed(1)}% = ${formatCurrency(totals.saleDiscount)}`
      : undefined);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ px: 3, py: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Nova venda rápida
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Preencha os dados para registrar a venda.
            </Typography>
          </Box>

          <IconButton onClick={handleClose} aria-label="Fechar modal de venda">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 3, py: 3 }}>
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

        <Box sx={{ mb: 3 }}>
          <SectionLabel>Configuração</SectionLabel>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Tipo de venda"
                value={form.tipo}
                onChange={(event) => {
                  const type = event.target.value as TipoVenda;
                  setPersistedConfig((current) => ({
                    tipo: type,
                    idFeira: current.idFeira,
                  }));
                  setForm((current) => ({
                    ...current,
                    tipo: type,
                    idFeira: current.idFeira,
                  }));
                }}
              >
                <MenuItem value="FEIRA">Feira</MenuItem>
                <MenuItem value="LOJA">Loja</MenuItem>
                <MenuItem value="ONLINE">Online</MenuItem>
              </TextField>
            </Grid>

            {form.tipo === 'FEIRA' ? (
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Feira"
                  value={form.idFeira}
                  onChange={(event) => {
                    const nextFairId =
                      event.target.value === '' ? '' : Number(event.target.value);
                    setPersistedConfig((current) => ({
                      ...current,
                      idFeira: nextFairId,
                    }));
                    setForm((current) => ({
                      ...current,
                      idFeira: nextFairId,
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

            <Grid size={{ xs: 12, md: form.tipo === 'FEIRA' ? 3 : 4.5 }}>
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

            <Grid size={{ xs: 12, md: form.tipo === 'FEIRA' ? 3 : 4.5 }}>
              <TextField
                select
                fullWidth
                label="Pagamento"
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
          </Grid>
        </Box>

        <Box sx={{ mb: 3 }}>
          <SectionLabel>Itens da venda</SectionLabel>

          {localErrors.itens ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {localErrors.itens}
            </Alert>
          ) : null}

          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <Stack spacing={1.5}>
              {form.itens.map((item, index) => {
                const itemLabel =
                  item.tipoItem === 'CATALOGO' ? 'catalogo' : 'avulso';

                return (
                  <Box
                    key={`${index}-${item.tipoItem}-${item.idProduto ?? 'novo'}`}
                    sx={{
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      borderRadius: 3,
                      p: 1.5,
                    }}
                  >
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Tipo"
                          value={item.tipoItem}
                          onChange={(event) =>
                            handleChangeItemType(
                              index,
                              event.target.value as SaleItemType,
                            )
                          }
                        >
                          <MenuItem value="CATALOGO">Catálogo</MenuItem>
                          <MenuItem value="AVULSO">Avulso</MenuItem>
                        </TextField>
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        {item.tipoItem === 'CATALOGO' ? (
                          <Autocomplete
                            options={catalogProducts}
                            getOptionLabel={(option) =>
                              `${option.nome} (${option.codigo})`
                            }
                            value={
                              catalogProducts.find(
                                (produto) => produto.id === item.idProduto,
                              ) ?? null
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
                                size="small"
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
                                  getFieldMessage(
                                    problem,
                                    `itens[${index}].idProduto`,
                                  )
                                }
                              />
                            )}
                          />
                        ) : (
                          <TextField
                            fullWidth
                            size="small"
                            label="Nome do item"
                            value={item.nomeProduto}
                            onChange={(event) => {
                              updateItem(index, {
                                nomeProduto: event.target.value,
                              });
                            }}
                            error={Boolean(
                              itemErrors[index]?.nomeProduto ||
                                getFieldMessage(
                                  problem,
                                  `itens[${index}].nomeProduto`,
                                ),
                            )}
                            helperText={
                              itemErrors[index]?.nomeProduto ??
                              getFieldMessage(
                                problem,
                                `itens[${index}].nomeProduto`,
                              )
                            }
                          />
                        )}
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        {item.tipoItem === 'CATALOGO' ? (
                          <CurrencyField
                            fullWidth
                            label="Valor unit."
                            value={
                              item.brinde
                                ? 0
                                : getCatalogProductValue(item, catalogProducts) / 100
                            }
                            onValueChange={() => undefined}
                            name={`valorCatalogo-${index}`}
                            disabled
                          />
                        ) : (
                          <CurrencyField
                            fullWidth
                            label="Valor unit."
                            value={item.brinde ? 0 : item.valorUnitario}
                            onValueChange={(valorUnitario) => {
                              updateItem(index, { valorUnitario });
                            }}
                            name={`valorUnitario-${index}`}
                            disabled={item.brinde}
                            error={Boolean(
                              itemErrors[index]?.valorUnitario ||
                                getFieldMessage(
                                  problem,
                                  `itens[${index}].valorUnitario`,
                                ),
                            )}
                            helperText={
                              itemErrors[index]?.valorUnitario ??
                              getFieldMessage(
                                problem,
                                `itens[${index}].valorUnitario`,
                              )
                            }
                          />
                        )}
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
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
                              getFieldMessage(
                                problem,
                                `itens[${index}].quantidade`,
                              ),
                          )}
                          helperText={
                            itemErrors[index]?.quantidade ??
                            getFieldMessage(problem, `itens[${index}].quantidade`)
                          }
                        />
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Checkbox
                              checked={item.brinde}
                              onChange={(event) => {
                                const checked = event.target.checked;
                                updateItem(index, {
                                  brinde: checked,
                                  valorUnitario:
                                    checked && item.tipoItem === 'AVULSO'
                                      ? 0
                                      : item.valorUnitario,
                                });
                              }}
                              inputProps={{
                                'aria-label': `Brinde do item ${itemLabel}`,
                              }}
                            />
                            <Typography variant="body2">Brinde</Typography>
                          </Box>

                          <IconButton
                            onClick={() => handleRemoveItem(index)}
                            color="error"
                            disabled={form.itens.length === 1 || isSubmitting}
                            aria-label={`Remover item ${itemLabel}`}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                );
              })}

              <Button startIcon={<Add />} onClick={handleAddItem} variant="text">
                Adicionar item
              </Button>
            </Stack>
          </Box>

          <TableContainer
            sx={{
              display: { xs: 'none', md: 'block' },
              border: (theme) => `1px solid ${theme.palette.divider}`,
              borderRadius: 3,
              overflowX: 'auto',
            }}
          >
            <Table sx={{ minWidth: 920 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Produto / Item</TableCell>
                  <TableCell>Valor unit.</TableCell>
                  <TableCell>Qtd</TableCell>
                  <TableCell>Brinde</TableCell>
                  <TableCell width={56} />
                </TableRow>
              </TableHead>
              <TableBody>
                {form.itens.map((item, index) => {
                  const itemLabel =
                    item.tipoItem === 'CATALOGO' ? 'catalogo' : 'avulso';

                  return (
                    <TableRow key={`${index}-${item.tipoItem}-${item.idProduto ?? 'novo'}`}>
                      <TableCell sx={{ verticalAlign: 'top', minWidth: 150 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Tipo"
                          value={item.tipoItem}
                          onChange={(event) =>
                            handleChangeItemType(
                              index,
                              event.target.value as SaleItemType,
                            )
                          }
                        >
                          <MenuItem value="CATALOGO">Catálogo</MenuItem>
                          <MenuItem value="AVULSO">Avulso</MenuItem>
                        </TextField>
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', minWidth: 300 }}>
                        {item.tipoItem === 'CATALOGO' ? (
                          <Autocomplete
                            options={catalogProducts}
                            getOptionLabel={(option) =>
                              `${option.nome} (${option.codigo})`
                            }
                            value={
                              catalogProducts.find(
                                (produto) => produto.id === item.idProduto,
                              ) ?? null
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
                                size="small"
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
                                  getFieldMessage(
                                    problem,
                                    `itens[${index}].idProduto`,
                                  )
                                }
                              />
                            )}
                          />
                        ) : (
                          <TextField
                            fullWidth
                            size="small"
                            label="Nome do item"
                            value={item.nomeProduto}
                            onChange={(event) => {
                              updateItem(index, {
                                nomeProduto: event.target.value,
                              });
                            }}
                            error={Boolean(
                              itemErrors[index]?.nomeProduto ||
                                getFieldMessage(
                                  problem,
                                  `itens[${index}].nomeProduto`,
                                ),
                            )}
                            helperText={
                              itemErrors[index]?.nomeProduto ??
                              getFieldMessage(
                                problem,
                                `itens[${index}].nomeProduto`,
                              )
                            }
                          />
                        )}
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', minWidth: 170 }}>
                        {item.tipoItem === 'CATALOGO' ? (
                          <CurrencyField
                            fullWidth
                            label="Valor unit."
                            value={
                              item.brinde
                                ? 0
                                : getCatalogProductValue(item, catalogProducts) / 100
                            }
                            onValueChange={() => undefined}
                            name={`valorCatalogo-${index}`}
                            disabled
                          />
                        ) : (
                          <CurrencyField
                            fullWidth
                            label="Valor unit."
                            value={item.brinde ? 0 : item.valorUnitario}
                            onValueChange={(valorUnitario) => {
                              updateItem(index, { valorUnitario });
                            }}
                            name={`valorUnitario-${index}`}
                            disabled={item.brinde}
                            error={Boolean(
                              itemErrors[index]?.valorUnitario ||
                                getFieldMessage(
                                  problem,
                                  `itens[${index}].valorUnitario`,
                                ),
                            )}
                            helperText={
                              itemErrors[index]?.valorUnitario ??
                              getFieldMessage(
                                problem,
                                `itens[${index}].valorUnitario`,
                              )
                            }
                          />
                        )}
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', minWidth: 100 }}>
                        <TextField
                          fullWidth
                          size="small"
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
                              getFieldMessage(
                                problem,
                                `itens[${index}].quantidade`,
                              ),
                          )}
                          helperText={
                            itemErrors[index]?.quantidade ??
                            getFieldMessage(problem, `itens[${index}].quantidade`)
                          }
                        />
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', minWidth: 100 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1.25 }}>
                          <Checkbox
                            checked={item.brinde}
                            onChange={(event) => {
                              const checked = event.target.checked;
                              updateItem(index, {
                                brinde: checked,
                                valorUnitario:
                                  checked && item.tipoItem === 'AVULSO'
                                    ? 0
                                    : item.valorUnitario,
                              });
                            }}
                            inputProps={{
                              'aria-label': `Brinde do item ${itemLabel}`,
                            }}
                          />
                        </Box>
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 0.75 }}>
                          <IconButton
                            onClick={() => handleRemoveItem(index)}
                            color="error"
                            disabled={form.itens.length === 1 || isSubmitting}
                            aria-label={`Remover item ${itemLabel}`}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}

                <TableRow>
                  <TableCell colSpan={6}>
                    <Button startIcon={<Add />} onClick={handleAddItem} variant="text">
                      Adicionar item
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        <Box>
          <SectionLabel>Desconto</SectionLabel>
          <Stack spacing={0.75} sx={{ maxWidth: { xs: '100%', md: 440 } }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, pl: 0.5 }}
            >
              Desconto
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
              }}
            >
              <ToggleButtonGroup
                exclusive
                value={form.descontoModo}
                size="small"
                onChange={(_event, newValue: DiscountMode | null) => {
                  if (!newValue) {
                    return;
                  }
                  setForm((current) => ({
                    ...current,
                    descontoModo: newValue,
                    desconto: current.descontoModo === newValue ? current.desconto : 0,
                  }));
                }}
                sx={{
                  flexShrink: 0,
                  '& .MuiToggleButton-root': {
                    minWidth: { xs: 28, sm: 36 },
                    px: { xs: 1, sm: 1.25 },
                    height: 40,
                  },
                }}
              >
                <ToggleButton value="VALOR">R$</ToggleButton>
                <ToggleButton value="PERCENTUAL">%</ToggleButton>
              </ToggleButtonGroup>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                {form.descontoModo === 'VALOR' ? (
                  <CurrencyField
                    fullWidth
                    size="small"
                    placeholder="0,00"
                    value={form.desconto}
                    onValueChange={(desconto) => {
                      setForm((current) => ({
                        ...current,
                        desconto: Math.min(desconto, 999.99),
                      }));
                    }}
                    name="desconto"
                    error={Boolean(
                      localErrors.desconto || getFieldMessage(problem, 'desconto'),
                    )}
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
                    value={form.desconto}
                    onChange={(event) => {
                      const desconto = Number(event.target.value);
                      setForm((current) => ({
                        ...current,
                        desconto: Number.isNaN(desconto)
                          ? 0
                          : Math.min(desconto, 99),
                      }));
                    }}
                    inputProps={{
                      min: 0,
                      max: 99,
                      step: 1,
                      'aria-label': 'Desconto em percentual',
                    }}
                    error={Boolean(
                      localErrors.desconto || getFieldMessage(problem, 'desconto'),
                    )}
                  />
                )}
              </Box>
            </Box>

            {discountHelperText ? (
              <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                {discountHelperText}
              </Typography>
            ) : null}

            <Typography variant="body2" color="text.secondary" sx={{ pl: 0.5 }}>
              {totals.saleDiscount > 0
                ? `Desconto aplicado: ${formatCurrency(totals.saleDiscount)}`
                : 'Sem desconto aplicado'}
            </Typography>
          </Stack>
        </Box>
      </DialogContent>

      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="body2" color="text.secondary">
            Subtotal ({form.itens.length} {form.itens.length === 1 ? 'item' : 'itens'})
          </Typography>
          <Typography variant="h5" fontWeight={800} color="success.main">
            {formatCurrency(totals.total)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totals.saleDiscount > 0
              ? `${formatCurrency(totals.saleDiscount)} de desconto`
              : 'Sem desconto'}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: { xs: 'stretch', md: 'flex-end' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
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
                ? 'Finalizar e salvar'
                : 'Salvar offline'}
          </Button>
        </Box>
      </Box>

      {isFetching ? (
        <Box sx={{ position: 'absolute', top: 18, right: 64 }}>
          <CircularProgress size={20} />
        </Box>
      ) : null}
    </Dialog>
  );
}
