import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, Stack } from '@mui/material';
import { listAllProducts } from '@/features/products/api/products-api';
import { getOpenCashRegister } from '@/features/finance/api/finance-api';
import {
  saleStoreSelectors,
  useSaleStore,
} from '@/features/sales/store/use-sale-store';
import { useAuth } from '@/features/auth';
import {
  emptySaleItem,
  initialSaleFormState,
  type SaleFormErrors,
  type SaleFormItem,
  type SaleFormPayment,
  type SaleFormState,
  type SaleItemErrors,
  type SalePaymentErrors,
  type SaleItemType,
} from '@/features/sales/types/sale-form';
import {
  getCachedOpenCashRegister,
  getCachedProductCatalog,
  saveCachedOpenCashRegister,
  saveCachedProductCatalog,
} from '@/shared/lib/offline/indexed-db';
import {
  ConfirmDialog,
  formatCurrency,
  formatLocalDate,
  getFieldMessage,
  getProblemDetailsFromError,
  useFeedbackStore,
  useOnlineStatus,
  type MeioPagamento,
  type ProblemDetails,
  type Produto,
  type TipoVenda,
  type Venda,
  type Caixa,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';
import {
  buildSalePayload,
  calculateSaleTotals,
  cloneSaleFormState,
  getResetFormState,
  mapSaleToForm,
  saleTypeLabels,
  undoCreatedSale,
  type PersistedSaleConfig,
} from './new-sale/sale-form-helpers';
import {
  scrollToFirstSaleFormError,
  validateSaleForm,
} from './new-sale/sale-form-validation';
import { useFairProductPrices } from './new-sale/use-fair-product-prices';
import { useTopSellerIds } from './new-sale/use-top-seller-ids';
import SaleConfigSection from './new-sale/sale-config-section';
import SaleDialogAlerts from './new-sale/sale-dialog-alerts';
import SaleDialogFooter from './new-sale/sale-dialog-footer';
import SaleDialogHeader from './new-sale/sale-dialog-header';
import SaleDiscountSection from './new-sale/sale-discount-section';
import SaleItemsSection from './new-sale/sale-items-section';
import SalePaymentSection from './new-sale/sale-payment-section';

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

  const [form, setInternalForm] = useState<SaleFormState>(initialSaleFormState);
  const [caixaAberto, setCaixaAberto] = useState<Caixa | null>(null);
  const [isCaixaFromCache, setIsCaixaFromCache] = useState(false);
  const carteirasDisponiveis = useMemo(() => {
    if (form.tipo !== 'FEIRA' || !caixaAberto) return carteiras;
    const ids = new Set(
      caixaAberto.conferencias.map((item) => item.idCarteira),
    );
    return carteiras.filter((carteira) => ids.has(carteira.id));
  }, [caixaAberto, carteiras, form.tipo]);
  const [persistedConfig, setPersistedConfig] = useState<PersistedSaleConfig>({
    tipo: initialSaleFormState.tipo,
    idFeira: initialSaleFormState.idFeira,
  });
  const [catalogProducts, setCatalogProducts] = useState<Produto[]>([]);
  const [catalogErrorMessage, setCatalogErrorMessage] = useState<string | null>(
    null,
  );
  const [isLoadingCatalogProducts, setIsLoadingCatalogProducts] =
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
  const {
    fairProductPrices,
    fairProductPricesErrorMessage,
    isLoadingFairProductPrices,
  } = useFairProductPrices(open && form.tipo === 'FEIRA' ? form.idFeira : '');
  const topSellerIds = useTopSellerIds(open && !isEditMode && isOnline);
  const { user } = useAuth();
  const canDeleteSale = user?.permissions.includes('venda.excluir') ?? false;
  const persistedConfigRef = useRef(persistedConfig);
  const preservedDraftRef = useRef(false);
  const preservedDraftSaleIdRef = useRef<number | null>(null);
  const canEmitDraftChangeRef = useRef(false);
  const firstProductInputRef = useRef<HTMLInputElement | null>(null);
  const submissionKeyRef = useRef<{ signature: string; key: string } | null>(
    null,
  );
  const initialFormRef = useRef(initialForm);

  initialFormRef.current = initialForm;

  const setForm = (
    nextForm: SaleFormState | ((currentForm: SaleFormState) => SaleFormState),
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
    const carteiraPadrao = carteirasDisponiveis.find(
      (carteira) => carteira.ativa,
    );
    const primeiroPagamento = form.pagamentos[0];

    if (
      open &&
      !isEditMode &&
      primeiroPagamento?.idCarteira === '' &&
      carteiraPadrao
    ) {
      setForm((current) => ({
        ...current,
        // Reavalia sobre o estado atual: outra atualização (restaurar rascunho)
        // pode já ter definido a carteira desde a renderização que agendou isto.
        pagamentos: current.pagamentos.map((pagamento, index) =>
          index === 0 && pagamento.idCarteira === ''
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
  }, [open, isEditMode, carteirasDisponiveis, form.pagamentos]);

  useEffect(() => {
    window.__AKKAI_PRODUCTS__ = catalogProducts;
  }, [catalogProducts]);

  useEffect(() => {
    if (!open || form.tipo !== 'FEIRA' || form.idFeira === '') {
      setCaixaAberto(null);
      setIsCaixaFromCache(false);
      return;
    }

    const idFeira = form.idFeira;
    let active = true;

    // Sem conexão (ou com a API fora do ar) usa o último caixa aberto visto
    // neste aparelho; o servidor revalida o caixa quando a venda sincronizar.
    const loadCashRegisterFromCache = async () => {
      const cachedCaixa = await getCachedOpenCashRegister(idFeira).catch(
        () => null,
      );

      if (active) {
        setCaixaAberto(cachedCaixa?.status === 'ABERTO' ? cachedCaixa : null);
        setIsCaixaFromCache(cachedCaixa?.status === 'ABERTO');
      }
    };

    if (!isOnline) {
      void loadCashRegisterFromCache();
      return () => {
        active = false;
      };
    }

    getOpenCashRegister(idFeira)
      .then((caixa) => {
        if (active) {
          setCaixaAberto(caixa);
          setIsCaixaFromCache(false);
        }
        void saveCachedOpenCashRegister(idFeira, caixa).catch(() => undefined);
      })
      .catch((error: unknown) => {
        if (getProblemDetailsFromError(error).status === 0) {
          void loadCashRegisterFromCache();
        } else if (active) {
          setCaixaAberto(null);
          setIsCaixaFromCache(false);
        }
      });

    return () => {
      active = false;
    };
  }, [form.idFeira, form.tipo, isOnline, open]);

  const getAvailableMeiosPagamento = (idCarteira: number | '') => {
    const carteira = carteirasDisponiveis.find((c) => c.id === idCarteira);
    if (!carteira?.meiosPagamento?.length)
      return ['DIN', 'DEB', 'CRE', 'PIX'] as MeioPagamento[];
    return carteira.meiosPagamento;
  };

  const totals = useMemo(
    () => calculateSaleTotals(form, catalogProducts, fairProductPrices),
    [form, catalogProducts, fairProductPrices],
  );

  const hasFilledProduct = form.itens.some((item) => {
    if (item.tipoItem === 'CATALOGO') {
      return item.idProduto !== null;
    }

    return item.nomeProduto.trim().length > 0 || item.valorUnitario > 0;
  });

  const isSplitPayment = form.pagamentos.length > 1;
  const paymentsRemaining = isSplitPayment
    ? totals.total -
      form.pagamentos.reduce(
        (total, pagamento) => total + Math.round(pagamento.valor * 100),
        0,
      )
    : 0;

  const hasEmptySplitPayment =
    isSplitPayment && form.pagamentos.some((pagamento) => pagamento.valor <= 0);

  const handleChangePaymentValue = (index: number, valor: number) => {
    setForm((current) => {
      const pagamentos = current.pagamentos.map((pagamento, currentIndex) =>
        currentIndex === index ? { ...pagamento, valor } : pagamento,
      );

      // Com duas formas de pagamento, a outra recebe automaticamente o restante.
      if (pagamentos.length === 2) {
        const otherIndex = index === 0 ? 1 : 0;
        const restanteCentavos = Math.max(
          0,
          totals.total - Math.round(valor * 100),
        );
        pagamentos[otherIndex] = {
          ...pagamentos[otherIndex],
          valor: restanteCentavos / 100,
        };
      }

      return { ...current, pagamentos };
    });
  };

  const handleFillPaymentRemaining = () => {
    const lastIndex = form.pagamentos.length - 1;
    const lastPayment = form.pagamentos[lastIndex];

    if (!lastPayment) {
      return;
    }

    updatePayment(lastIndex, {
      valor:
        Math.max(0, Math.round(lastPayment.valor * 100) + paymentsRemaining) /
        100,
    });
  };

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

  /** Adiciona 1 unidade do produto, somando se já estiver na venda. */
  const handleQuickAddProduct = (product: Produto) => {
    const duplicatedIndex = form.itens.findIndex(
      (item) =>
        item.tipoItem === 'CATALOGO' &&
        item.idProduto === product.id &&
        !item.brinde,
    );

    if (duplicatedIndex >= 0) {
      updateItem(duplicatedIndex, {
        quantidade: form.itens[duplicatedIndex]!.quantidade + 1,
      });
      return;
    }

    const emptyIndex = form.itens.findIndex(
      (item) => item.tipoItem === 'CATALOGO' && item.idProduto === null,
    );

    if (emptyIndex >= 0) {
      updateItem(emptyIndex, {
        idProduto: product.id,
        nomeProduto: product.nome,
        valorUnitario: product.valor / 100,
      });
      return;
    }

    setForm((current) => ({
      ...current,
      itens: [
        ...current.itens,
        {
          ...emptySaleItem,
          idProduto: product.id,
          nomeProduto: product.nome,
          valorUnitario: product.valor / 100,
        },
      ],
    }));
    setItemErrors((current) => [...current, {}]);
  };

  const topSellerProducts = topSellerIds
    .map((id) => catalogProducts.find((product) => product.id === id))
    .filter((product): product is Produto => product !== undefined);

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

  const handleSelectCatalogProduct = (
    index: number,
    product: { id: number; nome: string; valor: number } | null,
  ) => {
    const duplicatedIndex = product
      ? form.itens.findIndex(
          (item, currentIndex) =>
            currentIndex !== index &&
            item.tipoItem === 'CATALOGO' &&
            item.idProduto === product.id &&
            !item.brinde &&
            !form.itens[index]?.brinde,
        )
      : -1;

    if (product && duplicatedIndex >= 0) {
      const addedQuantity = Math.max(1, form.itens[index]?.quantidade ?? 1);

      setForm((current) => ({
        ...current,
        itens: current.itens
          .map((item, currentIndex) =>
            currentIndex === duplicatedIndex
              ? { ...item, quantidade: item.quantidade + addedQuantity }
              : item,
          )
          .filter((_, currentIndex) => currentIndex !== index),
      }));
      setItemErrors((current) =>
        current.filter((_, currentIndex) => currentIndex !== index),
      );
      showSuccess(
        `${product.nome}: quantidade somada a um item já adicionado à venda.`,
      );
      return;
    }

    updateItem(index, {
      idProduto: product?.id ?? null,
      nomeProduto: product?.nome ?? '',
      valorUnitario: product ? product.valor / 100 : 0,
    });
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

  // A feira lembrada de uma venda anterior pode ter sido inativada depois.
  useEffect(() => {
    if (isEditMode || form.tipo !== 'FEIRA' || form.idFeira === '') {
      return;
    }

    const feiraSelecionada = feiras.find((feira) => feira.id === form.idFeira);

    if (feiraSelecionada && !feiraSelecionada.ativa) {
      setForm((current) => ({ ...current, idFeira: '' }));
    }
  }, [feiras, form.idFeira, form.tipo, isEditMode]);

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

  const handleSubmit = async () => {
    const { nextLocalErrors, nextItemErrors, nextPaymentErrors } =
      validateSaleForm(form, totals.total, getAvailableMeiosPagamento);
    setLocalErrors(nextLocalErrors);
    setItemErrors(nextItemErrors);
    setPaymentErrors(nextPaymentErrors);
    setProblem(null);

    if (!isEditMode && form.tipo === 'FEIRA' && !caixaAberto) {
      setLocalErrors((current) => ({
        ...current,
        idFeira: isOnline
          ? 'Abra o caixa desta feira antes de registrar vendas.'
          : 'Não há caixa aberto desta feira salvo neste aparelho. Conecte-se com o caixa aberto ao menos uma vez antes de vender offline.',
      }));
      setShowConfig(true);
      scrollToFirstSaleFormError();
      return;
    }

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
      scrollToFirstSaleFormError();
      return;
    }

    const payload = buildSalePayload({
      form,
      sale: isEditMode ? sale : null,
      caixaId: caixaAberto?.id,
      totals,
      catalogProducts,
      fairProductPrices,
    });

    if (isEditMode && !isOnline) {
      setProblem({
        type: 'about:blank',
        title: 'Sem conexão',
        status: 0,
        detail:
          'A edição de vendas exige conexão com a internet. Tente novamente quando estiver online.',
        instance: '',
      });
      return;
    }

    // A mesma chave é reaproveitada enquanto o conteúdo da venda não muda, para
    // que um reenvio (resposta perdida, timeout) não registre a venda de novo.
    const signature = JSON.stringify({ ...payload, dataVenda: form.dataVenda });
    if (submissionKeyRef.current?.signature !== signature) {
      submissionKeyRef.current = {
        signature,
        key: window.crypto.randomUUID(),
      };
    }
    const chaveIdempotencia = submissionKeyRef.current.key;

    setIsSaving(true);

    try {
      const result =
        isEditMode && sale
          ? await alterarVenda(sale.id, payload)
          : await criarVenda({ ...payload, chaveIdempotencia });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      submissionKeyRef.current = null;

      if (result.data.id < 0) {
        showSuccess(
          'Venda salva offline. Sincronize quando a internet voltar.',
        );
        handleClose();
        return;
      }

      await fetchVendas();
      await onSaved?.();
      const createdSaleId = result.data.id;
      showSuccess(
        isEditMode
          ? 'Venda alterada com sucesso.'
          : 'Venda cadastrada com sucesso.',
        !isEditMode && canDeleteSale
          ? {
              label: 'Desfazer',
              onClick: () => {
                void undoCreatedSale(createdSaleId);
              },
            }
          : undefined,
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
  // Feiras inativas não são oferecidas para novas vendas; ao alterar uma venda
  // já existente, a feira dela continua selecionável para não ficar em branco.
  const feirasDisponiveis = feiras.filter(
    (feira) => feira.ativa || (isEditMode && feira.id === form.idFeira),
  );
  const selectedFair =
    form.idFeira === ''
      ? null
      : feiras.find((feira) => feira.id === form.idFeira);
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
      <Dialog
        open={open}
        onClose={handleDialogClose}
        fullWidth
        maxWidth="sm"
        slotProps={{
          transition: {
            // O foco automático do campo é sobrescrito pelo trap de foco do
            // diálogo; aplica-o novamente quando a abertura termina.
            onEntered: () => {
              if (!isEditMode && form.itens[0]?.idProduto === null) {
                firstProductInputRef.current?.focus();
              }
            },
          },
        }}
      >
        <SaleDialogHeader
          configSummary={configSummary}
          isBusy={isBusy}
          isEditMode={isEditMode}
          saleId={sale?.id}
          onAskCancel={handleAskCancel}
          onMinimize={onMinimize}
          onToggleConfig={() => setShowConfig((current) => !current)}
        />

        <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
          <Stack spacing={2.5}>
            <SaleDialogAlerts
              globalMessage={globalMessage}
              hasNoFairs={
                form.tipo === 'FEIRA' && feirasDisponiveis.length === 0
              }
              hasNoWallets={carteiras.length === 0}
              isEditMode={isEditMode}
              isOnline={isOnline}
              isCaixaFromCache={isCaixaFromCache}
            />

            <SaleConfigSection
              dataVenda={form.dataVenda}
              errors={localErrors}
              fairs={feirasDisponiveis}
              idFeira={form.idFeira}
              open={showConfig}
              problem={problem}
              tipo={form.tipo}
              onChangeDate={(dataVenda) =>
                setForm((current) => ({
                  ...current,
                  dataVenda,
                }))
              }
              onChangeFair={handleChangeFair}
              onChangeSaleType={handleChangeSaleType}
            />

            <SaleItemsSection
              catalogProducts={catalogProducts}
              errorMessage={localErrors.itens}
              fairProductPrices={fairProductPrices}
              firstProductInputRef={firstProductInputRef}
              isBusy={isBusy}
              isEditMode={isEditMode}
              isFetching={isFetching}
              itemErrors={itemErrors}
              items={form.itens}
              problem={problem}
              topSellerProducts={topSellerProducts}
              onAddItem={handleAddItem}
              onChangeQuantity={handleChangeItemQuantity}
              onChangeType={handleChangeItemType}
              onQuickAddProduct={handleQuickAddProduct}
              onRemove={handleRemoveItem}
              onSelectCatalogProduct={handleSelectCatalogProduct}
              onUpdate={updateItem}
            />

            <SaleDiscountSection
              discount={form.desconto}
              discountMode={form.descontoModo}
              error={localErrors.desconto}
              helperText={discountHelperText}
              problem={problem}
              onChangeDiscount={(desconto) =>
                setForm((current) => ({ ...current, desconto }))
              }
              onChangeMode={(descontoModo) =>
                setForm((current) => ({
                  ...current,
                  descontoModo,
                  desconto:
                    current.descontoModo === descontoModo
                      ? current.desconto
                      : 0,
                }))
              }
            />

            <SalePaymentSection
              errorMessage={localErrors.pagamentos}
              getAvailableMethods={getAvailableMeiosPagamento}
              hasEmptySplitPayment={hasEmptySplitPayment}
              isBusy={isBusy}
              paymentErrors={paymentErrors}
              payments={form.pagamentos}
              paymentsRemaining={paymentsRemaining}
              primaryPayment={primaryPayment}
              problem={problem}
              total={totals.total}
              wallets={carteirasDisponiveis}
              onAddPayment={handleAddPayment}
              onChangePaymentValue={handleChangePaymentValue}
              onChangeWallet={handleChangePaymentWallet}
              onFillRemaining={handleFillPaymentRemaining}
              onRemovePayment={handleRemovePayment}
              onUpdatePayment={updatePayment}
            />
          </Stack>
        </DialogContent>

        <SaleDialogFooter
          discount={totals.saleDiscount}
          isBusy={isBusy}
          isEditMode={isEditMode}
          isFetching={isFetching}
          isOnline={isOnline}
          subtotal={totals.subtotal}
          total={totals.total}
          totalItems={totals.totalQuantidadeItens}
          onSubmit={handleSubmit}
        />
      </Dialog>

      <ConfirmDialog
        open={isCancelConfirmOpen}
        title="Cancelar venda?"
        message="Os itens preenchidos serão descartados. Para apenas sair e continuar depois, minimize a venda ou clique fora do modal."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        loadingLabel="Descartar"
        destructive
        isLoading={isBusy}
        onConfirm={handleClose}
        onClose={() => setIsCancelConfirmOpen(false)}
      />
    </>
  );
}
