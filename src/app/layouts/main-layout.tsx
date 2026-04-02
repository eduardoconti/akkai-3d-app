import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AppBar,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import { type Theme } from '@mui/material/styles';
import {
  AddShoppingCart,
  Assessment,
  AttachMoney,
  Balance,
  Category as CategoryIcon,
  CloudOff,
  CloudQueue,
  DarkMode,
  ExpandLess,
  ExpandMore,
  FormatListBulleted,
  Inventory as ProductIcon,
  LightMode,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  PostAdd,
  ShoppingCart as SaleIcon,
  Sync,
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { NewExpenseDialog, NewWalletDialog } from '@/features/finance';
import { NewCategoryDialog, NewProductDialog } from '@/features/products';
import { NewSaleDialog, useSaleStore } from '@/features/sales';
import {
  GlobalFeedbackSnackbar,
  useFeedbackStore,
  useOnlineStatus,
} from '@/shared';
import { getActiveMenuStyles, getActiveSubmenuStyles } from '@/theme/theme';
import { useThemeMode } from '@/theme/use-theme-mode';

const DRAWER_WIDTH = 256;
const MOBILE_APPBAR_MIN_HEIGHT = 96;

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { mode, toggleColorMode } = useThemeMode();
  const isOnline = useOnlineStatus();
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const {
    hydrateOfflineState,
    isSyncingPendingSales,
    pendingSalesCount,
    sincronizarVendasPendentes,
  } = useSaleStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(true);
  const [productsMenuOpen, setProductsMenuOpen] = useState(true);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(true);

  useEffect(() => {
    void hydrateOfflineState();
  }, [hydrateOfflineState]);

  const productsSectionActive = useMemo(
    () => location.pathname.startsWith('/produtos'),
    [location.pathname],
  );
  const reportsSectionActive = useMemo(
    () => location.pathname.startsWith('/relatorios'),
    [location.pathname],
  );
  const financeSectionActive = useMemo(
    () => location.pathname.startsWith('/financeiro'),
    [location.pathname],
  );

  const closeMobileMenu = () => setMobileOpen(false);

  const openDialog = (open: () => void) => {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    closeMobileMenu();
    open();
  };

  const handleSyncPendingSales = async () => {
    const syncedCount = await sincronizarVendasPendentes();

    if (syncedCount > 0) {
      showSuccess(
        `${syncedCount} ${syncedCount === 1 ? 'venda sincronizada' : 'vendas sincronizadas'} com sucesso.`,
      );
    }
  };

  const drawerContent = (
    <Box sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <Toolbar>
        <Box>
          <Typography
            variant="h6"
            sx={{ color: 'primary.main', fontWeight: 900 }}
          >
            AKKAI 3D
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Operação de estoque e vendas
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2 }}>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            component={NavLink}
            to="/vendas"
            onClick={closeMobileMenu}
            sx={(theme: Theme) => ({
              borderRadius: 2,
              '&.active': getActiveMenuStyles(theme),
            })}
          >
            <ListItemIcon>
              <SaleIcon />
            </ListItemIcon>
            <ListItemText primary="Vendas" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemButton
            onClick={() => setProductsMenuOpen((current) => !current)}
            sx={(theme: Theme) => ({
              borderRadius: 2,
              ...(productsSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon>
              <ProductIcon />
            </ListItemIcon>
            <ListItemText primary="Produtos" />
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
                <ListItemIcon>
                  <FormatListBulleted fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Produtos" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  openDialog(() => setProductDialogOpen(true));
                }}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon>
                  <PostAdd fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Novo produto" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                to="/produtos/categorias"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  "&.active": getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemIcon>
                  <FormatListBulleted fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Categorias" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  openDialog(() => setCategoryDialogOpen(true));
                }}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon>
                  <CategoryIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Nova categoria" />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        <ListItem disablePadding sx={{ mt: 1, mb: 0.5 }}>
          <ListItemButton
            onClick={() => setFinanceMenuOpen((current) => !current)}
            sx={(theme: Theme) => ({
              borderRadius: 2,
              ...(financeSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon>
              <Balance />
            </ListItemIcon>
            <ListItemText primary="Financeiro" />
            {financeMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={financeMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1.5 }}>
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                to="/financeiro/carteiras"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemIcon>
                  <FormatListBulleted fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Carteiras" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  openDialog(() => setWalletDialogOpen(true));
                }}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon>
                  <Balance fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Nova carteira" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                to="/financeiro/despesas"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemIcon>
                  <FormatListBulleted fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Despesas" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton
                onClick={() => {
                  openDialog(() => setExpenseDialogOpen(true));
                }}
                sx={{ borderRadius: 2 }}
              >
                <ListItemIcon>
                  <AttachMoney fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Nova despesa" />
              </ListItemButton>
            </ListItem>
          </List>
        </Collapse>

        <ListItem disablePadding sx={{ mt: 1, mb: 0.5 }}>
          <ListItemButton
            onClick={() => setReportsMenuOpen((current) => !current)}
            sx={(theme: Theme) => ({
              borderRadius: 2,
              ...(reportsSectionActive ? getActiveMenuStyles(theme) : {}),
            })}
          >
            <ListItemIcon>
              <Assessment />
            </ListItemIcon>
            <ListItemText primary="Relatórios" />
            {reportsMenuOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>

        <Collapse in={reportsMenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 1.5 }}>
            <ListItem disablePadding>
              <ListItemButton
                component={NavLink}
                to="/relatorios/produtos-mais-vendidos"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemIcon>
                  <FormatListBulleted fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Mais vendidos" />
              </ListItemButton>
            </ListItem>

            <ListItem disablePadding sx={{ mt: 0.5 }}>
              <ListItemButton
                component={NavLink}
                to="/relatorios/resumo"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemIcon>
                  <FormatListBulleted fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Resumo" />
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
          borderBottom: '1px solid',
          borderColor: 'divider',
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
              Painel Operacional
            </Typography>

            <Chip
              icon={isOnline ? <CloudQueue /> : <CloudOff />}
              label=""
              color={isOnline ? 'success' : 'warning'}
              variant="outlined"
              size="small"
              sx={{
                flexShrink: 0,
                '& .MuiChip-label': { display: 'none' },
                '& .MuiChip-icon': { mr: 0 },
                width: 34,
              }}
            />

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

            <IconButton
              color="inherit"
              onClick={toggleColorMode}
              aria-label={
                mode === 'light'
                  ? 'Ativar modo escuro'
                  : 'Ativar modo claro'
              }
              sx={{ flexShrink: 0 }}
            >
              {mode === 'light' ? <DarkMode /> : <LightMode />}
            </IconButton>

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

            <IconButton
              color="inherit"
              onClick={() => {
                void logout();
              }}
              aria-label="Sair"
              sx={{ flexShrink: 0 }}
            >
              <LogoutIcon />
            </IconButton>
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
              Painel Operacional
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cadastre produtos e registre vendas com rapidez durante a
              operação.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" useFlexGap>
            <Chip
              icon={isOnline ? <CloudQueue /> : <CloudOff />}
              label={isOnline ? 'Online' : 'Offline'}
              color={isOnline ? 'success' : 'warning'}
              variant="outlined"
            />

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
          </Stack>

          <Stack spacing={0} sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {user?.name ?? 'Usuário'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.email ?? 'sem e-mail'}
            </Typography>
          </Stack>

          <IconButton
            color="inherit"
            onClick={toggleColorMode}
            aria-label={
              mode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'
            }
          >
            {mode === 'light' ? <DarkMode /> : <LightMode />}
          </IconButton>

          <Button
            variant="contained"
            startIcon={<AddShoppingCart />}
            onClick={() => openDialog(() => setSaleDialogOpen(true))}
          >
            Nova venda
          </Button>
          <Button
            variant="text"
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={() => {
              void logout();
            }}
          >
            Sair
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
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

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
      <NewSaleDialog
        open={saleDialogOpen}
        onClose={() => setSaleDialogOpen(false)}
      />
      <NewWalletDialog
        open={walletDialogOpen}
        onClose={() => setWalletDialogOpen(false)}
      />
      <GlobalFeedbackSnackbar />
    </Box>
  );
}
