import type { MouseEvent, ReactNode } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  AddShoppingCart,
  KeyboardArrowDown,
  Menu as MenuIcon,
  PointOfSale,
  Search as SearchIcon,
  Sync,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { APP_BAR_HEIGHT } from './main-layout-constants';

const SYNC_SPIN_SX = {
  animation: 'ak-spin 1s linear infinite',
  '@keyframes ak-spin': {
    to: { transform: 'rotate(360deg)' },
  },
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
  },
} as const;

interface MainLayoutAppBarProps {
  drawerWidth: number;
  sectionTitle: string;
  userName: string;
  userInitials: string;
  hideValues: boolean;
  pendingSalesCount: number;
  rejectedSalesCount: number;
  isSyncingPendingSales: boolean;
  onToggleMobileMenu: () => void;
  onOpenSearch: () => void;
  onOpenPendingSales: () => void;
  onToggleHideValues: () => void;
  onOpenCashRegister: () => void;
  onNewSale: () => void;
  onOpenUserMenu: (event: MouseEvent<HTMLElement>) => void;
}

interface ToolbarActionProps {
  label: string;
  tooltip?: string;
  icon: ReactNode;
  showLabel: boolean;
  onClick: () => void;
}

/**
 * Ação secundária da barra do desktop: botão com texto quando há espaço e,
 * em larguras intermediárias, apenas o ícone com tooltip.
 */
function ToolbarAction({
  label,
  tooltip = label,
  icon,
  showLabel,
  onClick,
}: ToolbarActionProps) {
  if (showLabel) {
    return (
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        startIcon={icon}
        onClick={onClick}
      >
        {label}
      </Button>
    );
  }

  return (
    <Tooltip title={tooltip}>
      <IconButton color="inherit" aria-label={tooltip} onClick={onClick}>
        {icon}
      </IconButton>
    </Tooltip>
  );
}

function UserAvatar({ initials, size }: { initials: string; size: number }) {
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: 13,
        fontWeight: 700,
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
      }}
    >
      {initials}
    </Avatar>
  );
}

export default function MainLayoutAppBar({
  drawerWidth,
  sectionTitle,
  userName,
  userInitials,
  hideValues,
  pendingSalesCount,
  rejectedSalesCount,
  isSyncingPendingSales,
  onToggleMobileMenu,
  onOpenSearch,
  onOpenPendingSales,
  onToggleHideValues,
  onOpenCashRegister,
  onNewSale,
  onOpenUserMenu,
}: MainLayoutAppBarProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true });
  const isWideDesktop = useMediaQuery(theme.breakpoints.up('lg'), {
    noSsr: true,
  });
  const hasPendingSales = pendingSalesCount > 0;
  const hideValuesLabel = hideValues ? 'Exibir valores' : 'Ocultar valores';
  const hideValuesIcon = hideValues ? <Visibility /> : <VisibilityOff />;

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        backdropFilter: 'blur(10px)',
      }}
    >
      {isDesktop ? (
        <Toolbar
          sx={{
            gap: 1.5,
            py: 0,
            minHeight: { md: APP_BAR_HEIGHT.desktop },
            alignItems: 'center',
          }}
        >
          {/* No desktop o título já está no cabeçalho da página; a barra usa o
              espaço para a busca rápida. */}
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<SearchIcon />}
            onClick={onOpenSearch}
            aria-label="Busca rápida (Ctrl+K)"
            sx={{
              width: { md: 220, lg: 340 },
              minWidth: 0,
              justifyContent: 'flex-start',
              color: 'text.secondary',
              fontWeight: 400,
            }}
          >
            <Typography
              component="span"
              noWrap
              sx={{ flexGrow: 1, textAlign: 'left' }}
            >
              Buscar telas e ações…
            </Typography>
            {isWideDesktop ? (
              <Typography
                component="kbd"
                variant="caption"
                sx={{
                  ml: 1,
                  px: 0.75,
                  borderRadius: 1,
                  border: 1,
                  borderColor: 'divider',
                  fontFamily: 'inherit',
                }}
              >
                Ctrl K
              </Typography>
            ) : null}
          </Button>

          <Box sx={{ flexGrow: 1 }} />

          {hasPendingSales ? (
            <Button
              variant="outlined"
              color={rejectedSalesCount > 0 ? 'error' : 'inherit'}
              size="small"
              startIcon={<Sync />}
              onClick={onOpenPendingSales}
              sx={{ flexShrink: 0 }}
            >
              {isSyncingPendingSales
                ? 'Sincronizando...'
                : `Pendentes (${pendingSalesCount})`}
            </Button>
          ) : null}

          <ToolbarAction
            label={hideValuesLabel}
            icon={hideValuesIcon}
            showLabel={isWideDesktop}
            onClick={onToggleHideValues}
          />
          <ToolbarAction
            label="Abertura de caixa"
            icon={<PointOfSale />}
            showLabel={isWideDesktop}
            onClick={onOpenCashRegister}
          />

          <Divider orientation="vertical" flexItem />

          <Button
            variant="contained"
            startIcon={<AddShoppingCart />}
            onClick={onNewSale}
            sx={{ flexShrink: 0 }}
          >
            Nova venda
          </Button>

          <Button
            color="inherit"
            onClick={onOpenUserMenu}
            aria-label="Abrir menu do usuário"
            endIcon={<KeyboardArrowDown fontSize="small" />}
            sx={{
              flexShrink: 0,
              gap: 1,
              borderRadius: 999,
              px: 1,
              minWidth: 0,
            }}
          >
            <UserAvatar initials={userInitials} size={34} />
            {isWideDesktop ? userName : null}
          </Button>
        </Toolbar>
      ) : (
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ height: APP_BAR_HEIGHT.mobile, px: 1, minWidth: 0 }}
        >
          <IconButton
            color="inherit"
            aria-label="Abrir menu de navegação"
            onClick={onToggleMobileMenu}
            sx={{ flexShrink: 0 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography
            variant="subtitle1"
            noWrap
            sx={{ flexGrow: 1, minWidth: 0, fontWeight: 800 }}
          >
            {sectionTitle}
          </Typography>

          {hasPendingSales ? (
            <IconButton
              color="inherit"
              onClick={onOpenPendingSales}
              aria-label={`Vendas pendentes: ${pendingSalesCount}`}
              sx={{ flexShrink: 0 }}
            >
              <Badge
                badgeContent={pendingSalesCount}
                color={rejectedSalesCount > 0 ? 'error' : 'warning'}
              >
                <Sync sx={isSyncingPendingSales ? SYNC_SPIN_SX : undefined} />
              </Badge>
            </IconButton>
          ) : null}

          <IconButton
            color="inherit"
            aria-label="Busca rápida"
            onClick={onOpenSearch}
            sx={{ flexShrink: 0 }}
          >
            <SearchIcon />
          </IconButton>

          <IconButton
            onClick={onNewSale}
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
            onClick={onOpenUserMenu}
            aria-label="Abrir menu do usuário"
            sx={{ flexShrink: 0, p: 0.5 }}
          >
            <UserAvatar initials={userInitials} size={32} />
          </IconButton>
        </Stack>
      )}
    </AppBar>
  );
}
