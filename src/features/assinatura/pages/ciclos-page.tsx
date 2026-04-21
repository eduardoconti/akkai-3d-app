import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import { EditCicloDialog, NewCicloDialog } from '@/features/assinatura';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  MESES_LABEL,
  STATUS_CICLO_COLOR,
  STATUS_CICLO_LABEL,
} from '@/features/assinatura/types/assinatura-form';
import {
  AppTablePagination,
  EmptyState,
  LoadingState,
  PageHeader,
  type StatusCiclo,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function CiclosPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    assinantes,
    ciclos,
    fetchAssinantes,
    fetchCiclos,
    fetchErrorMessage,
    isFetching,
    paginacaoCiclos,
    totalCiclos,
  } = useAssinaturaStore(
    useShallow((state) => ({
      assinantes: assinaturaStoreSelectors.assinantes(state),
      ciclos: assinaturaStoreSelectors.ciclos(state),
      fetchAssinantes: assinaturaStoreSelectors.fetchAssinantes(state),
      fetchCiclos: assinaturaStoreSelectors.fetchCiclos(state),
      fetchErrorMessage: assinaturaStoreSelectors.fetchErrorMessage(state),
      isFetching: assinaturaStoreSelectors.isFetching(state),
      paginacaoCiclos: assinaturaStoreSelectors.paginacaoCiclos(state),
      totalCiclos: assinaturaStoreSelectors.totalCiclos(state),
    })),
  );
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editingCicloId, setEditingCicloId] = useState<number | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<StatusCiclo | ''>('');
  const [idAssinanteFiltro, setIdAssinanteFiltro] = useState<number | ''>('');
  const [mesFiltro, setMesFiltro] = useState<number | ''>('');
  const [anoFiltro, setAnoFiltro] = useState<number | ''>('');

  useEffect(() => {
    void fetchAssinantes({ tamanhoPagina: 50 });
  }, [fetchAssinantes]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchCiclos({
        pagina: 1,
        status: statusFiltro || undefined,
        idAssinante: idAssinanteFiltro || undefined,
        mes: mesFiltro || undefined,
        ano: anoFiltro || undefined,
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [fetchCiclos, statusFiltro, idAssinanteFiltro, mesFiltro, anoFiltro]);

  const handleUpdated = async () => {
    await fetchCiclos({ pagina: 1 });
  };

  const currentYear = new Date().getFullYear();
  const ANOS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Ciclos"
        description="Acompanhe e gerencie os ciclos de envio dos kits mensais."
        actionLabel="Novo ciclo"
        onAction={() => setNewDialogOpen(true)}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            select
            fullWidth
            label="Assinante"
            value={idAssinanteFiltro}
            onChange={(e) =>
              setIdAssinanteFiltro(
                e.target.value === '' ? '' : Number(e.target.value),
              )
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {assinantes.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            select
            fullWidth
            label="Status"
            value={statusFiltro}
            onChange={(e) =>
              setStatusFiltro(e.target.value as StatusCiclo | '')
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {(Object.keys(STATUS_CICLO_LABEL) as StatusCiclo[]).map((s) => (
              <MenuItem key={s} value={s}>
                {STATUS_CICLO_LABEL[s]}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            select
            fullWidth
            label="Mês"
            value={mesFiltro}
            onChange={(e) =>
              setMesFiltro(e.target.value === '' ? '' : Number(e.target.value))
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(MESES_LABEL).map(([mes, label]) => (
              <MenuItem key={mes} value={Number(mes)}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            select
            fullWidth
            label="Ano"
            value={anoFiltro}
            onChange={(e) =>
              setAnoFiltro(e.target.value === '' ? '' : Number(e.target.value))
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {ANOS.map((ano) => (
              <MenuItem key={ano} value={ano}>
                {ano}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de ciclos">
            {isFetching ? (
              <LoadingState />
            ) : ciclos.length > 0 ? (
              ciclos.map((ciclo) => (
                <Box
                  key={ciclo.id}
                  sx={{ px: 2, py: 2, cursor: 'pointer' }}
                  onClick={() => setEditingCicloId(ciclo.id)}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1.5}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {ciclo.assinante?.nome ??
                          `Assinante #${ciclo.idAssinante}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {MESES_LABEL[ciclo.mesReferencia]} /{' '}
                        {ciclo.anoReferencia}
                      </Typography>
                      {ciclo.codigoRastreio ? (
                        <Typography variant="caption" color="text.secondary">
                          Rastreio: {ciclo.codigoRastreio}
                        </Typography>
                      ) : null}
                    </Box>
                    <Chip
                      size="small"
                      label={STATUS_CICLO_LABEL[ciclo.status]}
                      color={STATUS_CICLO_COLOR[ciclo.status]}
                      variant="outlined"
                      sx={{ flexShrink: 0 }}
                    />
                  </Stack>
                </Box>
              ))
            ) : (
              <EmptyState message="Nenhum ciclo encontrado para os filtros informados." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de ciclos">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Assinante</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Referência</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Itens</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Rastreio</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ p: 0 }}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : ciclos.length > 0 ? (
                  ciclos.map((ciclo) => (
                    <TableRow
                      key={ciclo.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setEditingCicloId(ciclo.id)}
                    >
                      <TableCell>
                        {ciclo.assinante?.nome ??
                          `Assinante #${ciclo.idAssinante}`}
                      </TableCell>
                      <TableCell>
                        {MESES_LABEL[ciclo.mesReferencia]} /{' '}
                        {ciclo.anoReferencia}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={STATUS_CICLO_LABEL[ciclo.status]}
                          color={STATUS_CICLO_COLOR[ciclo.status]}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {ciclo.itens?.length ?? 0}{' '}
                        {ciclo.itens?.length === 1 ? 'item' : 'itens'}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {ciclo.codigoRastreio ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ p: 0 }}>
                      <EmptyState message="Nenhum ciclo encontrado para os filtros informados." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={totalCiclos}
          page={Math.max(0, (paginacaoCiclos.pagina ?? 1) - 1)}
          rowsPerPage={paginacaoCiclos.tamanhoPagina ?? 10}
          onPageChange={(_event, newPage) => {
            void fetchCiclos({ pagina: newPage + 1 });
          }}
          onRowsPerPageChange={(event) => {
            void fetchCiclos({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
        />
      </Paper>

      <NewCicloDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
      />
      <EditCicloDialog
        open={editingCicloId !== null}
        cicloId={editingCicloId}
        onClose={() => setEditingCicloId(null)}
        onUpdated={handleUpdated}
      />
    </Stack>
  );
}
