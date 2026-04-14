import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  Avatar,
  AppBar,
  Box,
  Button,
  Collapse,
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
} from '@mui/material';
import { type Theme } from '@mui/material/styles';
import {
  Add,
  AddShoppingCart,
  Assessment,
  Balance,
  DarkMode,
  ExpandLess,
  ExpandMore,
  HomeOutlined,
  Inventory as ProductIcon,
  KeyboardArrowDown,
  LightMode,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  RequestQuote,
  ShoppingCart as SaleIcon,
  Sync,
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { EditProfileDialog, useAuth } from '@/features/auth';
import { NewBudgetDialog } from '@/features/budgets';
import { NewExpenseDialog, NewWalletDialog } from '@/features/finance';
import { NewCategoryDialog, NewProductDialog } from '@/features/products';
import { FairDialog, NewSaleDialog, useSaleStore } from '@/features/sales';
import { saleStoreSelectors } from '@/features/sales/store/use-sale-store';
import {
  GlobalFeedbackSnackbar,
  useFeedbackStore,
  useOnlineStatus,
  useSwUpdate,
} from '@/shared';
import { getActiveMenuStyles, getActiveSubmenuStyles } from '@/theme/theme';
import { useThemeMode } from '@/theme/use-theme-mode';
import { useShallow } from 'zustand/react/shallow';

const DRAWER_WIDTH = 256;
const MOBILE_APPBAR_MIN_HEIGHT = 96;
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
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 2,
  bgcolor: 'background.default',
  boxShadow: (theme: Theme) =>
    theme.palette.mode === 'dark'
      ? '0 4px 10px rgba(0,0,0,0.28)'
      : '0 6px 14px rgba(15, 23, 42, 0.12)',
  '&:hover': {
    bgcolor: 'action.hover',
  },
};

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { mode, toggleColorMode } = useThemeMode();
  const isOnline = useOnlineStatus();
  const { needsUpdate, update } = useSwUpdate();
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const {
    hydrateOfflineState,
    isSyncingPendingSales,
    pendingSalesCount,
    sincronizarVendasPendentes,
  } = useSaleStore(
    useShallow((state) => ({
      hydrateOfflineState: saleStoreSelectors.hydrateOfflineState(state),
      isSyncingPendingSales: saleStoreSelectors.isSyncingPendingSales(state),
      pendingSalesCount: saleStoreSelectors.pendingSalesCount(state),
      sincronizarVendasPendentes:
        saleStoreSelectors.sincronizarVendasPendentes(state),
    })),
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [fairDialogOpen, setFairDialogOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [budgetsMenuOpen, setBudgetsMenuOpen] = useState(true);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(true);
  const [productsMenuOpen, setProductsMenuOpen] = useState(true);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(true);
  const [salesMenuOpen, setSalesMenuOpen] = useState(true);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<HTMLElement | null>(
    null,
  );

  useEffect(() => {
    void hydrateOfflineState();
  }, [hydrateOfflineState]);

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
  const reportsSectionActive = useMemo(
    () => location.pathname.startsWith('/relatorios'),
    [location.pathname],
  );
  const budgetsSectionActive = useMemo(
    () => location.pathname.startsWith('/orcamentos'),
    [location.pathname],
  );
  const financeSectionActive = useMemo(
    () => location.pathname.startsWith('/financeiro'),
    [location.pathname],
  );
  const currentSectionTitle = useMemo(() => {
    if (location.pathname === '/') {
      return 'Início';
    }

    if (location.pathname.startsWith('/vendas')) {
      return 'Vendas';
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

    if (location.pathname.startsWith('/relatorios')) {
      return 'Relatórios';
    }

    return 'Painel Operacional';
  }, [location.pathname]);

  const closeMobileMenu = () => setMobileOpen(false);
  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };
  const handleCloseUserMenu = () => setUserMenuAnchorEl(null);

  const openDialog = (open: () => void) => {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    closeMobileMenu();
    open();
  };

  const handleSyncPendingSales = useCallback(async () => {
    const syncedCount = await sincronizarVendasPendentes();

    if (syncedCount > 0) {
      showSuccess(
        `${syncedCount} ${syncedCount === 1 ? 'venda sincronizada' : 'vendas sincronizadas'} com sucesso.`,
      );
    }
  }, [sincronizarVendasPendentes, showSuccess]);

  const prevIsOnlineRef = useRef(isOnline);
  const pendingSalesCountRef = useRef(pendingSalesCount);

  useEffect(() => {
    pendingSalesCountRef.current = pendingSalesCount;
  }, [pendingSalesCount]);

  useEffect(() => {
    const wasOnline = prevIsOnlineRef.current;
    prevIsOnlineRef.current = isOnline;

    if (isOnline && !wasOnline && pendingSalesCountRef.current > 0) {
      void handleSyncPendingSales();
    }
  }, [isOnline, handleSyncPendingSales]);

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
      }}>
      <Toolbar>
        <Box>
          <Typography
            variant="h6"
            sx={{ color: 'primary.main', fontWeight: 900 }}
          >
            AKKAI 3D
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: isOnline ? 'success.main' : 'warning.main',
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {isOnline ? 'online' : 'offline'}
            </Typography>
          </Stack>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flexGrow: 1, minHeight: 0, overflowY: 'auto' }}>
        <ListItem disablePadding sx={{ mb: 1 }}>
          <ListItemButton
            component={NavLink}
            end
            to="/"
            onClick={closeMobileMenu}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              borderRadius: 2,
              '&.active': getActiveMenuStyles(theme),
              ...(homeSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <HomeOutlined />
            </ListItemIcon>
            <ListItemText primary="Início" primaryTypographyProps={{ noWrap: true }} />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => setSalesMenuOpen((current) => !current)}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              borderRadius: 2,
              ...(salesSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <SaleIcon />
            </ListItemIcon>
            <ListItemText primary="Vendas" primaryTypographyProps={{ noWrap: true }} />
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                openDialog(() => setSaleDialogOpen(true));
              }}
              sx={{
                mr: 0.5,
                ...MENU_ACTION_BUTTON_SX,
              }}
            >
              <Add fontSize="small" />
            </IconButton>
            {salesMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={salesMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1.5 }}>
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
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openDialog(() => setFairDialogOpen(true));
                  }}
                  sx={{
                    ...MENU_ACTION_BUTTON_SX,
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => setProductsMenuOpen((current) => !current)}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              borderRadius: 2,
              ...(productsSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <ProductIcon />
            </ListItemIcon>
            <ListItemText primary="Produtos" primaryTypographyProps={{ noWrap: true }} />
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                openDialog(() => setProductDialogOpen(true));
              }}
              sx={{
                mr: 0.5,
                ...MENU_ACTION_BUTTON_SX,
              }}
            >
              <Add fontSize="small" />
            </IconButton>
            {productsMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={productsMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1.5 }}>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/produtos"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  "&.active": getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Produtos" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/produtos/estoque"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  "&.active": getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Estoque" />
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
                  "&.active": getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Categorias" />
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openDialog(() => setCategoryDialogOpen(true));
                  }}
                  sx={{
                    ...MENU_ACTION_BUTTON_SX,
                  }}
                >
                  <Add fontSize="small" />
                </IconButton>
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        <ListItem disablePadding sx={{ mt: 1, mb: 0.5 }}>
          <ListItemButton
            onClick={() => setBudgetsMenuOpen((current) => !current)}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              borderRadius: 2,
              ...(budgetsSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <RequestQuote />
            </ListItemIcon>
            <ListItemText
              primary="Orçamentos"
              primaryTypographyProps={{ noWrap: true }}
            />
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                openDialog(() => setBudgetDialogOpen(true));
              }}
              sx={{
                mr: 0.5,
                ...MENU_ACTION_BUTTON_SX,
              }}
            >
              <Add fontSize="small" />
            </IconButton>
            {budgetsMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={budgetsMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1.5 }}>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                end
                to="/orcamentos"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemText primary="Orçamentos" />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        <ListItem disablePadding sx={{ mt: 1, mb: 0.5 }}>
          <ListItemButton
            onClick={() => setFinanceMenuOpen((current) => !current)}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              borderRadius: 2,
              ...(financeSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <Balance />
            </ListItemIcon>
            <ListItemText primary="Financeiro" primaryTypographyProps={{ noWrap: true }} />
            {financeMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={financeMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1.5 }}>
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
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openDialog(() => setWalletDialogOpen(true));
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
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openDialog(() => setExpenseDialogOpen(true));
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
            onClick={() => setReportsMenuOpen((current) => !current)}
            sx={(theme: Theme) => ({
              ...MENU_ITEM_COMPACT_SX,
              borderRadius: 2,
              ...(reportsSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon sx={MENU_ITEM_ICON_SX}>
              <Assessment />
            </ListItemIcon>
            <ListItemText primary="Relatórios" primaryTypographyProps={{ noWrap: true }} />
            {reportsMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={reportsMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1.5 }}>
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
          </List>
        </Collapse>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'transparent' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box
          sx={{
            display: { xs: 'block', md: 'none' },
            px: 2,
            py: 1,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.5}
            sx={{ minWidth: 0, flexWrap: 'nowrap' }}
          >
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen((current) => !current)}
              sx={{ ml: -1, flexShrink: 0 }}
            >
              <MenuIcon />
            </IconButton>

            <Typography
              variant="subtitle1"
              noWrap
              sx={{ flexGrow: 1, minWidth: 0, fontWeight: 800 }}
            >
              {currentSectionTitle}
            </Typography>

            {pendingSalesCount > 0 ? (
              <IconButton
                color="inherit"
                onClick={() => {
                  void handleSyncPendingSales();
                }}
                disabled={!isOnline || isSyncingPendingSales}
                size="small"
                aria-label={
                  isSyncingPendingSales
                    ? 'Sincronizando vendas'
                    : `Sincronizar ${pendingSalesCount} vendas`
                }
                sx={{ flexShrink: 0 }}
              >
                <Sync />
              </IconButton>
            ) : null}

            <Divider orientation="vertical" flexItem />

            <IconButton
              onClick={() => openDialog(() => setSaleDialogOpen(true))}
              aria-label="Nova venda"
              sx={{
                flexShrink: 0,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <AddShoppingCart />
            </IconButton>

            <Divider orientation="vertical" flexItem />

            <Button
              color="inherit"
              onClick={handleOpenUserMenu}
              aria-label="Abrir menu do usuário"
              endIcon={<KeyboardArrowDown fontSize="small" />}
              sx={{
                flexShrink: 0,
                borderRadius: 999,
                px: 1,
                minWidth: 0,
                textTransform: 'none',
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: 13,
                  fontWeight: 700,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  mr: 1,
                }}
              >
                {userInitials}
              </Avatar>
              {user?.name ?? 'Usuário'}
            </Button>
          </Stack>
        </Box>

        <Toolbar
          sx={{
            display: { xs: 'none', md: 'flex' },
            gap: 1.5,
            py: 0,
            minHeight: 64,
            alignItems: 'center',
          }}
        >
          <Stack spacing={0.25} sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={800}>
              {currentSectionTitle}
            </Typography>
          </Stack>

          {pendingSalesCount > 0 ? (
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<Sync />}
              onClick={() => {
                void handleSyncPendingSales();
              }}
              disabled={!isOnline || isSyncingPendingSales}
            >
              {isSyncingPendingSales
                ? 'Sincronizando...'
                : `Sincronizar ${pendingSalesCount}`}
            </Button>
          ) : null}

          <Divider orientation="vertical" flexItem />

          <Button
            variant="contained"
            startIcon={<AddShoppingCart />}
            onClick={() => openDialog(() => setSaleDialogOpen(true))}
          >
            Nova venda
          </Button>

          <Divider orientation="vertical" flexItem />

          <Button
            color="inherit"
            onClick={handleOpenUserMenu}
            aria-label="Abrir menu do usuário"
            endIcon={<KeyboardArrowDown fontSize="small" />}
            sx={{
              borderRadius: 999,
              px: 1,
              minWidth: 0,
              textTransform: 'none',
            }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: 13,
                fontWeight: 700,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                mr: 1,
              }}
            >
              {userInitials}
            </Avatar>
            {user?.name ?? 'Usuário'}
          </Button>
        </Toolbar>
      </AppBar>

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
            primary={mode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
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
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Box sx={{ height: { xs: `${MOBILE_APPBAR_MIN_HEIGHT}px`, md: 64 } }} />
        <Box sx={{ p: { xs: 2, md: 4 } }}>{children}</Box>
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
      <NewSaleDialog
        open={saleDialogOpen}
        onClose={() => setSaleDialogOpen(false)}
      />
      <FairDialog
        open={fairDialogOpen}
        onClose={() => setFairDialogOpen(false)}
      />
      <NewWalletDialog
        open={walletDialogOpen}
        onClose={() => setWalletDialogOpen(false)}
      />
      <EditProfileDialog
        open={editProfileDialogOpen}
        onClose={() => setEditProfileDialogOpen(false)}
      />
      <Snackbar open={needsUpdate} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
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
