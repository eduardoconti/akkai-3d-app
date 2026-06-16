import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AccountBalanceWallet,
  Add,
  ArrowForward,
  CardGiftcard,
  Category,
  Close,
  CreditCard,
  Delete,
  Inventory2,
  LocalAtm,
  Minimize,
  Pix,
  Remove,
} from '@mui/icons-material';
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
  DatePickerField,
  FormFeedbackAlert,
  formatCurrency,
  formatLocalDate,
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
  draftKey?: string;
  initialForm?: SaleFormState;
  onDraftChange?: (form: SaleFormState) => void;
  onMinimize?: () => void;
  onSaved?: () => void | Promise<void>;
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

const saleTypeLabels: Record<TipoVenda, string> = {
  FEIRA: 'Feira',
  LOJA: 'Loja',
  ONLINE: 'Online',
  CONSIGNACAO: 'Consignação',
};

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

type PersistedSaleConfig = Pick<SaleFormState, 'tipo' | 'idFeira'>;

function getResetFormState(config: PersistedSaleConfig): SaleFormState {
  return {
    ...initialSaleFormState,
    dataVenda: formatLocalDate(),
    tipo: config.tipo,
    idFeira: config.tipo === 'FEIRA' ? config.idFeira : '',
  };
}

function cloneSaleFormState(form: SaleFormState): SaleFormState {
  return {
    ...form,
    itens: form.itens.map((item) => ({ ...item })),
    pagamentos: form.pagamentos.map((pagamento) => ({ ...pagamento })),
  };
}

function mapSaleToForm(sale: Venda): SaleFormState {
  const pagamentos: SaleFormPayment[] = sale.pagamentos.map((pagamento) => ({
    idCarteira: pagamento.idCarteira,
    meioPagamento: pagamento.meioPagamento,
    valor: pagamento.valor / 100,
  }));

  return {
    dataVenda: formatLocalDate(sale.dataVenda ?? sale.dataInclusao),
    tipo: sale.tipo,
    idFeira: sale.idFeira ?? '',
    idOrcamento: sale.idOrcamento,
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
  draftKey,
  initialForm,
  onDraftChange,
  open,
  onClose,
  onMinimize,
  onSaved,
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

  const [form, setInternalForm] =
    useState<SaleFormState>(initialSaleFormState);
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
  const [showConfig, setShowConfig] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const isEditMode = sale !== null;
  const persistedConfigRef = useRef(persistedConfig);
  const preservedDraftRef = useRef(false);
  const preservedDraftSaleIdRef = useRef<number | null>(null);
  const canEmitDraftChangeRef = useRef(false);
  const initialFormRef = useRef(initialForm);

  initialFormRef.current = initialForm;

  const setForm = (
    nextForm:
      | SaleFormState
      | ((currentForm: SaleFormState) => SaleFormState),
  ) => {
    setInternalForm((currentForm) =>
      typeof nextForm === 'function' ? nextForm(currentForm) : nextForm,
    );
  };

  useEffect(() => {
    persistedConfigRef.current = persistedConfig;
  }, [persistedConfig]);

  useEffect(() => {
    if (open && !isEditMode && canEmitDraftChangeRef.current) {
      onDraftChange?.(cloneSaleFormState(form));
    }
  }, [form, isEditMode, onDraftChange, open]);

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
      const currentSaleId = sale?.id ?? null;
      canEmitDraftChangeRef.current = false;

      if (
        preservedDraftRef.current &&
        preservedDraftSaleIdRef.current === currentSaleId
      ) {
        preservedDraftRef.current = false;
      } else {
        const nextForm =
          isEditMode && sale
            ? mapSaleToForm(sale)
            : initialFormRef.current
              ? cloneSaleFormState(initialFormRef.current)
            : getResetFormState(persistedConfigRef.current);

        setForm(nextForm);
      }

      void loadCatalogProducts();
      void fetchFeiras();
      void fetchCarteiras();
      canEmitDraftChangeRef.current = true;
      return;
    }

    canEmitDraftChangeRef.current = false;
    clearSubmitError();
  }, [
    open,
    sale,
    draftKey,
    isEditMode,
    fetchCarteiras,
    fetchFeiras,
    clearSubmitError,
  ]);

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

  const hasFilledProduct = form.itens.some((item) => {
    if (item.tipoItem === 'CATALOGO') {
      return item.idProduto !== null;
    }

    return item.nomeProduto.trim().length > 0 || item.valorUnitario > 0;
  });

  const handleClose = () => {
    preservedDraftRef.current = false;
    preservedDraftSaleIdRef.current = null;
    setForm(
      isEditMode && sale
        ? mapSaleToForm(sale)
        : getResetFormState(persistedConfig),
    );
    setProblem(null);
    setLocalErrors({});
    setItemErrors([]);
    setPaymentErrors([]);
    setIsCancelConfirmOpen(false);
    clearSubmitError();
    onClose();
  };

  const handleDismissPreservingDraft = () => {
    if (onMinimize && !isEditMode) {
      onMinimize();
      return;
    }

    preservedDraftRef.current = true;
    preservedDraftSaleIdRef.current = sale?.id ?? null;
    onClose();
  };

  const handleAskCancel = () => {
    if (isBusy) {
      return;
    }

    if (hasFilledProduct) {
      setIsCancelConfirmOpen(true);
      return;
    }

    handleClose();
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

  const handleChangeSaleType = (type: TipoVenda) => {
    setPersistedConfig((current) => ({
      tipo: type,
      idFeira: current.idFeira,
    }));
    setForm((current) => ({
      ...current,
      tipo: type,
      idFeira: type === 'FEIRA' ? current.idFeira : '',
    }));
  };

  const handleChangeFair = (nextFairId: number | '') => {
    setPersistedConfig((current) => ({
      ...current,
      idFeira: nextFairId,
    }));
    setForm((current) => ({
      ...current,
      idFeira: nextFairId,
    }));
  };

  const handleChangePaymentWallet = (
    index: number,
    nextWalletId: number | '',
  ) => {
    const nextMethods = getAvailableMeiosPagamento(nextWalletId);
    const currentPayment = form.pagamentos[index];

    updatePayment(index, {
      idCarteira: nextWalletId,
      meioPagamento: nextMethods.includes(currentPayment.meioPagamento)
        ? currentPayment.meioPagamento
        : nextMethods[0]!,
    });
  };

  const handleChangeItemQuantity = (index: number, quantity: number) => {
    updateItem(index, { quantidade: Math.max(1, quantity) });
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

    if (!form.dataVenda) {
      nextLocalErrors.dataVenda = 'Informe a data da venda.';
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
    const hasConfigErrors =
      Boolean(nextLocalErrors.dataVenda) ||
      Boolean(nextLocalErrors.idFeira) ||
      Boolean(nextPaymentErrors[0]?.idCarteira);

    if (hasConfigErrors) {
      setShowConfig(true);
    }

    if (
      Object.keys(nextLocalErrors).length > 0 ||
      hasItemErrors ||
      hasPaymentErrors
    ) {
      return;
    }

    const dataVendaFormatoApi = isEditMode
      ? formatLocalDate(form.dataVenda, 'api-date-time')
      : formatLocalDate(form.dataVenda, 'api-current-date-time');

    const payload = {
      dataVenda: dataVendaFormatoApi,
      tipo: form.tipo,
      idFeira: form.idFeira === '' ? undefined : form.idFeira,
      idOrcamento: form.idOrcamento,
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
      await onSaved?.();
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

  const primaryPayment =
    form.pagamentos[0] ?? initialSaleFormState.pagamentos[0];
  const selectedWallet = carteiras.find(
    (carteira) => carteira.id === primaryPayment.idCarteira,
  );
  const selectedFair =
    form.idFeira === ''
      ? null
      : feiras.find((feira) => feira.id === form.idFeira);
  const availablePrimaryMethods = getAvailableMeiosPagamento(
    primaryPayment.idCarteira,
  );
  const configSummary = [
    formatLocalDate(form.dataVenda, 'display-date'),
    saleTypeLabels[form.tipo],
    form.tipo === 'FEIRA' ? (selectedFair?.nome ?? 'sem feira') : null,
    selectedWallet?.nome ?? 'sem carteira',
  ]
    .filter(Boolean)
    .join(' • ');

  const handleDialogClose = (
    _event: object,
    reason: 'backdropClick' | 'escapeKeyDown',
  ) => {
    if (isBusy) {
      return;
    }

    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
      handleDismissPreservingDraft();
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h5" fontWeight={800}>
                {isEditMode
                  ? `Alterar venda #${sale?.id}`
                  : 'Nova venda rápida'}
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

            {onMinimize && !isEditMode ? (
              <Tooltip title="Minimizar venda">
                <span>
                  <IconButton
                    onClick={onMinimize}
                    aria-label="Minimizar venda"
                    disabled={isBusy}
                  >
                    <Minimize />
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}

            <IconButton
              onClick={handleAskCancel}
              aria-label="Fechar modal de venda"
              disabled={isBusy}
            >
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
          <Stack spacing={2.5}>
            <FormFeedbackAlert message={globalMessage} />

            {!isOnline && !isEditMode ? (
              <Alert severity="info">
                Você está offline. As vendas serão salvas localmente e poderão
                ser sincronizadas depois.
              </Alert>
            ) : null}

            {!isOnline && isEditMode ? (
              <Alert severity="warning">
                A edição de vendas está disponível apenas quando houver conexão
                com a internet.
              </Alert>
            ) : null}

            {form.tipo === 'FEIRA' && feiras.length === 0 ? (
              <Alert severity="info">
                Nenhuma feira cadastrada até o momento. Cadastre uma feira antes
                de registrar vendas desse tipo.
              </Alert>
            ) : null}

            {carteiras.length === 0 ? (
              <Alert severity="info">
                Nenhuma carteira cadastrada até o momento. Cadastre uma carteira
                para registrar vendas.
              </Alert>
            ) : null}

            <Collapse in={showConfig} unmountOnExit>
              <Paper
                elevation={2}
                sx={{
                  borderRadius: 2,
                  p: 1.5,
                }}
              >
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 5 }}>
                    <DatePickerField
                      label="Data da venda"
                      value={form.dataVenda}
                      onValueChange={(dataVenda) =>
                        setForm((current) => ({
                          ...current,
                          dataVenda,
                        }))
                      }
                      slotProps={{
                        textField: {
                          size: 'small',
                          error: Boolean(
                            localErrors.dataVenda ||
                            getFieldMessage(problem, 'dataVenda'),
                          ),
                          helperText:
                            localErrors.dataVenda ??
                            getFieldMessage(problem, 'dataVenda'),
                        },
                      }}
                    />
                  </Grid>

                  <Grid
                    size={{
                      xs: form.tipo === 'FEIRA' ? 6 : 12,
                      sm: form.tipo === 'FEIRA' ? 3 : 7,
                    }}
                  >
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Tipo"
                      value={form.tipo}
                      onChange={(event) =>
                        handleChangeSaleType(event.target.value as TipoVenda)
                      }
                    >
                      <MenuItem value="FEIRA">Feira</MenuItem>
                      <MenuItem value="LOJA">Loja</MenuItem>
                      <MenuItem value="ONLINE">Online</MenuItem>
                      <MenuItem value="CONSIGNACAO" disabled>
                        Consignação
                      </MenuItem>
                    </TextField>
                  </Grid>

                  {form.tipo === 'FEIRA' ? (
                    <Grid size={{ xs: 6, sm: 4 }}>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Feira"
                        value={form.idFeira}
                        onChange={(event) => {
                          handleChangeFair(
                            event.target.value === ''
                              ? ''
                              : Number(event.target.value),
                          );
                        }}
                        error={Boolean(
                          localErrors.idFeira ||
                          getFieldMessage(problem, 'idFeira'),
                        )}
                        helperText={
                          localErrors.idFeira ??
                          getFieldMessage(problem, 'idFeira')
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
              </Paper>
            </Collapse>

            <Box>
              <SectionLabel>Itens da venda</SectionLabel>

              {localErrors.itens ? (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  {localErrors.itens}
                </Alert>
              ) : null}

              <Stack spacing={1.5}>
                {form.itens.map((item, index) => {
                  const itemLabel =
                    item.tipoItem === 'CATALOGO' ? 'catalogo' : 'avulso';
                  const unitValue = item.brinde
                    ? 0
                    : item.tipoItem === 'CATALOGO'
                      ? getCatalogProductValue(
                          item,
                          catalogProducts,
                          fairProductPrices,
                        ) / 100
                      : item.valorUnitario;
                  const itemTotal =
                    Math.round(unitValue * 100) * item.quantidade;

                  return (
                    <Paper
                      key={`${index}-${item.tipoItem}-${item.idProduto ?? 'novo'}`}
                      elevation={2}
                      sx={{
                        borderRadius: 2,
                        p: 1.5,
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Grid container spacing={1} alignItems="flex-start">
                          <Grid
                            size={{
                              xs: 10,
                              sm: item.tipoItem === 'CATALOGO' ? 11 : 7,
                            }}
                          >
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

                          {item.tipoItem === 'AVULSO' ? (
                            <Grid size={{ xs: 12, sm: 4 }}>
                              <CurrencyField
                                fullWidth
                                size="small"
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
                            </Grid>
                          ) : null}

                          <Grid size={{ xs: 2, sm: 1 }}>
                            <IconButton
                              onClick={() => handleRemoveItem(index)}
                              color="error"
                              disabled={form.itens.length === 1 || isBusy}
                              aria-label={`Remover item ${itemLabel}`}
                              sx={{ mt: 0.25 }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>

                        {item.tipoItem === 'AVULSO' || item.brinde ? (
                          <Stack direction="row" spacing={0.75} flexWrap="wrap">
                            {item.tipoItem === 'AVULSO' ? (
                              <Chip
                                label="AVULSO"
                                color="info"
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 700 }}
                              />
                            ) : null}
                            {item.brinde ? (
                              <Chip
                                label="BRINDE"
                                color="warning"
                                size="small"
                                sx={{ fontWeight: 800 }}
                              />
                            ) : null}
                          </Stack>
                        ) : null}

                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1.5}
                          justifyContent="space-between"
                          alignItems={{ xs: 'stretch', sm: 'center' }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                          >
                            <IconButton
                              onClick={() =>
                                handleChangeItemQuantity(
                                  index,
                                  item.quantidade - 1,
                                )
                              }
                              disabled={item.quantidade <= 1 || isBusy}
                              aria-label={`Diminuir quantidade do item ${itemLabel}`}
                              sx={{
                                border: (theme) =>
                                  `1px solid ${theme.palette.divider}`,
                                borderRadius: 1,
                              }}
                            >
                              <Remove fontSize="small" />
                            </IconButton>

                            <TextField
                              size="small"
                              type="number"
                              value={item.quantidade}
                              onChange={(event) => {
                                handleChangeItemQuantity(
                                  index,
                                  Number(event.target.value),
                                );
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
                              inputProps={{
                                min: 1,
                                'aria-label': `Quantidade do item ${itemLabel}`,
                              }}
                              sx={{
                                width: 72,
                                '& input': { textAlign: 'center' },
                              }}
                            />

                            <IconButton
                              onClick={() =>
                                handleChangeItemQuantity(
                                  index,
                                  item.quantidade + 1,
                                )
                              }
                              disabled={isBusy}
                              aria-label={`Aumentar quantidade do item ${itemLabel}`}
                              sx={{
                                border: (theme) =>
                                  `1px solid ${theme.palette.divider}`,
                                borderRadius: 1,
                              }}
                            >
                              <Add fontSize="small" />
                            </IconButton>

                            <Button
                              size="small"
                              variant={item.brinde ? 'contained' : 'outlined'}
                              color={item.brinde ? 'warning' : 'inherit'}
                              startIcon={<CardGiftcard />}
                              onClick={() => {
                                const checked = !item.brinde;
                                updateItem(index, {
                                  brinde: checked,
                                  valorUnitario:
                                    checked && item.tipoItem === 'AVULSO'
                                      ? 0
                                      : item.valorUnitario,
                                });
                              }}
                            >
                              Brinde
                            </Button>

                            <Button
                              size="small"
                              variant="text"
                              startIcon={
                                item.tipoItem === 'CATALOGO' ? (
                                  <Category />
                                ) : (
                                  <Inventory2 />
                                )
                              }
                              onClick={() =>
                                handleChangeItemType(
                                  index,
                                  item.tipoItem === 'CATALOGO'
                                    ? 'AVULSO'
                                    : 'CATALOGO',
                                )
                              }
                              sx={{ textTransform: 'none' }}
                            >
                              {item.tipoItem === 'CATALOGO'
                                ? 'Item avulso'
                                : 'Usar catálogo'}
                            </Button>
                          </Stack>

                          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Total do item
                            </Typography>
                            <Typography variant="subtitle1" fontWeight={800}>
                              {formatCurrency(itemTotal)}
                            </Typography>
                          </Box>
                        </Stack>
                      </Stack>
                    </Paper>
                  );
                })}

                <Button
                  startIcon={<Add />}
                  onClick={handleAddItem}
                  variant="outlined"
                  disabled={isBusy}
                  sx={{
                    borderStyle: 'dashed',
                    py: 1.1,
                    justifyContent: 'center',
                  }}
                >
                  Adicionar item
                </Button>
              </Stack>
            </Box>

            <Box>
              <SectionLabel>Desconto</SectionLabel>
              <Stack spacing={0.75}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
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
                          current.descontoModo === newValue
                            ? current.desconto
                            : 0,
                      }));
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
                </Stack>

                {discountHelperText ? (
                  <Typography variant="caption" color="text.secondary">
                    {discountHelperText}
                  </Typography>
                ) : null}
              </Stack>
            </Box>

            <Box>
              <SectionLabel>Forma de pagamento</SectionLabel>

              {localErrors.pagamentos ? (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  {localErrors.pagamentos}
                </Alert>
              ) : null}

              {form.pagamentos.length === 1 ? (
                <>
                  <Stack spacing={1.25} sx={{ mb: 1.5 }}>
                    <WalletToggleGroup
                      value={primaryPayment.idCarteira}
                      wallets={carteiras}
                      onChange={(idCarteira) =>
                        handleChangePaymentWallet(0, idCarteira)
                      }
                      error={
                        paymentErrors[0]?.idCarteira ??
                        getFieldMessage(problem, 'pagamentos[0].idCarteira')
                      }
                    />
                  </Stack>

                  <Grid container spacing={1}>
                    {paymentOptions.map((option) => {
                      const Icon = option.icon;
                      const isSelected =
                        primaryPayment.meioPagamento === option.value;
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
                              updatePayment(0, { meioPagamento: option.value })
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

              {form.pagamentos.length < 2 ? (
                <Button
                  onClick={handleAddPayment}
                  variant="text"
                  disabled={isBusy}
                  sx={{ mt: 1.5, textTransform: 'none' }}
                >
                  Dividir em mais formas de pagamento
                </Button>
              ) : null}

              <Collapse in={form.pagamentos.length > 1} unmountOnExit>
                <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                  {form.pagamentos.map((pagamento, index) => {
                    const availableMeiosPagamento = getAvailableMeiosPagamento(
                      pagamento.idCarteira,
                    );
                    const paymentValue =
                      form.pagamentos.length === 1
                        ? totals.total / 100
                        : pagamento.valor;

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
                            wallets={carteiras}
                            onChange={(idCarteira) =>
                              handleChangePaymentWallet(index, idCarteira)
                            }
                            error={
                              paymentErrors[index]?.idCarteira ??
                              getFieldMessage(
                                problem,
                                `pagamentos[${index}].idCarteira`,
                              )
                            }
                          />

                          <Grid
                            container
                            spacing={1.25}
                            alignItems="flex-start"
                          >
                            <Grid size={{ xs: 4, sm: 3 }}>
                              <TextField
                                select
                                fullWidth
                                size="small"
                                label="Meio"
                                value={pagamento.meioPagamento}
                                onChange={(event) => {
                                  updatePayment(index, {
                                    meioPagamento: event.target
                                      .value as MeioPagamento,
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
                                  )
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
                                onClick={() => handleRemovePayment(index)}
                                color="error"
                                disabled={
                                  form.pagamentos.length === 1 || isBusy
                                }
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
                </Stack>
              </Collapse>
            </Box>
          </Stack>
        </DialogContent>

        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            bgcolor: 'background.default',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" color="text.secondary">
              Total • {totals.totalQuantidadeItens}{' '}
              {totals.totalQuantidadeItens === 1 ? 'item' : 'itens'}
              {totals.saleDiscount > 0 ? (
                <>
                  {' '}
                  <Typography
                    component="span"
                    variant="body2"
                    color="text.secondary"
                    sx={{ textDecoration: 'line-through' }}
                  >
                    {formatCurrency(totals.subtotal)}
                  </Typography>
                </>
              ) : null}
            </Typography>
            <Typography variant="h4" fontWeight={900} color="success.main">
              {formatCurrency(totals.total)}
            </Typography>
          </Box>

          <Button
            onClick={handleSubmit}
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            disabled={isBusy || (isEditMode && !isOnline)}
            sx={{ minWidth: { xs: 132, sm: 160 }, height: 56 }}
          >
            {isBusy
              ? 'Salvando...'
              : isEditMode
                ? 'Salvar'
                : isOnline
                  ? 'Finalizar'
                  : 'Salvar offline'}
          </Button>
        </Box>

        {isFetching ? (
          <Box sx={{ position: 'absolute', top: 22, right: 64 }}>
            <CircularProgress size={20} />
          </Box>
        ) : null}
      </Dialog>

      <Dialog
        open={isCancelConfirmOpen}
        onClose={() => {
          if (!isBusy) {
            setIsCancelConfirmOpen(false);
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cancelar venda?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Os itens preenchidos serão descartados. Para apenas sair e continuar
            depois, minimize a venda ou clique fora do modal.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setIsCancelConfirmOpen(false)}
            disabled={isBusy}
          >
            Continuar editando
          </Button>
          <Button color="error" onClick={handleClose} disabled={isBusy}>
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
