import { useMemo, useState, type MouseEvent } from 'react';
import { Badge, IconButton, Popover, Tooltip } from '@mui/material';
import { Notifications, NotificationsNone } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { isNotificationsDataStale } from '@/features/notifications/store/use-notifications-polling';
import { useNotificationsStore } from '@/features/notifications/store/use-notifications-store';
import { isAlertDismissed } from '@/features/notifications/utils/dismissed-alerts';
import NotificationsPanel from './notifications-panel';

/** Ao abrir o painel, busca de novo se a lista tiver mais de 30 s. */
const OPEN_REFRESH_MS = 30 * 1000;

export default function NotificationsButton() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const {
    alertas,
    dismissed,
    isFetching,
    hasFetchError,
    lastFetchedAt,
    fetchAlertas,
    dismissAlerta,
    restoreDismissed,
  } = useNotificationsStore(
    useShallow((state) => ({
      alertas: state.alertas,
      dismissed: state.dismissed,
      isFetching: state.isFetching,
      hasFetchError: state.hasFetchError,
      lastFetchedAt: state.lastFetchedAt,
      fetchAlertas: state.fetchAlertas,
      dismissAlerta: state.dismissAlerta,
      restoreDismissed: state.restoreDismissed,
    })),
  );
  const visibleAlertas = useMemo(
    () => alertas.filter((alerta) => !isAlertDismissed(alerta, dismissed)),
    [alertas, dismissed],
  );
  const dismissedCount = alertas.length - visibleAlertas.length;
  const count = visibleAlertas.length;
  const hasCritical = visibleAlertas.some(
    (alerta) => alerta.severidade === 'CRITICO',
  );
  const label =
    count === 0
      ? 'Notificações'
      : `Notificações: ${count} ${count === 1 ? 'alerta' : 'alertas'}`;

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);

    if (isNotificationsDataStale(lastFetchedAt, OPEN_REFRESH_MS)) {
      void fetchAlertas();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    setAnchorEl(null);
    void navigate(path);
  };

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton
          color="inherit"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={anchorEl ? 'true' : undefined}
          onClick={handleOpen}
          sx={{ flexShrink: 0 }}
        >
          <Badge
            badgeContent={count}
            color={hasCritical ? 'error' : 'warning'}
            max={9}
          >
            {count > 0 ? <Notifications /> : <NotificationsNone />}
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-label': 'Notificações',
            sx: {
              width: 'min(380px, calc(100vw - 32px))',
              maxHeight: 'min(560px, calc(100vh - 96px))',
              overflowY: 'auto',
              mt: 1,
            },
          },
        }}
      >
        <NotificationsPanel
          alertas={visibleAlertas}
          dismissedCount={dismissedCount}
          isFetching={isFetching}
          hasFetchError={hasFetchError}
          onNavigate={handleNavigate}
          onDismiss={dismissAlerta}
          onRestoreDismissed={restoreDismissed}
          onRefresh={() => void fetchAlertas()}
        />
      </Popover>
    </>
  );
}
