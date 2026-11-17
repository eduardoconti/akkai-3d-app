import { Fragment } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ErrorOutline,
  NotificationsNone,
  Refresh,
  WarningAmber,
} from '@mui/icons-material';
import {
  formatRelativeTime,
  getAlertDestination,
  getAlertItemDestination,
} from '@/features/notifications/utils/alert-presentation';
import type { Alerta } from '@/shared/lib/types/domain';

interface NotificationsPanelProps {
  alertas: Alerta[];
  dismissedCount: number;
  isFetching: boolean;
  hasFetchError: boolean;
  now?: number;
  onNavigate: (path: string) => void;
  onDismiss: (alerta: Alerta) => void;
  onRestoreDismissed: () => void;
  onRefresh: () => void;
}

function AlertCard({
  alerta,
  now,
  onNavigate,
  onDismiss,
}: {
  alerta: Alerta;
  now?: number;
  onNavigate: (path: string) => void;
  onDismiss: (alerta: Alerta) => void;
}) {
  const isCritical = alerta.severidade === 'CRITICO';
  const color = isCritical ? 'error.main' : 'warning.main';
  const hiddenCount = alerta.quantidade - alerta.itens.length;

  return (
    <Box component="li" sx={{ listStyle: 'none', px: 2, py: 1.5 }}>
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        {isCritical ? (
          <ErrorOutline sx={{ color, mt: 0.25 }} aria-hidden />
        ) : (
          <WarningAmber sx={{ color, mt: 0.25 }} aria-hidden />
        )}
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="subtitle2" fontWeight={800}>
            {alerta.titulo}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {alerta.descricao}
          </Typography>
        </Box>
      </Stack>

      {alerta.itens.length > 0 ? (
        <List dense disablePadding sx={{ mt: 0.5, ml: 4 }}>
          {alerta.itens.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                onClick={() =>
                  onNavigate(getAlertItemDestination(alerta, item))
                }
                sx={{ borderRadius: 1, px: 1, py: 0.25 }}
              >
                <ListItemText
                  primary={item.titulo}
                  secondary={[
                    item.detalhe,
                    item.data ? formatRelativeTime(item.data, now) : undefined,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  slotProps={{
                    primary: { noWrap: true, variant: 'body2' },
                    secondary: { noWrap: true, variant: 'caption' },
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
          {hiddenCount > 0 ? (
            <Typography
              component="li"
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', px: 1, pt: 0.25 }}
            >
              e mais {hiddenCount}
            </Typography>
          ) : null}
        </List>
      ) : null}

      <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1}>
        <Button
          size="small"
          color="inherit"
          onClick={() => onDismiss(alerta)}
          aria-label={`Dispensar: ${alerta.titulo}`}
        >
          Dispensar
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onNavigate(getAlertDestination(alerta))}
        >
          Ver todos
        </Button>
      </Stack>
    </Box>
  );
}

export default function NotificationsPanel({
  alertas,
  dismissedCount,
  isFetching,
  hasFetchError,
  now,
  onNavigate,
  onDismiss,
  onRestoreDismissed,
  onRefresh,
}: NotificationsPanelProps) {
  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 2, py: 1.25 }}
      >
        <Typography variant="subtitle1" fontWeight={800} component="h2">
          Notificações
        </Typography>
        <Tooltip title="Atualizar">
          <span>
            <IconButton
              size="small"
              aria-label="Atualizar notificações"
              onClick={onRefresh}
              disabled={isFetching}
            >
              {isFetching ? (
                <CircularProgress size={18} aria-label="Atualizando" />
              ) : (
                <Refresh fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      <Divider />

      {hasFetchError ? (
        <Typography
          variant="body2"
          color="error"
          role="alert"
          sx={{ px: 2, pt: 1.5 }}
        >
          Não foi possível atualizar as notificações.
          {alertas.length > 0 ? ' Exibindo a última lista carregada.' : ''}
        </Typography>
      ) : null}

      {alertas.length > 0 ? (
        <Box component="ul" sx={{ m: 0, p: 0 }}>
          {alertas.map((alerta, index) => (
            <Fragment key={alerta.tipo}>
              {index > 0 ? (
                <Divider
                  component="li"
                  aria-hidden
                  sx={{ listStyle: 'none' }}
                />
              ) : null}
              <AlertCard
                alerta={alerta}
                now={now}
                onNavigate={onNavigate}
                onDismiss={onDismiss}
              />
            </Fragment>
          ))}
        </Box>
      ) : (
        <Stack alignItems="center" spacing={1} sx={{ py: 4, px: 2 }}>
          <NotificationsNone sx={{ fontSize: 40, color: 'text.disabled' }} />
          <Typography color="text.secondary" textAlign="center">
            {isFetching && !hasFetchError
              ? 'Carregando notificações…'
              : 'Tudo em dia. Nenhum alerta no momento.'}
          </Typography>
        </Stack>
      )}

      {dismissedCount > 0 ? (
        <>
          <Divider />
          <Box sx={{ px: 2, py: 1, textAlign: 'center' }}>
            <Button size="small" color="inherit" onClick={onRestoreDismissed}>
              Mostrar dispensados ({dismissedCount})
            </Button>
          </Box>
        </>
      ) : null}
    </Box>
  );
}
