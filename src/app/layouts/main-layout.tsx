import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { type Theme, useTheme } from '@mui/material/styles';
import {
  AdminPanelSettings,
  Add,
  AddShoppingCart,
  Assessment,
  AssignmentTurnedIn,
  Balance,
  Close,
  DarkMode,
  ExpandLess,
  ExpandMore,
  HomeOutlined,
  Inventory as ProductIcon,
  LightMode,
  Loyalty,
  Logout as LogoutIcon,
  PointOfSale,
  RequestQuote,
  ShoppingCart as SaleIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import CommandPalette, {
  type CommandItem,
} from '../components/command-palette';
import { useGlobalShortcuts } from '../hooks/use-global-shortcuts';
import { MainLayoutActionsContext } from './main-layout-actions';
import MainLayoutAppBar from './main-layout-app-bar';
import { APP_BAR_HEIGHT } from './main-layout-constants';
import {
  EditProfileDialog,
  PERMISSAO_ADMINISTRAR_PERMISSOES,
  useAuth,
} from '@/features/auth';
import { NewBudgetDialog } from '@/features/budgets';
import {
  CashRegisterOpeningDialog,
  NewExpenseDialog,
  NewWalletDialog,
  PaymentMethodWalletFeeDialog,
  WalletTransferDialog,
} from '@/features/finance';
import {
  NewAssinanteDialog,
  NewCicloDialog,
  NewKitDialog,
  NewPlanDialog,
} from '@/features/assinatura';
import { NewCategoryDialog, NewProductDialog } from '@/features/products';
import { FairDialog, NewSaleDialog, useSaleStore } from '@/features/sales';
import PendingSalesDialog from '@/features/sales/components/pending-sales-dialog';
import { useSaleOfflineWarmup } from '@/features/sales/hooks/use-sale-offline-warmup';
import { saleStoreSelectors } from '@/features/sales/store/use-sale-store';
import {
  initialSaleFormState,
  type SaleFormState,
} from '@/features/sales/types/sale-form';
import {
  loadQuickSaleDrafts,
  saveQuickSaleDrafts,
  loadQuickSaleDefaults,
  saveQuickSaleDefaults,
  type QuickSaleDefaults,
  type QuickSaleDraft,
} from '@/features/sales/utils/quick-sale-draft-storage';
import {
  BrandLogo,
  CurrencyValue,
  formatLocalDate,
  GlobalFeedbackSnackbar,
  useFeedbackStore,
  useOnlineStatus,
  useSwUpdate,
  useValueVisibilityStore,
} from '@/shared';
import { getActiveMenuStyles, getActiveSubmenuStyles } from '@/theme/theme';
import { useThemeMode } from '@/theme/use-theme-mode';
import { useShallow } from 'zustand/react/shallow';

const DRAWER_WIDTH = 256;

type MenuSection =
  | 'vendas'
  | 'produtos'
  | 'financeiro'
  | 'assinatura'
  | 'relatorios'
  | 'consignacao';

const MENU_SECTION_PREFIXES: ReadonlyArray<[string, MenuSection]> = [
  ['/vendas', 'vendas'],
  ['/produtos', 'produtos'],
  ['/financeiro', 'financeiro'],
  ['/assinatura', 'assinatura'],
  ['/relatorios', 'relatorios'],
  ['/consignacao', 'consignacao'],
];

function getMenuSection(pathname: string): MenuSection | null {
  return (
    MENU_SECTION_PREFIXES.find(([prefix]) =>
      pathname.startsWith(prefix),
    )?.[1] ?? null
  );
}
const MENU_ITEM_COMPACT_SX = {
  px: 1.25,
  py: 1,
  '& .MuiListItemText-root': {
    my: 0,
  },
};
const MENU_ITEM_ICON_SX = {
  minWidth: 34,
};
const MENU_ACTION_BUTTON_SX = {
  borderRadius: 1.5,
  color: 'text.secondary',
  // Atalhos "novo" aparecem ao passar o mouse; em telas de toque ficam sempre visíveis.
  '@media (hover: hover) and (pointer: fine)': {
    opacity: 0,
    '.MuiListItem-root:hover &, &:focus-visible, &.Mui-focusVisible': {
      opacity: 1,
    },
  },
  '&:hover': {
    bgcolor: 'action.selected',
    color: 'primary.main',
  },
};
const PERMISSAO_LISTAR_MOVIMENTACOES_ESTOQUE = 'estoque.ler';

function cloneSaleFormState(form: SaleFormState): SaleFormState {
  return {
    ...form,
    itens: form.itens.map((item) => ({ ...item })),
    pagamentos: form.pagamentos.map((pagamento) => ({ ...pagamento })),
  };
}

function createQuickSaleForm(config: QuickSaleDefaults): SaleFormState {
  return {
    ...cloneSaleFormState(initialSaleFormState),
    dataVenda: formatLocalDate(),
    tipo: config.tipo,
    idFeira: config.tipo === 'FEIRA' ? config.idFeira : '',
    pagamentos: initialSaleFormState.pagamentos.map((pagamento) => ({
      ...pagamento,
      idCarteira: config.idCarteira ?? pagamento.idCarteira,
      meioPagamento: config.meioPagamento ?? pagamento.meioPagamento,
    })),
  };
}

function calculateDraftDiscount(form: SaleFormState, subtotal: number) {
  if (form.descontoModo === 'PERCENTUAL') {
    const normalizedDiscount = Math.min(Math.max(form.desconto, 0), 99);
    return Math.round((subtotal * normalizedDiscount) / 100);
  }

  return Math.round(Math.min(Math.max(form.desconto, 0), 999.99) * 100);
}

function getQuickSaleDraftSummary(form: SaleFormState) {
  const filledItems = form.itens.filter((item) => {
    if (item.tipoItem === 'CATALOGO') {
      return item.idProduto !== null;
    }

    return item.nomeProduto.trim().length > 0 || item.valorUnitario > 0;
  });
  const totalQuantidadeItens = filledItems.reduce(
    (total, item) => total + item.quantidade,
    0,
  );
  const subtotal = filledItems.reduce((total, item) => {
    const valorUnitario = item.brinde
      ? 0
      : Math.round(item.valorUnitario * 100);
    return total + valorUnitario * item.quantidade;
  }, 0);
  const total = Math.max(0, subtotal - calculateDraftDiscount(form, subtotal));

  return {
    itemLabel:
      totalQuantidadeItens === 0
        ? 'sem itens'
        : `${totalQuantidadeItens} ${totalQuantidadeItens === 1 ? 'item' : 'itens'}`,
    total,
  };
}

interface MainLayoutProps {
  children: ReactNode;
}

const PENDING_SALES_RETRY_INTERVAL_MS = 60 * 1000;

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { mode, toggleColorMode } = useThemeMode();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const isOnline = useOnlineStatus();
  const { needsUpdate, update } = useSwUpdate();
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const showError = useFeedbackStore((state) => state.showError);
  const { hideValues, toggleHideValues } = useValueVisibilityStore(
    useShallow((state) => ({
      hideValues: state.hideValues,
      toggleHideValues: state.toggleHideValues,
    })),
  );
  const {
    hydrateOfflineState,
    isSyncingPendingSales,
    pendingSalesCount,
    rejectedSalesCount,
    sincronizarVendasPendentes,
  } = useSaleStore(
    useShallow((state) => ({
      hydrateOfflineState: saleStoreSelectors.hydrateOfflineState(state),
      isSyncingPendingSales: saleStoreSelectors.isSyncingPendingSales(state),
      pendingSalesCount: saleStoreSelectors.pendingSalesCount(state),
      rejectedSalesCount: saleStoreSelectors.rejectedSalesCount(state),
      sincronizarVendasPendentes:
        saleStoreSelectors.sincronizarVendasPendentes(state),
    })),
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingSalesDialogOpen, setPendingSalesDialogOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [recoveredQuickSales] = useState(() => loadQuickSaleDrafts(user?.id));
  const [quickSaleDrafts, setQuickSaleDrafts] = useState<QuickSaleDraft[]>(
    recoveredQuickSales.drafts,
  );
  const [activeQuickSaleDraftId, setActiveQuickSaleDraftId] = useState<
    string | null
  >(null);
  const [quickSaleDraftToDiscardId, setQuickSaleDraftToDiscardId] = useState<
    string | null
  >(null);
  const [quickSaleDefaultConfig, setQuickSaleDefaultConfig] =
    useState<QuickSaleDefaults>(
      () =>
        loadQuickSaleDefaults(user?.id) ?? {
          tipo: initialSaleFormState.tipo,
          idFeira: initialSaleFormState.idFeira,
        },
    );
  const [fairDialogOpen, setFairDialogOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [cashRegisterDialogOpen, setCashRegisterDialogOpen] = useState(false);
  const [
    paymentMethodWalletFeeDialogOpen,
    setPaymentMethodWalletFeeDialogOpen,
  ] = useState(false);
  const [walletTransferDialogOpen, setWalletTransferDialogOpen] =
    useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [assinanteDialogOpen, setAssinanteDialogOpen] = useState(false);
  const [cicloDialogOpen, setCicloDialogOpen] = useState(false);
  const [kitDialogOpen, setKitDialogOpen] = useState(false);
  // Acordeão: só o grupo da tela atual começa aberto; abrir outro fecha este.
  const activeMenuSection = getMenuSection(location.pathname);
  const [openMenuSection, setOpenMenuSection] = useState<MenuSection | null>(
    activeMenuSection,
  );
  useEffect(() => {
    setOpenMenuSection(activeMenuSection);
  }, [activeMenuSection]);
  const toggleMenuSection = (section: MenuSection) =>
    setOpenMenuSection((current) => (current === section ? null : section));
  const financeMenuOpen = openMenuSection === 'financeiro';
  const assinaturaMenuOpen = openMenuSection === 'assinatura';
  const productsMenuOpen = openMenuSection === 'produtos';
  const reportsMenuOpen = openMenuSection === 'relatorios';
  const salesMenuOpen = openMenuSection === 'vendas';
  const consignacaoMenuOpen = openMenuSection === 'consignacao';
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const quickSaleDraftSequenceRef = useRef(recoveredQuickSales.sequence);
  const podeListarMovimentacoesEstoque =
    user?.permissions.includes(PERMISSAO_LISTAR_MOVIMENTACOES_ESTOQUE) ?? false;
  const podeAdministrarPermissoes =
    user?.permissions.includes(PERMISSAO_ADMINISTRAR_PERMISSOES) ?? false;

  useEffect(() => {
    void hydrateOfflineState();
  }, [hydrateOfflineState]);

  useSaleOfflineWarmup(isOnline);

  useEffect(() => {
    saveQuickSaleDrafts(user?.id, {
      sequence: quickSaleDraftSequenceRef.current,
      drafts: quickSaleDrafts,
    });
  }, [quickSaleDrafts, user?.id]);

  useEffect(() => {
    const recoveredCount = recoveredQuickSales.drafts.length;

    if (recoveredCount > 0) {
      showSuccess(
        recoveredCount === 1
          ? '1 atendimento em andamento foi recuperado.'
          : `${recoveredCount} atendimentos em andamento foram recuperados.`,
      );
    }
  }, [recoveredQuickSales, showSuccess]);

  const productsSectionActive = useMemo(
    () => location.pathname.startsWith('/produtos'),
    [location.pathname],
  );
  const homeSectionActive = useMemo(
    () => location.pathname === '/',
    [location.pathname],
  );
  const salesSectionActive = useMemo(
    () => location.pathname.startsWith('/vendas'),
    [location.pathname],
  );
  const consignacaoSectionActive = useMemo(
    () => location.pathname.startsWith('/consignacao'),
    [location.pathname],
  );
  const reportsSectionActive = useMemo(
    () => location.pathname.startsWith('/relatorios'),
    [location.pathname],
  );
  const adminSectionActive = useMemo(
    () => location.pathname.startsWith('/administracao'),
    [location.pathname],
  );
  const financeSectionActive = useMemo(
    () => location.pathname.startsWith('/financeiro'),
    [location.pathname],
  );
  const assinaturaSectionActive = useMemo(
    () => location.pathname.startsWith('/assinatura'),
    [location.pathname],
  );
  const currentSectionTitle = useMemo(() => {
    if (location.pathname === '/') {
      return 'Início';
    }

    if (location.pathname.startsWith('/vendas')) {
      return 'Vendas';
    }

    if (location.pathname.startsWith('/consignacao')) {
      return 'Consignação';
    }

    if (location.pathname.startsWith('/produtos')) {
      return 'Produtos';
    }

    if (location.pathname.startsWith('/orcamentos')) {
      return 'Orçamentos';
    }

    if (location.pathname.startsWith('/financeiro')) {
      return 'Financeiro';
    }

    if (location.pathname.startsWith('/assinatura')) {
      return 'Assinatura';
    }

    if (location.pathname.startsWith('/relatorios')) {
      return 'Relatórios';
    }

    if (location.pathname.startsWith('/administracao')) {
      return 'Administração';
    }

    return 'AKKAI 3D';
  }, [location.pathname]);

  const closeMobileMenu = useCallback(() => setMobileOpen(false), []);
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };
  const handleCloseUserMenu = () => setUserMenuAnchorEl(null);

  const openDialog = useCallback(
    (open: () => void) => {
      const activeElement = document.activeElement;

      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }

      closeMobileMenu();
      open();
    },
    [closeMobileMenu],
  );

  const handleSyncPendingSales = useCallback(async () => {
    const rejectedBefore = saleStoreSelectors.rejectedSalesCount(
      useSaleStore.getState(),
    );
    const syncedCount = await sincronizarVendasPendentes();

    if (syncedCount > 0) {
      showSuccess(
        `${syncedCount} ${syncedCount === 1 ? 'venda sincronizada' : 'vendas sincronizadas'} com sucesso.`,
      );
    }

    const rejectedCount = saleStoreSelectors.rejectedSalesCount(
      useSaleStore.getState(),
    );

    if (rejectedCount > rejectedBefore) {
      showError(
        `${rejectedCount - rejectedBefore} ${rejectedCount - rejectedBefore === 1 ? 'venda foi recusada' : 'vendas foram recusadas'} pelo servidor. Abra as vendas pendentes para revisar.`,
      );
    }
  }, [sincronizarVendasPendentes, showSuccess, showError]);

  const activeQuickSaleDraft = useMemo(
    () =>
      quickSaleDrafts.find((draft) => draft.id === activeQuickSaleDraftId) ??
      null,
    [activeQuickSaleDraftId, quickSaleDrafts],
  );
  const quickSaleDraftToDiscard = useMemo(
    () =>
      quickSaleDrafts.find((draft) => draft.id === quickSaleDraftToDiscardId) ??
      null,
    [quickSaleDraftToDiscardId, quickSaleDrafts],
  );

  const handleOpenNewQuickSaleDraft = useCallback(() => {
    const now = Date.now();
    const nextDraftNumber = quickSaleDraftSequenceRef.current + 1;
    quickSaleDraftSequenceRef.current = nextDraftNumber;
    const id = `quick-sale-${now}-${nextDraftNumber}`;

    setQuickSaleDrafts((current) => [
      ...current,
      {
        id,
        label: `Venda ${nextDraftNumber}`,
        form: createQuickSaleForm(quickSaleDefaultConfig),
      },
    ]);
    setActiveQuickSaleDraftId(id);
  }, [quickSaleDefaultConfig]);

  const openQuickSaleDraft = useCallback(() => {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    closeMobileMenu();
    handleOpenNewQuickSaleDraft();
  }, [closeMobileMenu, handleOpenNewQuickSaleDraft]);

  const layoutActions = useMemo(
    () => ({
      openNewSaleDialog: openQuickSaleDraft,
      openNewProductDialog: () => openDialog(() => setProductDialogOpen(true)),
      openNewCategoryDialog: () =>
        openDialog(() => setCategoryDialogOpen(true)),
      openNewBudgetDialog: () => openDialog(() => setBudgetDialogOpen(true)),
      openNewExpenseDialog: () => openDialog(() => setExpenseDialogOpen(true)),
      openNewWalletDialog: () => openDialog(() => setWalletDialogOpen(true)),
      openCashRegisterDialog: () =>
        openDialog(() => setCashRegisterDialogOpen(true)),
      openWalletTransferDialog: () =>
        openDialog(() => setWalletTransferDialogOpen(true)),
      openPaymentMethodWalletFeeDialog: () =>
        openDialog(() => setPaymentMethodWalletFeeDialogOpen(true)),
      openFairDialog: () => openDialog(() => setFairDialogOpen(true)),
      openNewPlanDialog: () => openDialog(() => setPlanDialogOpen(true)),
      openNewAssinanteDialog: () =>
        openDialog(() => setAssinanteDialogOpen(true)),
      openNewCicloDialog: () => openDialog(() => setCicloDialogOpen(true)),
      openNewKitDialog: () => openDialog(() => setKitDialogOpen(true)),
    }),
    [openDialog, openQuickSaleDraft],
  );

  const commandItems = useMemo<CommandItem[]>(() => {
    const go = (group: string, label: string, path: string, keywords = '') => ({
      id: path,
      group,
      label,
      keywords,
      onSelect: () => navigate(path),
    });

    const administracao = podeAdministrarPermissoes
      ? [
          go(
            'Administração',
            'Permissões de usuários',
            '/administracao/permissoes',
            'acesso papel perfil usuário',
          ),
        ]
      : [];

    return [
      {
        id: 'acao-nova-venda',
        group: 'Ação',
        label: 'Nova venda',
        keywords: 'vender atendimento',
        onSelect: layoutActions.openNewSaleDialog,
      },
      {
        id: 'acao-abertura-caixa',
        group: 'Ação',
        label: 'Abertura de caixa',
        keywords: 'caixa abrir',
        onSelect: layoutActions.openCashRegisterDialog,
      },
      {
        id: 'acao-novo-produto',
        group: 'Ação',
        label: 'Novo produto',
        onSelect: layoutActions.openNewProductDialog,
      },
      {
        id: 'acao-nova-despesa',
        group: 'Ação',
        label: 'Nova despesa',
        keywords: 'gasto',
        onSelect: layoutActions.openNewExpenseDialog,
      },
      {
        id: 'acao-novo-orcamento',
        group: 'Ação',
        label: 'Novo orçamento',
        onSelect: layoutActions.openNewBudgetDialog,
      },
      go('Navegação', 'Início', '/', 'painel dashboard visão geral'),
      go('Vendas', 'Vendas', '/vendas'),
      go('Vendas', 'Feiras', '/vendas/feiras', 'eventos'),
      go('Vendas', 'Preços por feira', '/vendas/precos-feira'),
      go('Produtos', 'Produtos', '/produtos', 'estoque catálogo'),
      go('Produtos', 'Categorias de produtos', '/produtos/categorias'),
      go('Produtos', 'Movimentações de estoque', '/produtos/movimentacoes'),
      go('Orçamentos', 'Orçamentos', '/orcamentos'),
      go('Financeiro', 'Caixas', '/financeiro/caixas'),
      go('Financeiro', 'Carteiras', '/financeiro/carteiras', 'saldo'),
      go('Financeiro', 'Transferências', '/financeiro/transferencias'),
      go('Financeiro', 'Despesas', '/financeiro/despesas'),
      go(
        'Financeiro',
        'Categorias de despesa',
        '/financeiro/categorias-despesa',
      ),
      go(
        'Financeiro',
        'Taxas por meio de pagamento',
        '/financeiro/taxas-meio-pagamento-carteira',
      ),
      go('Consignação', 'Consignações', '/consignacao'),
      go('Consignação', 'Revendedores', '/consignacao/revendedores'),
      go('Assinatura', 'Planos', '/assinatura/planos'),
      go('Assinatura', 'Assinantes', '/assinatura/assinantes'),
      go('Assinatura', 'Ciclos', '/assinatura/ciclos'),
      go('Assinatura', 'Kits mensais', '/assinatura/kits'),
      go('Relatórios', 'Resumo de vendas', '/relatorios/resumo'),
      go(
        'Relatórios',
        'Produtos mais vendidos',
        '/relatorios/produtos-mais-vendidos',
      ),
      go(
        'Relatórios',
        'Valor dos produtos em estoque',
        '/relatorios/valor-produtos-estoque',
      ),
      go('Relatórios', 'Relatório de produção', '/relatorios/producao'),
      go('Relatórios', 'Sugestão de produção', '/relatorios/sugestao-producao'),
      ...administracao,
    ];
  }, [layoutActions, navigate, podeAdministrarPermissoes]);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  useGlobalShortcuts({
    onSearch: openPalette,
    onNewSale: layoutActions.openNewSaleDialog,
  });

  const handleQuickSaleDraftChange = useCallback(
    (form: SaleFormState) => {
      if (!activeQuickSaleDraftId) {
        return;
      }

      const primeiroPagamento = form.pagamentos[0];
      const nextDefaults: QuickSaleDefaults = {
        tipo: form.tipo,
        idFeira: form.idFeira,
        idCarteira: primeiroPagamento?.idCarteira,
        meioPagamento: primeiroPagamento?.meioPagamento,
      };

      setQuickSaleDefaultConfig(nextDefaults);
      saveQuickSaleDefaults(user?.id, nextDefaults);
      setQuickSaleDrafts((current) =>
        current.map((draft) =>
          draft.id === activeQuickSaleDraftId
            ? {
                ...draft,
                form: cloneSaleFormState(form),
              }
            : draft,
        ),
      );
    },
    [activeQuickSaleDraftId, user?.id],
  );

  const handleMinimizeQuickSaleDraft = useCallback(() => {
    setActiveQuickSaleDraftId(null);
  }, []);

  const handleCloseQuickSaleDraft = useCallback(() => {
    if (!activeQuickSaleDraftId) {
      return;
    }

    setQuickSaleDrafts((current) =>
      current.filter((draft) => draft.id !== activeQuickSaleDraftId),
    );
    setActiveQuickSaleDraftId(null);
  }, [activeQuickSaleDraftId]);

  const handleRestoreQuickSaleDraft = useCallback((draftId: string) => {
    setActiveQuickSaleDraftId(draftId);
  }, []);

  const handleAskDiscardQuickSaleDraft = useCallback((draftId: string) => {
    setQuickSaleDraftToDiscardId(draftId);
  }, []);

  const handleDiscardQuickSaleDraft = useCallback(
    (draftId: string) => {
      setQuickSaleDrafts((current) =>
        current.filter((draft) => draft.id !== draftId),
      );

      if (activeQuickSaleDraftId === draftId) {
        setActiveQuickSaleDraftId(null);
      }

      setQuickSaleDraftToDiscardId(null);
    },
    [activeQuickSaleDraftId],
  );

  const pendingSalesCountRef = useRef(pendingSalesCount);

  useEffect(() => {
    pendingSalesCountRef.current = pendingSalesCount;
  }, [pendingSalesCount]);

  // Envia a fila ao abrir o app com conexão e sempre que a conexão volta. O
  // hidrate roda antes (efeito acima) e o estado só reflete a fila depois dele,
  // por isso a leitura vem do banco local e não do contador em memória.
  useEffect(() => {
    if (!isOnline) {
      return;
    }

    let cancelled = false;

    void hydrateOfflineState().then(() => {
      if (!cancelled && pendingSalesCountRef.current > 0) {
        void handleSyncPendingSales();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOnline, hydrateOfflineState, handleSyncPendingSales]);

  // Falhas transitórias (servidor instável, 5xx) não mudam o status de conexão,
  // então a fila é reenviada de tempos em tempos enquanto houver o que enviar.
  const sendablePendingSalesCount = pendingSalesCount - rejectedSalesCount;

  useEffect(() => {
    if (!isOnline || sendablePendingSalesCount <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void handleSyncPendingSales();
    }, PENDING_SALES_RETRY_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isOnline, sendablePendingSalesCount, handleSyncPendingSales]);

  const userInitials = useMemo(() => {
    const source = user?.name?.trim() || user?.login?.trim() || 'U';
    return source.slice(0, 2).toUpperCase();
  }, [user?.login, user?.name]);

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      <Toolbar>
        <Box>
          <BrandLogo
            size={36}
            caption={
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    bgcolor: isOnline ? 'success.main' : 'warning.main',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {isOnline ? 'online' : 'offline'}
                </Typography>
              </Stack>
            }
          />
        </Box>
      </Toolbar>
      <Divider />
      <List
        sx={{
          px: 1.5,
          py: 2,
          flexGrow: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton
            component={NavLink}
            end
            to="/"
            onClick={closeMobileMenu}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              '&&': { pr: 1.5 },
              borderRadius: 2,
              '&.active': getActiveMenuStyles(theme),
              ...(homeSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <HomeOutlined />
            </ListItemIcon>
            <ListItemText
              primary="Início"
              primaryTypographyProps={{ noWrap: true }}
            />
          </ListItemButton>
        </ListItem>

        <ListItem
          disablePadding
          sx={{ mb: 0.5 }}
          secondaryAction={
            <IconButton
              size="small"
              aria-label="Nova venda"
              tabIndex={-1}
              onClick={(event) => {
                event.stopPropagation();
                layoutActions.openNewSaleDialog();
              }}
              sx={{ mr: 3.5, ...MENU_ACTION_BUTTON_SX }}
            >
              <Add fontSize="small" />
            </IconButton>
          }
        >
          <ListItemButton
            onClick={() => toggleMenuSection('vendas')}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              '&&': { pr: 1.5 },
              borderRadius: 2,
              ...(salesSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <SaleIcon />
            </ListItemIcon>
            <ListItemText
              primary="Vendas"
              primaryTypographyProps={{ noWrap: true }}
            />

            {salesMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse
          in={salesMenuOpen}
          timeout="auto"
          unmountOnExit
          component="li"
        >
          <List disablePadding sx={{ pl: 1.5 }}>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/vendas"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Vendas" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/vendas/feiras"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Feiras" />
                <IconButton
                  size="small"
                  aria-label="Nova feira"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    layoutActions.openFairDialog();
                  }}
                  sx={{
                    ...MENU_ACTION_BUTTON_SX,
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/vendas/precos-feira"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Preços por feira" />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        <ListItem
          disablePadding
          sx={{ mb: 0.5 }}
          secondaryAction={
            <IconButton
              size="small"
              aria-label="Novo produto"
              tabIndex={-1}
              onClick={(event) => {
                event.stopPropagation();
                layoutActions.openNewProductDialog();
              }}
              sx={{ mr: 3.5, ...MENU_ACTION_BUTTON_SX }}
            >
              <Add fontSize="small" />
            </IconButton>
          }
        >
          <ListItemButton
            onClick={() => toggleMenuSection('produtos')}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              '&&': { pr: 1.5 },
              borderRadius: 2,
              ...(productsSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <ProductIcon />
            </ListItemIcon>
            <ListItemText
              primary="Produtos"
              primaryTypographyProps={{ noWrap: true }}
            />

            {productsMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse
          in={productsMenuOpen}
          timeout="auto"
          unmountOnExit
          component="li"
        >
          <List disablePadding sx={{ pl: 1.5 }}>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/produtos"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Produtos" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/produtos/categorias"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Categorias" />
                <IconButton
                  size="small"
                  aria-label="Nova categoria"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    layoutActions.openNewCategoryDialog();
                  }}
                  sx={{
                    ...MENU_ACTION_BUTTON_SX,
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>

            {podeListarMovimentacoesEstoque ? (
              <ListItem
                disablePadding
                sx={{ mb: 0.5 }}
                secondaryAction={
                  <IconButton
                    size="small"
                    aria-label="Novo orçamento"
                    tabIndex={-1}
                    onClick={(event) => {
                      event.stopPropagation();
                      layoutActions.openNewBudgetDialog();
                    }}
                    sx={{ mr: 3.5, ...MENU_ACTION_BUTTON_SX }}
                  >
                    <Add fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemButton
                  component={NavLink}
                  end
                  to="/produtos/movimentacoes"
                  onClick={closeMobileMenu}
                  sx={(theme: Theme) => ({
                    borderRadius: 2,
                    '&.active': getActiveSubmenuStyles(theme),
                  })}
                >
                  <ListItemText primary="Movimentações" />
                </ListItemButton>
              </ListItem>
            ) : null}
          </List>
        </Collapse>

        {/* Seção com uma única tela: link direto, sem submenu. */}
        <ListItem
          disablePadding
          sx={{ mt: 1, mb: 0.5 }}
          secondaryAction={
            <IconButton
              size="small"
              aria-label="Novo orçamento"
              tabIndex={-1}
              onClick={(event) => {
                event.stopPropagation();
                layoutActions.openNewBudgetDialog();
              }}
              sx={{ mr: 0.5, ...MENU_ACTION_BUTTON_SX }}
            >
              <Add fontSize="small" />
            </IconButton>
          }
        >
          <ListItemButton
            component={NavLink}
            to="/orcamentos"
            onClick={closeMobileMenu}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              borderRadius: 2,
              '&.active': getActiveMenuStyles(theme),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <RequestQuote />
            </ListItemIcon>
            <ListItemText
              primary="Orçamentos"
              primaryTypographyProps={{ noWrap: true }}
            />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mt: 1, mb: 0.5 }}>
          <ListItemButton
            onClick={() => toggleMenuSection('financeiro')}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              '&&': { pr: 1.5 },
              borderRadius: 2,
              ...(financeSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <Balance />
            </ListItemIcon>
            <ListItemText
              primary="Financeiro"
              primaryTypographyProps={{ noWrap: true }}
            />
            {financeMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse
          in={financeMenuOpen}
          timeout="auto"
          unmountOnExit
          component="li"
        >
          <List disablePadding sx={{ pl: 1.5 }}>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/financeiro/caixas"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Caixas" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/financeiro/carteiras"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Carteiras" />
                <IconButton
                  size="small"
                  aria-label="Nova carteira"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    layoutActions.openNewWalletDialog();
                  }}
                  sx={{
                    ...MENU_ACTION_BUTTON_SX,
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/financeiro/transferencias"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Transferências" />
                <IconButton
                  size="small"
                  aria-label="Nova transferência"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    layoutActions.openWalletTransferDialog();
                  }}
                  sx={{
                    ...MENU_ACTION_BUTTON_SX,
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/financeiro/despesas"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Despesas" />
                <IconButton
                  size="small"
                  aria-label="Nova despesa"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    layoutActions.openNewExpenseDialog();
                  }}
                  sx={{
                    ...MENU_ACTION_BUTTON_SX,
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/financeiro/taxas-meio-pagamento-carteira"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Taxas pagamento" />
                <IconButton
                  size="small"
                  aria-label="Nova taxa de pagamento"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    layoutActions.openPaymentMethodWalletFeeDialog();
                  }}
                  sx={{
                    ...MENU_ACTION_BUTTON_SX,
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/financeiro/categorias-despesa"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Categorias despesa" />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        <ListItem disablePadding sx={{ mt: 1, mb: 0.5 }}>
          <ListItemButton
            onClick={() => toggleMenuSection('assinatura')}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              '&&': { pr: 1.5 },
              borderRadius: 2,
              ...(assinaturaSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <Loyalty />
            </ListItemIcon>
            <ListItemText
              primary="Assinatura"
              primaryTypographyProps={{ noWrap: true }}
            />
            {assinaturaMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse
          in={assinaturaMenuOpen}
          timeout="auto"
          unmountOnExit
          component="li"
        >
          <List disablePadding sx={{ pl: 1.5 }}>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/assinatura/planos"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Planos" />
                <IconButton
                  size="small"
                  aria-label="Novo plano"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    layoutActions.openNewPlanDialog();
                  }}
                  sx={{ ...MENU_ACTION_BUTTON_SX }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/assinatura/assinantes"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Assinantes" />
                <IconButton
                  size="small"
                  aria-label="Novo assinante"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    layoutActions.openNewAssinanteDialog();
                  }}
                  sx={{ ...MENU_ACTION_BUTTON_SX }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/assinatura/ciclos"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Ciclos" />
                <IconButton
                  size="small"
                  aria-label="Novo ciclo"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    layoutActions.openNewCicloDialog();
                  }}
                  sx={{ ...MENU_ACTION_BUTTON_SX }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/assinatura/kits"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Kits mensais" />
                <IconButton
                  size="small"
                  aria-label="Novo kit mensal"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    layoutActions.openNewKitDialog();
                  }}
                  sx={{ ...MENU_ACTION_BUTTON_SX }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        <ListItem disablePadding sx={{ mt: 1, mb: 0.5 }}>
          <ListItemButton
            onClick={() => toggleMenuSection('relatorios')}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              '&&': { pr: 1.5 },
              borderRadius: 2,
              ...(reportsSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <Assessment />
            </ListItemIcon>
            <ListItemText
              primary="Relatórios"
              primaryTypographyProps={{ noWrap: true }}
            />
            {reportsMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse
          in={reportsMenuOpen}
          timeout="auto"
          unmountOnExit
          component="li"
        >
          <List disablePadding sx={{ pl: 1.5 }}>
            <ListItem disablePadding>
              <ListItemButton
                component={NavLink}
                end
                to="/relatorios/resumo"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Resumo" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mt: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/relatorios/produtos-mais-vendidos"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Mais vendidos" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mt: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/relatorios/valor-produtos-estoque"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Valor em estoque" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mt: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/relatorios/producao"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Produção" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mt: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/relatorios/sugestao-producao"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Sugestão produção" />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        <ListItem disablePadding sx={{ mt: 1, mb: 0.5 }}>
          <ListItemButton
            onClick={() => toggleMenuSection('consignacao')}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              '&&': { pr: 1.5 },
              borderRadius: 2,
              ...(consignacaoSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <AssignmentTurnedIn />
            </ListItemIcon>
            <ListItemText
              primary="Consignação"
              primaryTypographyProps={{ noWrap: true }}
            />
            {consignacaoMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse
          in={consignacaoMenuOpen}
          timeout="auto"
          unmountOnExit
          component="li"
        >
          <List disablePadding sx={{ pl: 1.5 }}>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/consignacao"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Consignações" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/consignacao/revendedores"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Revendedores" />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        {podeAdministrarPermissoes ? (
          <ListItem disablePadding sx={{ mt: 1, mb: 0.5 }}>
            <ListItemButton
              component={NavLink}
              to="/administracao/permissoes"
              onClick={closeMobileMenu}
              sx={(theme: Theme) => ({
                ...MENU_ITEM_COMPACT_SX,
                '&&': { pr: 1.5 },
                borderRadius: 2,
                ...(adminSectionActive ? getActiveMenuStyles(theme) : {}),
              })}
            >
              <ListItemIcon sx={MENU_ITEM_ICON_SX}>
                <AdminPanelSettings />
              </ListItemIcon>
              <ListItemText
                primary="Permissões"
                primaryTypographyProps={{ noWrap: true }}
              />
            </ListItemButton>
          </ListItem>
        ) : null}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh', bgcolor: 'transparent' }}>
      <MainLayoutAppBar
        drawerWidth={DRAWER_WIDTH}
        sectionTitle={currentSectionTitle}
        userName={user?.name ?? 'Usuário'}
        userInitials={userInitials}
        hideValues={hideValues}
        pendingSalesCount={pendingSalesCount}
        rejectedSalesCount={rejectedSalesCount}
        isSyncingPendingSales={isSyncingPendingSales}
        onToggleMobileMenu={() => setMobileOpen((current) => !current)}
        onOpenSearch={openPalette}
        onOpenPendingSales={() => setPendingSalesDialogOpen(true)}
        onToggleHideValues={toggleHideValues}
        onOpenCashRegister={layoutActions.openCashRegisterDialog}
        onNewSale={layoutActions.openNewSaleDialog}
        onOpenUserMenu={handleOpenUserMenu}
      />

      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeMobileMenu}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper',
              height: '100%',
              overflow: 'hidden',
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper',
              height: '100%',
              overflow: 'hidden',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Menu
        anchorEl={userMenuAnchorEl}
        open={Boolean(userMenuAnchorEl)}
        onClose={handleCloseUserMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {user?.name ?? 'Usuário'}
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {user?.login ?? 'sem login'}
          </Typography>
        </Box>
        <Divider />
        {/* No celular essas ações saem da barra superior para liberar espaço. */}
        {!isDesktop ? (
          <MenuItem
            onClick={() => {
              toggleHideValues();
              handleCloseUserMenu();
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {hideValues ? (
                <Visibility fontSize="small" />
              ) : (
                <VisibilityOff fontSize="small" />
              )}
            </ListItemIcon>
            <ListItemText
              primary={hideValues ? 'Exibir valores' : 'Ocultar valores'}
            />
          </MenuItem>
        ) : null}
        {!isDesktop ? (
          <MenuItem
            onClick={() => {
              handleCloseUserMenu();
              layoutActions.openCashRegisterDialog();
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <PointOfSale fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Abertura de caixa" />
          </MenuItem>
        ) : null}
        <MenuItem
          onClick={() => {
            toggleColorMode();
            handleCloseUserMenu();
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            {mode === 'light' ? (
              <DarkMode fontSize="small" />
            ) : (
              <LightMode fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText
            primary={
              mode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'
            }
          />
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleCloseUserMenu();
            setEditProfileDialogOpen(true);
          }}
        >
          Alterar cadastro
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleCloseUserMenu();
            void logout();
          }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sair" />
        </MenuItem>
      </Menu>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Box
          sx={{
            height: {
              xs: APP_BAR_HEIGHT.mobile,
              md: APP_BAR_HEIGHT.desktop,
            },
          }}
        />
        <MainLayoutActionsContext.Provider value={layoutActions}>
          <Box
            sx={{
              p: { xs: 2, md: 4 },
              // Reserva espaço para a barra de atendimentos minimizados.
              pb:
                quickSaleDrafts.length > 0 && !activeQuickSaleDraft
                  ? 14
                  : undefined,
            }}
          >
            {children}
          </Box>
        </MainLayoutActionsContext.Provider>
      </Box>

      <NewProductDialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
      />
      <NewCategoryDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
      />
      <NewExpenseDialog
        open={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
      />
      <NewBudgetDialog
        open={budgetDialogOpen}
        onClose={() => setBudgetDialogOpen(false)}
      />
      <PendingSalesDialog
        open={pendingSalesDialogOpen}
        onClose={() => setPendingSalesDialogOpen(false)}
      />
      {activeQuickSaleDraft ? (
        <NewSaleDialog
          key={activeQuickSaleDraft.id}
          draftKey={activeQuickSaleDraft.id}
          initialForm={activeQuickSaleDraft.form}
          open
          onClose={handleCloseQuickSaleDraft}
          onDraftChange={handleQuickSaleDraftChange}
          onMinimize={handleMinimizeQuickSaleDraft}
        />
      ) : null}

      {quickSaleDrafts.length > 0 && !activeQuickSaleDraft ? (
        <Box
          sx={{
            position: 'fixed',
            right: { xs: 12, md: 24 },
            bottom: { xs: 12, md: 24 },
            left: { xs: 12, md: DRAWER_WIDTH + 24 },
            zIndex: (theme) => theme.zIndex.drawer + 2,
            pointerEvents: 'none',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: { xs: 'stretch', md: 'flex-end' },
            }}
          >
            <Box
              sx={{
                maxWidth: { xs: '100%', md: 760 },
                width: { xs: '100%', md: 'auto' },
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 16px 36px rgba(0,0,0,0.42)'
                    : '0 18px 44px rgba(15, 23, 42, 0.18)',
                p: 1,
                pointerEvents: 'auto',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="subtitle2"
                  fontWeight={800}
                  sx={{
                    flexShrink: 0,
                    px: 0.5,
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  Atendimentos
                </Typography>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ flex: 1, minWidth: 0, overflowX: 'auto', pb: 0.25 }}
                >
                  {quickSaleDrafts.map((draft) => {
                    const summary = getQuickSaleDraftSummary(draft.form);

                    return (
                      <Box
                        key={draft.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          flexShrink: 0,
                          maxWidth: 230,
                          border: (theme) =>
                            `1px solid ${theme.palette.divider}`,
                          borderRadius: 2,
                          bgcolor: 'background.default',
                        }}
                      >
                        <Button
                          color="inherit"
                          onClick={() => handleRestoreQuickSaleDraft(draft.id)}
                          sx={{
                            justifyContent: 'flex-start',
                            minWidth: 0,
                            px: 1.25,
                            py: 0.75,
                            textTransform: 'none',
                          }}
                        >
                          <Box sx={{ minWidth: 0, textAlign: 'left' }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              sx={{ display: 'block' }}
                            >
                              {draft.label}
                            </Typography>
                            <Typography variant="body2" fontWeight={800} noWrap>
                              {summary.itemLabel} •{' '}
                              <CurrencyValue value={summary.total} />
                            </Typography>
                          </Box>
                        </Button>

                        <IconButton
                          size="small"
                          aria-label={`Descartar ${draft.label}`}
                          onClick={() =>
                            handleAskDiscardQuickSaleDraft(draft.id)
                          }
                          sx={{ mr: 0.25 }}
                        >
                          <Close fontSize="small" />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Stack>

                {/* Fica fora da área rolável para estar sempre ao alcance. */}
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<AddShoppingCart />}
                  onClick={handleOpenNewQuickSaleDraft}
                  sx={{ flexShrink: 0 }}
                >
                  Nova
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>
      ) : null}

      <Dialog
        open={Boolean(quickSaleDraftToDiscard)}
        onClose={() => setQuickSaleDraftToDiscardId(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Descartar atendimento?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            O rascunho {quickSaleDraftToDiscard?.label.toLowerCase()} será
            removido da lista de atendimentos.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            color="inherit"
            onClick={() => setQuickSaleDraftToDiscardId(null)}
          >
            Cancelar
          </Button>
          <Button
            color="error"
            onClick={() => {
              if (quickSaleDraftToDiscard) {
                handleDiscardQuickSaleDraft(quickSaleDraftToDiscard.id);
              }
            }}
          >
            Descartar
          </Button>
        </DialogActions>
      </Dialog>
      <FairDialog
        open={fairDialogOpen}
        onClose={() => setFairDialogOpen(false)}
      />
      <NewWalletDialog
        open={walletDialogOpen}
        onClose={() => setWalletDialogOpen(false)}
      />
      <CommandPalette
        open={paletteOpen}
        items={commandItems}
        onClose={() => setPaletteOpen(false)}
      />
      <CashRegisterOpeningDialog
        open={cashRegisterDialogOpen}
        onClose={() => setCashRegisterDialogOpen(false)}
      />
      <PaymentMethodWalletFeeDialog
        open={paymentMethodWalletFeeDialogOpen}
        onClose={() => setPaymentMethodWalletFeeDialogOpen(false)}
      />
      <WalletTransferDialog
        open={walletTransferDialogOpen}
        onClose={() => setWalletTransferDialogOpen(false)}
        onSaved={() => undefined}
      />
      <EditProfileDialog
        open={editProfileDialogOpen}
        onClose={() => setEditProfileDialogOpen(false)}
      />
      <NewPlanDialog
        open={planDialogOpen}
        onClose={() => setPlanDialogOpen(false)}
      />
      <NewAssinanteDialog
        open={assinanteDialogOpen}
        onClose={() => setAssinanteDialogOpen(false)}
      />
      <NewCicloDialog
        open={cicloDialogOpen}
        onClose={() => setCicloDialogOpen(false)}
      />
      <NewKitDialog
        open={kitDialogOpen}
        onClose={() => setKitDialogOpen(false)}
      />
      <Snackbar
        open={needsUpdate}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={update}>
              Atualizar
            </Button>
          }
        >
          Nova versão disponível.
        </Alert>
      </Snackbar>
      <GlobalFeedbackSnackbar />
    </Box>
  );
}
