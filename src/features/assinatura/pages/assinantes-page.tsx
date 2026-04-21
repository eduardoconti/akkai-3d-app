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
import { EditAssinanteDialog, NewAssinanteDialog } from '@/features/assinatura';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  STATUS_ASSINANTE_COLOR,
  STATUS_ASSINANTE_LABEL,
} from '@/features/assinatura/types/assinatura-form';
import {
  AppTablePagination,
  EmptyState,
  LoadingState,
  PageHeader,
  type StatusAssinante,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function AssinantesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    assinantes,
    fetchAssinantes,
    fetchErrorMessage,
    fetchPlanos,
    isFetching,
    paginacaoAssinantes,
    planos,
    totalAssinantes,
  } = useAssinaturaStore(
    useShallow((state) => ({
      assinantes: assinaturaStoreSelectors.assinantes(state),
      fetchAssinantes: assinaturaStoreSelectors.fetchAssinantes(state),
      fetchErrorMessage: assinaturaStoreSelectors.fetchErrorMessage(state),
      fetchPlanos: assinaturaStoreSelectors.fetchPlanos(state),
      isFetching: assinaturaStoreSelectors.isFetching(state),
      paginacaoAssinantes: assinaturaStoreSelectors.paginacaoAssinantes(state),
      planos: assinaturaStoreSelectors.planos(state),
      totalAssinantes: assinaturaStoreSelectors.totalAssinantes(state),
    })),
  );
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editingAssinanteId, setEditingAssinanteId] = useState<number | null>(
    null,
  );
  const [termo, setTermo] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<StatusAssinante | ''>('');
  const [idPlanoFiltro, setIdPlanoFiltro] = useState<number | ''>('');

  useEffect(() => {
    void fetchPlanos();
  }, [fetchPlanos]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchAssinantes({
        pagina: 1,
        termo: termo.trim(),
        status: statusFiltro || undefined,
        idPlano: idPlanoFiltro || undefined,
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [fetchAssinantes, termo, statusFiltro, idPlanoFiltro]);

  const handleUpdated = async () => {
    await fetchAssinantes({ pagina: 1 });
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Assinantes"
        description="Gerencie os assinantes dos kits mensais e seus planos."
        actionLabel="Novo assinante"
        onAction={() => setNewDialogOpen(true)}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            label="Pesquisar"
            placeholder="Nome, e-mail ou telefone"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            select
            fullWidth
            label="Status"
            value={statusFiltro}
            onChange={(e) =>
              setStatusFiltro(e.target.value as StatusAssinante | '')
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {(Object.keys(STATUS_ASSINANTE_LABEL) as StatusAssinante[]).map(
              (s) => (
                <MenuItem key={s} value={s}>
                  {STATUS_ASSINANTE_LABEL[s]}
                </MenuItem>
              ),
            )}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            select
            fullWidth
            label="Plano"
            value={idPlanoFiltro}
            onChange={(e) =>
              setIdPlanoFiltro(
                e.target.value === '' ? '' : Number(e.target.value),
              )
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {planos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nome}
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
          <Stack
            divider={<Divider flexItem />}
            aria-label="lista de assinantes"
          >
            {isFetching ? (
              <LoadingState />
            ) : assinantes.length > 0 ? (
              assinantes.map((assinante) => (
                <Box
                  key={assinante.id}
                  sx={{ px: 2, py: 2, cursor: 'pointer' }}
                  onClick={() => setEditingAssinanteId(assinante.id)}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1.5}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {assinante.nome}
                      </Typography>
                      {assinante.email ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          noWrap
                        >
                          {assinante.email}
                        </Typography>
                      ) : null}
                      {assinante.telefone ? (
                        <Typography variant="body2" color="text.secondary">
                          {assinante.telefone}
                        </Typography>
                      ) : null}
                      <Typography variant="caption" color="text.secondary">
                        {assinante.plano?.nome ?? `Plano #${assinante.idPlano}`}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={STATUS_ASSINANTE_LABEL[assinante.status]}
                      color={STATUS_ASSINANTE_COLOR[assinante.status]}
                      variant="outlined"
                      sx={{ flexShrink: 0 }}
                    />
                  </Stack>
                </Box>
              ))
            ) : (
              <EmptyState message="Nenhum assinante encontrado para os filtros informados." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de assinantes">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Nome</strong>
                  </TableCell>
                  <TableCell>
                    <strong>E-mail</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Telefone</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Plano</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
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
                ) : assinantes.length > 0 ? (
                  assinantes.map((assinante) => (
                    <TableRow
                      key={assinante.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setEditingAssinanteId(assinante.id)}
                    >
                      <TableCell>{assinante.nome}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {assinante.email ?? '—'}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {assinante.telefone ?? '—'}
                      </TableCell>
                      <TableCell>
                        {assinante.plano?.nome ?? `Plano #${assinante.idPlano}`}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={STATUS_ASSINANTE_LABEL[assinante.status]}
                          color={STATUS_ASSINANTE_COLOR[assinante.status]}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ p: 0 }}>
                      <EmptyState message="Nenhum assinante encontrado para os filtros informados." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={totalAssinantes}
          page={Math.max(0, (paginacaoAssinantes.pagina ?? 1) - 1)}
          rowsPerPage={paginacaoAssinantes.tamanhoPagina ?? 10}
          onPageChange={(_event, newPage) => {
            void fetchAssinantes({ pagina: newPage + 1 });
          }}
          onRowsPerPageChange={(event) => {
            void fetchAssinantes({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
        />
      </Paper>

      <NewAssinanteDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
      />
      <EditAssinanteDialog
        open={editingAssinanteId !== null}
        assinanteId={editingAssinanteId}
        onClose={() => setEditingAssinanteId(null)}
        onUpdated={handleUpdated}
      />
    </Stack>
  );
}
