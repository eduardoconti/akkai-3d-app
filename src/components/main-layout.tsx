import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  Stack,
  Button,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashIcon,
  ShoppingCart as SaleIcon,
  Inventory as ProductIcon,
  AddBox,
  AddShoppingCart,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import NovaVendaDialog from './nova-venda-dialog';
import NovoProdutoDialog from './novo-produto-dialog';

const drawerWidth = 240;

interface Props {
  children: React.ReactNode;
}

export default function MainLayout({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openVenda, setOpenVenda] = useState(false);
  const [openProduto, setOpenProduto] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar>
        <Typography
          variant="h6"
          sx={{ fontWeight: 'bold', color: 'primary.main' }}
        >
          AKKAI 3D
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {[
          { text: 'Dashboard', icon: <DashIcon />, path: '/' },
          { text: 'Vendas', icon: <SaleIcon />, path: '/vendas' },
          { text: 'Produtos', icon: <ProductIcon />, path: '/produtos' },
        ].map((item) => (
          <ListItem key={item.text} disablePadding>
            {/* Adicione o componente Link e o atributo to */}
            <ListItemButton component={Link} to={item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* CABEÇALHO */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Botões de Ação Rápida à Esquerda */}
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              startIcon={<AddShoppingCart />}
              size="small"
              onClick={() => setOpenVenda(true)} // ABRE O MODAL
            >
              Venda
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddBox />}
              size="small"
              onClick={() => setOpenProduto(true)}
            >
              Produto
            </Button>
          </Stack>

          {/* Espaçador para empurrar qualquer item futuro para a direita */}
          <Box sx={{ flexGrow: 1 }} />
        </Toolbar>
      </AppBar>

      {/* MENU LATERAL (Drawer) */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* CENTRO (Área das Páginas) */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: '#f5f5f5', // Fundo levemente cinza para destacar os cards brancos
        }}
      >
        {/* Spacer para o conteúdo não ficar embaixo da AppBar */}
        <Toolbar />

        {children}
        <NovaVendaDialog
          open={openVenda}
          onClose={() => setOpenVenda(false)}
          //key={openVenda ? 'aberto' : 'fechado'}
        />
        <NovoProdutoDialog
          open={openProduto}
          onClose={() => setOpenProduto(false)}
        />
      </Box>
    </Box>
  );
}
