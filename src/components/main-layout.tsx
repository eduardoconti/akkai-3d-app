import { useState, type ReactNode } from 'react';
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
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
import {
  AddBox,
  AddShoppingCart,
  Inventory as ProductIcon,
  Menu as MenuIcon,
  ShoppingCart as SaleIcon,
} from '@mui/icons-material';
import { NavLink } from 'react-router-dom';
import NovaVendaDialog from './nova-venda-dialog';
import NovoProdutoDialog from './novo-produto-dialog';

const drawerWidth = 256;

interface Props {
  children: ReactNode;
}

const navigationItems = [
  { text: 'Vendas', icon: <SaleIcon />, path: '/vendas' },
  { text: 'Produtos', icon: <ProductIcon />, path: '/produtos' },
];

export default function MainLayout({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openVenda, setOpenVenda] = useState(false);
  const [openProduto, setOpenProduto] = useState(false);

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: 'background.paper' }}>
      <Toolbar>
        <Box>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 800 }}>
            AKKAI 3D
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Operação de estoque e vendas
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2 }}>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={NavLink}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 2,
                '&.active': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CssBaseline />

      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen((current) => !current)}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} noWrap>
              Painel Operacional
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              Cadastre produtos e registre vendas com rapidez durante a operação.
            </Typography>
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<AddShoppingCart />}
              size="small"
              onClick={() => setOpenVenda(true)}
            >
              Nova venda
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddBox />}
              size="small"
              onClick={() => setOpenProduto(true)}
            >
              Novo produto
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          px: { xs: 2, md: 4 },
          py: 3,
        }}
      >
        <Toolbar />
        {children}
      </Box>

      <NovaVendaDialog open={openVenda} onClose={() => setOpenVenda(false)} />
      <NovoProdutoDialog open={openProduto} onClose={() => setOpenProduto(false)} />
    </Box>
  );
}
