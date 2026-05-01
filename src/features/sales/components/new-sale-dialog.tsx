import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { listFairProductPrices } from '@/features/sales/api/sales-api';
import {
  saleStoreSelectors,
  useSaleStore,
} from '@/features/sales/store/use-sale-store';
import {
  emptySaleItem,
  initialSaleFormState,
  type DiscountMode,
  type SaleFormErrors,
  type SaleFormItem,
  type SaleFormPayment,
  type SaleFormState,
  type SaleItemErrors,
  type SalePaymentErrors,
  type SaleItemType,
} from '@/features/sales/types/sale-form';
import {
  getCachedFairProductPrices,
  getCachedProductCatalog,
  saveCachedFairProductPrices,
  saveCachedProductCatalog,
} from '@/shared/lib/offline/indexed-db';
import {
  CurrencyField,
  FormFeedbackAlert,
  formatCurrency,
  getFieldMessage,
  ProductAutocompleteField,
  useFeedbackStore,
  useOnlineStatus,
  type MeioPagamento,
  type PrecoProdutoFeira,
  type ProblemDetails,
  type Produto,
  type TipoVenda,
  type Venda,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface NewSaleDialogProps {
  open: boolean;
  onClose: () => void;
  sale?: Venda | null;
}

function getCatalogProductValue(
  item: SaleFormItem,
  produtos: Array<{ id: number; valor: number }>,
  fairProductPrices: PrecoProdutoFeira[],
) {
  const fairProductPrice = fairProductPrices.find(
    (current) => current.idProduto === item.idProduto,
  );
  if (fairProductPrice) {
    return fairProductPrice.valor;
  }

  const product = produtos.find((current) => current.id === item.idProduto);
  return product?.valor ?? Math.round(item.valorUnitario * 100);
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

function mapSaleToForm(sale: Venda): SaleFormState {
  const legacySale = sale as Venda & {
    meioPagamento?: MeioPagamento;
    idCarteira?: number;
    carteira?: { id: number } | null;
  };
  const pagamentos: SaleFormPayment[] =
    sale.pagamentos?.length > 0
      ? sale.pagamentos.map((pagamento) => ({
          idCarteira: pagamento.idCarteira,
          meioPagamento: pagamento.meioPagamento,
          valor: pagamento.valor / 100,
        }))
      : [
          {
            idCarteira: legacySale.idCarteira ?? legacySale.carteira?.id ?? '',
            meioPagamento: legacySale.meioPagamento ?? 'CRE',
            valor: sale.valorTotal / 100,
          },
        ];

  return {
    tipo: sale.tipo,
    idFeira: sale.idFeira ?? '',
    desconto: sale.desconto / 100,
    descontoModo: 'VALOR',
    pagamentos,
    itens: sale.itens.map((item) => ({
      tipoItem: item.idProduto ? 'CATALOGO' : 'AVULSO',
      idProduto: item.idProduto ?? null,
      nomeProduto: item.nomeProduto,
      valorUnitario: item.valorUnitario / 100,
      quantidade: item.quantidade,
      brinde: item.brinde,
    })),
  };
}

export default function NewSaleDialog({
  open,
  onClose,
  sale = null,
}: NewSaleDialogProps) {
  const isOnline = useOnlineStatus();
  const {
    alterarVenda,
    criarVenda,
    carteiras,
    saleFetchErrorMessage,
    fetchCarteiras,
    feiras,
    fetchFeiras,
    fetchVendas,
    isFetchingSales,
    isSubmitting,
    submitErrorMessage,
    clearSubmitError,
  } = useSaleStore(
    useShallow((state) => ({
      alterarVenda: saleStoreSelectors.alterarVenda(state),
      criarVenda: saleStoreSelectors.criarVenda(state),
      carteiras: saleStoreSelectors.carteiras(state),
      saleFetchErrorMessage: saleStoreSelectors.fetchErrorMessage(state),
      fetchCarteiras: saleStoreSelectors.fetchCarteiras(state),
      feiras: saleStoreSelectors.feiras(state),
      fetchFeiras: saleStoreSelectors.fetchFeiras(state),
      fetchVendas: saleStoreSelectors.fetchVendas(state),
      isFetchingSales: saleStoreSelectors.isFetching(state),
      isSubmitting: saleStoreSelectors.isSubmitting(state),
      submitErrorMessage: saleStoreSelectors.submitErrorMessage(state),
      clearSubmitError: saleStoreSelectors.clearSubmitError(state),
    })),
  );

  const [form, setForm] = useState<SaleFormState>(initialSaleFormState);
  const [persistedConfig, setPersistedConfig] = useState<PersistedSaleConfig>({
    tipo: initialSaleFormState.tipo,
    idFeira: initialSaleFormState.idFeira,
  });
  const [catalogProducts, setCatalogProducts] = useState<Produto[]>([]);
  const [catalogErrorMessage, setCatalogErrorMessage] = useState<string | null>(
    null,
  );
  const [fairProductPrices, setFairProductPrices] = useState<
    PrecoProdutoFeira[]
  >([]);
  const [fairProductPricesErrorMessage, setFairProductPricesErrorMessage] =
    useState<string | null>(null);
  const [isLoadingCatalogProducts, setIsLoadingCatalogProducts] =
    useState(false);
  const [isLoadingFairProductPrices, setIsLoadingFairProductPrices] =
    useState(false);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<SaleFormErrors>({});
  const [itemErrors, setItemErrors] = useState<SaleItemErrors>([]);
  const [paymentErrors, setPaymentErrors] = useState<SalePaymentErrors>([]);
  const [isSaving, setIsSaving] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const isEditMode = sale !== null;
  const persistedConfigRef = useRef(persistedConfig);

  useEffect(() => {
    persistedConfigRef.current = persistedConfig;
  }, [persistedConfig]);

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
          setCatalogErrorMessage(
            'Nao foi possivel carregar o catalogo de produtos.',
          );
        }
      } finally {
        setIsLoadingCatalogProducts(false);
      }
    }

    if (open) {
      const nextForm =
        isEditMode && sale
          ? mapSaleToForm(sale)
          : getResetFormState(persistedConfigRef.current);

      setForm(nextForm);
      void loadCatalogProducts();
      void fetchFeiras();
      void fetchCarteiras();
      return;
    }

    const nextForm =
      isEditMode && sale
        ? mapSaleToForm(sale)
        : getResetFormState(persistedConfigRef.current);

    setForm(nextForm);
    setCatalogProducts([]);
    setCatalogErrorMessage(null);
    setFairProductPrices([]);
    setFairProductPricesErrorMessage(null);
    setProblem(null);
    setLocalErrors({});
    setItemErrors([]);
    setPaymentErrors([]);
    clearSubmitError();
  }, [open, sale, isEditMode, fetchCarteiras, fetchFeiras, clearSubmitError]);

  useEffect(() => {
    const carteiraPadrao = carteiras.find((carteira) => carteira.ativa);
    const primeiroPagamento = form.pagamentos[0];

    if (
      open &&
      !isEditMode &&
      primeiroPagamento?.idCarteira === '' &&
      carteiraPadrao
    ) {
      setForm((current) => ({
        ...current,
        pagamentos: current.pagamentos.map((pagamento, index) =>
          index === 0
            ? {
                ...pagamento,
                idCarteira: carteiraPadrao.id,
                meioPagamento:
                  carteiraPadrao.meiosPagamento[0] ?? pagamento.meioPagamento,
              }
            : pagamento,
        ),
      }));
    }
  }, [open, isEditMode, carteiras, form.pagamentos]);

  useEffect(() => {
    window.__AKKAI_PRODUCTS__ = catalogProducts;
  }, [catalogProducts]);

  useEffect(() => {
    if (!open || form.tipo !== 'FEIRA' || form.idFeira === '') {
      setFairProductPrices([]);
      setFairProductPricesErrorMessage(null);
      setIsLoadingFairProductPrices(false);
      return;
    }

    let active = true;

    const loadFairProductPrices = async () => {
      const fairId = form.idFeira as number;
      setIsLoadingFairProductPrices(true);
      setFairProductPricesErrorMessage(null);

      try {
        const nextPrices = await listFairProductPrices(fairId);

        if (active) {
          setFairProductPrices(nextPrices);
        }
        void saveCachedFairProductPrices(fairId, nextPrices).catch(
          () => undefined,
        );
      } catch {
        const cachedPrices = await getCachedFairProductPrices(fairId);

        if (cachedPrices) {
          if (active) {
            setFairProductPrices(cachedPrices);
            setFairProductPricesErrorMessage(null);
          }
          return;
        }

        if (active) {
          setFairProductPrices([]);
          setFairProductPricesErrorMessage(
            'Não foi possível carregar os preços da feira.',
          );
        }
      } finally {
        if (active) {
          setIsLoadingFairProductPrices(false);
        }
      }
    };

    void loadFairProductPrices();

    return () => {
      active = false;
    };
  }, [form.idFeira, form.tipo, open]);

  const getAvailableMeiosPagamento = (idCarteira: number | '') => {
    const carteira = carteiras.find((c) => c.id === idCarteira);
    if (!carteira?.meiosPagamento?.length)
      return ['DIN', 'DEB', 'CRE', 'PIX'] as MeioPagamento[];
    return carteira.meiosPagamento;
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalQuantidadeItens = 0;
    form.itens.forEach((item) => {
      const unitValue = item.brinde
        ? 0
        : item.tipoItem === 'CATALOGO'
          ? getCatalogProductValue(item, catalogProducts, fairProductPrices)
          : Math.round(item.valorUnitario * 100);

      subtotal += unitValue * item.quantidade;
      totalQuantidadeItens += item.quantidade;
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
      totalQuantidadeItens,
    };
  }, [form, catalogProducts, fairProductPrices]);

  const handleClose = () => {
    setForm(
      isEditMode && sale
        ? mapSaleToForm(sale)
        : getResetFormState(persistedConfig),
    );
    setProblem(null);
    setLocalErrors({});
    setItemErrors([]);
    setPaymentErrors([]);
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

  const updatePayment = (index: number, partial: Partial<SaleFormPayment>) => {
    setForm((current) => {
      const pagamentos = [...current.pagamentos];
      pagamentos[index] = {
        ...pagamentos[index],
        ...partial,
      };
      return { ...current, pagamentos };
    });
  };

  const handleAddPayment = () => {
    setForm((current) => {
      if (current.pagamentos.length >= 2) {
        return current;
      }

      return {
        ...current,
        pagamentos: [
          {
            ...current.pagamentos[0],
            valor: totals.total / 100,
          },
          {
            idCarteira: '',
            meioPagamento: 'CRE',
            valor: 0,
          },
        ],
      };
    });
    setPaymentErrors((current) => [...current, {}]);
  };

  const handleRemovePayment = (index: number) => {
    setForm((current) => ({
      ...current,
      pagamentos: current.pagamentos.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    }));
    setPaymentErrors((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
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

      if (
        item.tipoItem === 'AVULSO' &&
        !item.brinde &&
        item.valorUnitario <= 0
      ) {
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

    if (form.desconto < 0) {
      nextLocalErrors.desconto = 'Informe um desconto válido.';
    }

    if (form.descontoModo === 'PERCENTUAL' && form.desconto > 99) {
      nextLocalErrors.desconto = 'O desconto em % deve ser de no máximo 99.';
    }

    if (form.descontoModo === 'VALOR' && form.desconto > 999.99) {
      nextLocalErrors.desconto =
        'O desconto em R$ deve ser de no máximo 999,99.';
    }

    if (form.itens.length === 0) {
      nextLocalErrors.itens = 'Adicione ao menos um item na venda.';
    }

    const nextPaymentErrors: SalePaymentErrors = form.pagamentos.map(
      (pagamento, index) => {
        const errors: SalePaymentErrors[number] = {};
        const availableMethods = getAvailableMeiosPagamento(
          pagamento.idCarteira,
        );

        if (pagamento.idCarteira === '') {
          errors.idCarteira = 'Selecione a carteira do pagamento.';
        }

        if (!availableMethods.includes(pagamento.meioPagamento)) {
          errors.meioPagamento =
            'Selecione um meio aceito pela carteira informada.';
        }

        if (form.pagamentos.length > 1 && pagamento.valor <= 0) {
          errors.valor = 'Informe um valor maior que zero.';
        }

        if (form.pagamentos.length === 1 && totals.total === 0 && index === 0) {
          errors.valor = undefined;
        }

        return errors;
      },
    );

    const totalPagamentos = form.pagamentos.reduce(
      (total, pagamento) =>
        total +
        (form.pagamentos.length === 1
          ? totals.total
          : Math.round(pagamento.valor * 100)),
      0,
    );

    if (form.pagamentos.length === 0) {
      nextLocalErrors.pagamentos = 'Adicione ao menos um pagamento.';
    }

    if (form.pagamentos.length > 2) {
      nextLocalErrors.pagamentos = 'Informe no máximo 2 pagamentos.';
    }

    if (totalPagamentos !== totals.total) {
      nextLocalErrors.pagamentos =
        'A soma dos pagamentos deve ser igual ao total da venda.';
    }

    return { nextLocalErrors, nextItemErrors, nextPaymentErrors };
  };

  const handleSubmit = async () => {
    const { nextLocalErrors, nextItemErrors, nextPaymentErrors } =
      validateForm();
    setLocalErrors(nextLocalErrors);
    setItemErrors(nextItemErrors);
    setPaymentErrors(nextPaymentErrors);
    setProblem(null);

    const hasItemErrors = nextItemErrors.some(
      (item) => Object.keys(item).length > 0,
    );
    const hasPaymentErrors = nextPaymentErrors.some((pagamento) =>
      Object.values(pagamento).some(Boolean),
    );

    if (
      Object.keys(nextLocalErrors).length > 0 ||
      hasItemErrors ||
      hasPaymentErrors
    ) {
      return;
    }

    const payload = {
      tipo: form.tipo,
      idFeira: form.idFeira === '' ? undefined : form.idFeira,
      desconto: totals.saleDiscount,
      pagamentos: form.pagamentos.map((pagamento) => ({
        idCarteira: pagamento.idCarteira === '' ? 0 : pagamento.idCarteira,
        meioPagamento: pagamento.meioPagamento,
        valor:
          form.pagamentos.length === 1
            ? totals.total
            : Math.round(pagamento.valor * 100),
      })),
      itens: form.itens.map((item) => {
        if (item.tipoItem === 'CATALOGO') {
          return {
            idProduto: item.idProduto ?? undefined,
            quantidade: item.quantidade,
            brinde: item.brinde,
            valorUnitario: getCatalogProductValue(
              item,
              catalogProducts,
              fairProductPrices,
            ),
          };
        }

        return {
          nomeProduto: item.nomeProduto.trim(),
          valorUnitario: Math.round(item.valorUnitario * 100),
          quantidade: item.quantidade,
          brinde: item.brinde,
        };
      }),
    };

    if (isEditMode && !isOnline) {
      return;
    }

    setIsSaving(true);

    try {
      const result =
        isEditMode && sale
          ? await alterarVenda(sale.id, payload)
          : await criarVenda(payload);

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      if (result.data.id < 0) {
        showSuccess(
          'Venda salva offline. Sincronize quando a internet voltar.',
        );
        handleClose();
        return;
      }

      await fetchVendas();
      showSuccess(
        isEditMode
          ? 'Venda alterada com sucesso.'
          : 'Venda cadastrada com sucesso.',
      );
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const isFetching =
    isLoadingCatalogProducts || isLoadingFairProductPrices || isFetchingSales;
  const isBusy = isSubmitting || isFetching || isSaving;
  const globalMessage =
    problem?.detail ??
    submitErrorMessage ??
    saleFetchErrorMessage ??
    catalogErrorMessage ??
    fairProductPricesErrorMessage;

  const discountHelperText =
    localErrors.desconto ??
    getFieldMessage(problem, 'desconto') ??
    (form.desconto > 0 && totals.subtotal > 0
      ? form.descontoModo === 'PERCENTUAL'
        ? `${form.desconto}% = ${formatCurrency(totals.saleDiscount)}`
        : `${((totals.saleDiscount / totals.subtotal) * 100).toFixed(1)}% = ${formatCurrency(totals.saleDiscount)}`
      : undefined);

  const handleDialogClose = () => {
    if (isBusy) {
      return;
    }

    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="lg">
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
              {isEditMode ? `Alterar venda #${sale?.id}` : 'Nova venda rápida'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isEditMode
                ? 'Atualize os dados da venda e dos itens.'
                : 'Preencha os dados para registrar a venda.'}
            </Typography>
          </Box>

          <IconButton
            onClick={handleDialogClose}
            aria-label="Fechar modal de venda"
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ px: 3, py: 3 }}>
        <FormFeedbackAlert message={globalMessage} />

        {!isOnline && !isEditMode ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            Você está offline. As vendas serão salvas localmente e poderão ser
            sincronizadas depois.
          </Alert>
        ) : null}

        {!isOnline && isEditMode ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            A edição de vendas está disponível apenas quando houver conexão com
            a internet.
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
                      event.target.value === ''
                        ? ''
                        : Number(event.target.value);
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
          </Grid>
        </Box>

        <Box sx={{ mb: 3 }}>
          <SectionLabel>Pagamentos</SectionLabel>

          {localErrors.pagamentos ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {localErrors.pagamentos}
            </Alert>
          ) : null}

          <Stack spacing={1.5}>
            {form.pagamentos.map((pagamento, index) => {
              const availableMeiosPagamento = getAvailableMeiosPagamento(
                pagamento.idCarteira,
              );
              const paymentValue =
                form.pagamentos.length === 1
                  ? totals.total / 100
                  : pagamento.valor;

              return (
                <Box
                  key={`pagamento-${index}`}
                  sx={{
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    p: 1.5,
                  }}
                >
                  <Grid container spacing={1.5} alignItems="flex-start">
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        select
                        fullWidth
                        label="Carteira"
                        value={pagamento.idCarteira}
                        onChange={(event) => {
                          const nextWalletId =
                            event.target.value === ''
                              ? ''
                              : Number(event.target.value);
                          const nextMethods =
                            getAvailableMeiosPagamento(nextWalletId);

                          updatePayment(index, {
                            idCarteira: nextWalletId,
                            meioPagamento: nextMethods.includes(
                              pagamento.meioPagamento,
                            )
                              ? pagamento.meioPagamento
                              : nextMethods[0]!,
                          });
                        }}
                        error={Boolean(
                          paymentErrors[index]?.idCarteira ||
                          getFieldMessage(
                            problem,
                            `pagamentos[${index}].idCarteira`,
                          ),
                        )}
                        helperText={
                          paymentErrors[index]?.idCarteira ??
                          getFieldMessage(
                            problem,
                            `pagamentos[${index}].idCarteira`,
                          )
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

                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        select
                        fullWidth
                        label="Meio"
                        value={pagamento.meioPagamento}
                        onChange={(event) => {
                          updatePayment(index, {
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
                          <MenuItem value="DEB">Cartão débito</MenuItem>
                        )}
                        {availableMeiosPagamento.includes('CRE') && (
                          <MenuItem value="CRE">Cartão crédito</MenuItem>
                        )}
                        {availableMeiosPagamento.includes('DIN') && (
                          <MenuItem value="DIN">Dinheiro</MenuItem>
                        )}
                        {availableMeiosPagamento.includes('PIX') && (
                          <MenuItem value="PIX">Pix</MenuItem>
                        )}
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 3 }}>
                      <CurrencyField
                        fullWidth
                        label="Valor"
                        value={paymentValue}
                        onValueChange={(valor) => {
                          updatePayment(index, { valor });
                        }}
                        disabled={form.pagamentos.length === 1}
                        error={Boolean(
                          paymentErrors[index]?.valor ||
                          getFieldMessage(
                            problem,
                            `pagamentos[${index}].valor`,
                          ),
                        )}
                        helperText={
                          paymentErrors[index]?.valor ??
                          getFieldMessage(
                            problem,
                            `pagamentos[${index}].valor`,
                          ) ??
                          (form.pagamentos.length === 1
                            ? 'Preenchido pelo total da venda.'
                            : undefined)
                        }
                      />
                    </Grid>

                    <Grid
                      size={{ xs: 12, md: 2 }}
                      sx={{ display: 'flex', justifyContent: 'flex-end' }}
                    >
                      <IconButton
                        onClick={() => handleRemovePayment(index)}
                        color="error"
                        disabled={form.pagamentos.length === 1 || isBusy}
                        aria-label={`Remover pagamento ${index + 1}`}
                      >
                        <Delete />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              );
            })}

            {form.pagamentos.length < 2 ? (
              <Button
                startIcon={<Add />}
                onClick={handleAddPayment}
                variant="text"
                disabled={isBusy}
                sx={{ alignSelf: 'flex-start' }}
              >
                Adicionar pagamento
              </Button>
            ) : null}
          </Stack>
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
                          <ProductAutocompleteField
                            products={catalogProducts}
                            productId={item.idProduto}
                            loading={isFetching}
                            size="small"
                            onChange={(newValue) => {
                              updateItem(index, {
                                idProduto: newValue?.id ?? null,
                                nomeProduto: newValue?.nome ?? '',
                                valorUnitario: newValue
                                  ? newValue.valor / 100
                                  : 0,
                              });
                            }}
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
                                : getCatalogProductValue(
                                    item,
                                    catalogProducts,
                                    fairProductPrices,
                                  ) / 100
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
                            getFieldMessage(
                              problem,
                              `itens[${index}].quantidade`,
                            )
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
                            disabled={form.itens.length === 1 || isBusy}
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

              <Button
                startIcon={<Add />}
                onClick={handleAddItem}
                variant="text"
                disabled={isBusy}
              >
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
                    <TableRow
                      key={`${index}-${item.tipoItem}-${item.idProduto ?? 'novo'}`}
                    >
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
                          <ProductAutocompleteField
                            products={catalogProducts}
                            productId={item.idProduto}
                            loading={isFetching}
                            size="small"
                            onChange={(newValue) => {
                              updateItem(index, {
                                idProduto: newValue?.id ?? null,
                                nomeProduto: newValue?.nome ?? '',
                                valorUnitario: newValue
                                  ? newValue.valor / 100
                                  : 0,
                              });
                            }}
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
                                : getCatalogProductValue(
                                    item,
                                    catalogProducts,
                                    fairProductPrices,
                                  ) / 100
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
                            getFieldMessage(
                              problem,
                              `itens[${index}].quantidade`,
                            )
                          }
                        />
                      </TableCell>

                      <TableCell sx={{ verticalAlign: 'top', minWidth: 100 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            pt: 1.25,
                          }}
                        >
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
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            pt: 0.75,
                          }}
                        >
                          <IconButton
                            onClick={() => handleRemoveItem(index)}
                            color="error"
                            disabled={form.itens.length === 1 || isBusy}
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
                    <Button
                      startIcon={<Add />}
                      onClick={handleAddItem}
                      variant="text"
                      disabled={isBusy}
                    >
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
                    desconto:
                      current.descontoModo === newValue ? current.desconto : 0,
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
                      localErrors.desconto ||
                      getFieldMessage(problem, 'desconto'),
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
                      localErrors.desconto ||
                      getFieldMessage(problem, 'desconto'),
                    )}
                  />
                )}
              </Box>
            </Box>

            {discountHelperText ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ pl: 0.5 }}
              >
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
            Total ({totals.totalQuantidadeItens}{' '}
            {totals.totalQuantidadeItens === 1 ? 'unidade' : 'unidades'})
          </Typography>
          {totals.saleDiscount > 0 ? (
            <>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ textDecoration: 'line-through' }}
              >
                {formatCurrency(totals.subtotal)}
              </Typography>
              <Typography variant="h4" fontWeight={800} color="success.main">
                {formatCurrency(totals.total)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatCurrency(totals.saleDiscount)} de desconto
              </Typography>
            </>
          ) : (
            <Typography variant="h4" fontWeight={800} color="success.main">
              {formatCurrency(totals.total)}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            justifyContent: { xs: 'stretch', md: 'flex-end' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1,
          }}
        >
          <Button onClick={handleDialogClose} color="inherit" disabled={isBusy}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            size="large"
            startIcon={<ShoppingCartCheckout />}
            disabled={isBusy || (isEditMode && !isOnline)}
          >
            {isBusy
              ? 'Salvando...'
              : isEditMode
                ? 'Salvar alterações'
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
