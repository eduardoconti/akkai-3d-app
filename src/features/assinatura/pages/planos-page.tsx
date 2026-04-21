import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { EditPlanDialog, NewPlanDialog } from '@/features/assinatura';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  AppTablePagination,
  EmptyState,
  LoadingState,
  PageHeader,
  formatCurrency,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function PlanosPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { fetchErrorMessage, fetchPlanos, isFetching, planos } =
    useAssinaturaStore(
      useShallow((state) => ({
        fetchErrorMessage: assinaturaStoreSelectors.fetchErrorMessage(state),
        fetchPlanos: assinaturaStoreSelectors.fetchPlanos(state),
        isFetching: assinaturaStoreSelectors.isFetching(state),
        planos: assinaturaStoreSelectors.planos(state),
      })),
    );
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    void fetchPlanos();
  }, [fetchPlanos]);

  const sortedPlanos = useMemo(
    () => [...planos].sort((a, b) => a.nome.localeCompare(b.nome)),
    [planos],
  );

  const paginatedPlanos = useMemo(
    () =>
      sortedPlanos.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [page, rowsPerPage, sortedPlanos],
  );

  useEffect(() => {
    const maxPage = Math.max(
      0,
      Math.ceil(sortedPlanos.length / rowsPerPage) - 1,
    );
    if (page > maxPage) setPage(maxPage);
  }, [page, rowsPerPage, sortedPlanos.length]);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Planos"
        description="Cadastre os planos de kit mensal para oferecer aos assinantes."
        actionLabel="Novo plano"
        onAction={() => setNewDialogOpen(true)}
      />

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de planos">
            {isFetching ? (
              <LoadingState />
            ) : paginatedPlanos.length > 0 ? (
              paginatedPlanos.map((plano) => (
                <Box
                  key={plano.id}
                  sx={{ px: 2, py: 2, cursor: 'pointer' }}
                  onClick={() => setEditingPlanId(plano.id)}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1.5}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {plano.nome}
                      </Typography>
                      {plano.descricao ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {plano.descricao}
                        </Typography>
                      ) : null}
                      <Chip
                        size="small"
                        label={plano.ativo ? 'Ativo' : 'Inativo'}
                        color={plano.ativo ? 'success' : 'default'}
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    </Box>
                    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        color="primary.main"
                      >
                        {formatCurrency(plano.valor)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        /mês
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              ))
            ) : (
              <EmptyState message="Nenhum plano cadastrado até o momento." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de planos">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Nome</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Descrição</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Valor/mês</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ p: 0 }}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : paginatedPlanos.length > 0 ? (
                  paginatedPlanos.map((plano) => (
                    <TableRow
                      key={plano.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setEditingPlanId(plano.id)}
                    >
                      <TableCell>{plano.nome}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {plano.descricao ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={plano.ativo ? 'Ativo' : 'Inativo'}
                          color={plano.ativo ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontWeight: 700, color: 'primary.main' }}
                      >
                        {formatCurrency(plano.valor)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ p: 0 }}>
                      <EmptyState message="Nenhum plano cadastrado até o momento." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={sortedPlanos.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
        />
      </Paper>

      <NewPlanDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
      />
      <EditPlanDialog
        open={editingPlanId !== null}
        planId={editingPlanId}
        onClose={() => setEditingPlanId(null)}
        onUpdated={fetchPlanos}
      />
    </Stack>
  );
}
