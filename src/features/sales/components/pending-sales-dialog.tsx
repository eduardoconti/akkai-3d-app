import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { Sync } from '@mui/icons-material';
import { useShallow } from 'zustand/react/shallow';
import {
  ConfirmDialog,
  EmptyState,
  formatCurrency,
  formatLocalDate,
  useOnlineStatus,
} from '@/shared';
import {
  getCachedProductCatalog,
  type PendingSaleRecord,
} from '@/shared/lib/offline/indexed-db';
import type { Produto } from '@/shared';
import {
  saleStoreSelectors,
  useSaleStore,
} from '@/features/sales/store/use-sale-store';

interface PendingSalesDialogProps {
  open: boolean;
  onClose: () => void;
}

function describeItems(
  pendingSale: PendingSaleRecord,
  catalog: Produto[],
): string {
  return pendingSale.payload.itens
    .map((item) => {
      const name =
        item.nomeProduto?.trim() ||
        catalog.find((product) => product.id === item.idProduto)?.nome ||
        'Item avulso';

      return `${item.quantidade}× ${name}${item.brinde ? ' (brinde)' : ''}`;
    })
    .join(', ');
}

function sumPayments(pendingSale: PendingSaleRecord): number {
  return pendingSale.payload.pagamentos.reduce(
    (total, pagamento) => total + pagamento.valor,
    0,
  );
}

/**
 * Vendas registradas sem conexão que ainda não chegaram ao servidor. Mostra o
 * motivo quando o servidor recusa uma delas, para o usuário reenviar ou
 * descartar em vez de a venda ficar presa na fila sem explicação.
 */
export default function PendingSalesDialog({
  open,
  onClose,
}: PendingSalesDialogProps) {
  const isOnline = useOnlineStatus();
  const {
    descartarVendaPendente,
    feiras,
    isSyncingPendingSales,
    pendingSales,
    reenviarVendaPendente,
    sincronizarVendasPendentes,
  } = useSaleStore(
    useShallow((state) => ({
      descartarVendaPendente: saleStoreSelectors.descartarVendaPendente(state),
      feiras: saleStoreSelectors.feiras(state),
      isSyncingPendingSales: saleStoreSelectors.isSyncingPendingSales(state),
      pendingSales: saleStoreSelectors.pendingSales(state),
      reenviarVendaPendente: saleStoreSelectors.reenviarVendaPendente(state),
      sincronizarVendasPendentes:
        saleStoreSelectors.sincronizarVendasPendentes(state),
    })),
  );
  const [catalog, setCatalog] = useState<Produto[]>([]);

  useEffect(() => {
    if (open) {
      void getCachedProductCatalog()
        .then((cached) => setCatalog(cached ?? []))
        .catch(() => undefined);
    }
  }, [open]);

  const [saleToDiscard, setSaleToDiscard] = useState<PendingSaleRecord | null>(
    null,
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>Vendas pendentes</DialogTitle>
        <DialogContent dividers>
          {pendingSales.length === 0 ? (
            <EmptyState message="Nenhuma venda pendente. Tudo o que foi vendido sem internet já está no servidor." />
          ) : (
            <Stack spacing={1.5}>
              {!isOnline ? (
                <Alert severity="info">
                  Sem conexão. As vendas abaixo serão enviadas sozinhas quando a
                  internet voltar.
                </Alert>
              ) : null}

              {pendingSales.map((pendingSale) => {
                const feira = feiras.find(
                  (current) => current.id === pendingSale.payload.idFeira,
                );

                return (
                  <Box
                    key={pendingSale.id}
                    sx={{
                      border: 1,
                      borderColor: pendingSale.ultimoErro
                        ? 'error.main'
                        : 'divider',
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={700}>
                          {formatCurrency(sumPayments(pendingSale))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatLocalDate(
                            pendingSale.createdAt,
                            'display-date-time',
                          )}
                          {' · '}
                          {pendingSale.payload.tipo === 'FEIRA'
                            ? `Feira${feira ? ` ${feira.nome}` : ''}`
                            : 'Loja'}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        variant="outlined"
                        color={pendingSale.ultimoErro ? 'error' : 'warning'}
                        label={
                          pendingSale.ultimoErro
                            ? 'Recusada'
                            : 'Aguardando envio'
                        }
                      />
                    </Stack>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.75 }}
                    >
                      {describeItems(pendingSale, catalog)}
                    </Typography>

                    {pendingSale.ultimoErro ? (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {pendingSale.ultimoErro}
                      </Alert>
                    ) : null}

                    <Stack
                      direction="row"
                      spacing={1}
                      justifyContent="flex-end"
                      sx={{ mt: 1 }}
                    >
                      {pendingSale.ultimoErro ? (
                        <Button
                          size="small"
                          disabled={!isOnline || isSyncingPendingSales}
                          onClick={() => {
                            void reenviarVendaPendente(pendingSale.id);
                          }}
                        >
                          Reenviar
                        </Button>
                      ) : null}
                      <Button
                        size="small"
                        color="error"
                        onClick={() => setSaleToDiscard(pendingSale)}
                      >
                        Descartar
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" onClick={onClose}>
            Fechar
          </Button>
          {pendingSales.some((sale) => !sale.ultimoErro) ? (
            <Button
              variant="contained"
              startIcon={<Sync />}
              disabled={!isOnline || isSyncingPendingSales}
              onClick={() => {
                void sincronizarVendasPendentes();
              }}
            >
              {isSyncingPendingSales ? 'Sincronizando...' : 'Sincronizar agora'}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={saleToDiscard !== null}
        title="Descartar venda pendente?"
        message={
          saleToDiscard
            ? `A venda de ${formatCurrency(sumPayments(saleToDiscard))} não será registrada no servidor e não poderá ser recuperada.`
            : ''
        }
        confirmLabel="Descartar"
        destructive
        onClose={() => setSaleToDiscard(null)}
        onConfirm={() => {
          if (saleToDiscard) {
            void descartarVendaPendente(saleToDiscard.id);
          }
          setSaleToDiscard(null);
        }}
      />
    </>
  );
}
