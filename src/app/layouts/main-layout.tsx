import { useMemo, useState, type ReactNode } from 'react';
import {
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
  DarkMode,
  ExpandLess,
  ExpandMore,
  FormatListBulleted,
  Inventory as ProductIcon,
  LightMode,
  LocalFireDepartment,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  PostAdd,
  ShoppingCart as SaleIcon,
} from '@mui/icons-material';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { NewExpenseDialog, NewWalletDialog } from '@/features/finance';
import { NewCategoryDialog, NewProductDialog } from '@/features/products';
import { NewSaleDialog } from '@/features/sales';
import { GlobalFeedbackSnackbar } from '@/shared';
import {
  getActiveMenuStyles,
  getActiveSubmenuStyles,
} from '@/theme/theme';
import { useThemeMode } from '@/theme/use-theme-mode';

const DRAWER_WIDTH = 256;

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { mode, toggleColorMode } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [financeMenuOpen, setFinanceMenuOpen] = useState(true);
  const [productsMenuOpen, setProductsMenuOpen] = useState(true);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(true);

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
                to="/produtos"
                onClick={closeMobileMenu}
                sx={(theme: Theme) => ({
                  borderRadius: 2,
                  '&.active': getActiveSubmenuStyles(theme),
                })}
              >
                <ListItemIcon>
                  <FormatListBulleted fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Listar" />
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
                  <Balance fontSize="small" />
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
                  <AttachMoney fontSize="small" />
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
                  <LocalFireDepartment fontSize="small" />
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
        <Toolbar
          sx={{
            gap: 1.5,
            py: { xs: 1, md: 0 },
            minHeight: { xs: 72, md: 64 },
            alignItems: { xs: 'flex-start', md: 'center' },
            flexWrap: { xs: 'wrap', md: 'nowrap' },
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((current) => !current)}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Stack
            spacing={0.25}
            sx={{ minWidth: 0, flexGrow: 1, pr: { xs: 1, md: 0 } }}
          >
            <Typography variant="h6" fontWeight={800} noWrap={false}>
              Painel Operacional
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              Cadastre produtos e registre vendas com rapidez durante a
              operação.
            </Typography>
          </Stack>

          <Stack
            spacing={0}
            sx={{
              display: { xs: 'none', lg: 'flex' },
              minWidth: 0,
              ml: 'auto',
            }}
          >
            <Typography variant="body2" fontWeight={700} noWrap>
              {user?.name ?? 'Usuário'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {user?.email ?? ''}
            </Typography>
          </Stack>

          <IconButton
            color="inherit"
            onClick={toggleColorMode}
            aria-label={
              mode === 'light'
                ? 'Ativar modo escuro'
                : 'Ativar modo claro'
            }
          >
            {mode === 'light' ? <DarkMode /> : <LightMode />}
          </IconButton>

          <Stack
            direction="row"
            spacing={1}
            sx={{
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'space-between', sm: 'flex-end' },
              alignItems: 'center',
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddShoppingCart />}
              size="small"
              onClick={() => openDialog(() => setSaleDialogOpen(true))}
              sx={{ flexShrink: 0 }}
            >
              Nova venda
            </Button>

            <Button
              variant="text"
              color="inherit"
              startIcon={<LogoutIcon />}
              size="small"
              onClick={() => {
                void logout();
              }}
              sx={{ flexShrink: 0 }}
            >
              Sair
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { xs: 0, md: DRAWER_WIDTH }, flexShrink: 0 }}
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
              borderRight: '1px solid',
              borderColor: 'divider',
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
          minWidth: 0,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          overflowX: 'hidden',
          px: { xs: 1.5, sm: 2, md: 4 },
          py: { xs: 2, md: 3 },
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 88, sm: 96, md: 64 } }} />
        {children}
      </Box>

      <NewSaleDialog
        open={saleDialogOpen}
        onClose={() => setSaleDialogOpen(false)}
      />
      <NewProductDialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
      />
      <NewWalletDialog
        open={walletDialogOpen}
        onClose={() => setWalletDialogOpen(false)}
      />
      <NewExpenseDialog
        open={expenseDialogOpen}
        onClose={() => setExpenseDialogOpen(false)}
      />
      <NewCategoryDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
      />
      <GlobalFeedbackSnackbar />
    </Box>
  );
}
