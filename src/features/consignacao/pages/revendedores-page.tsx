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
import RevendedorDialog from '@/features/consignacao/components/revendedor-dialog';
import {
  consignacaoStoreSelectors,
  useConsignacaoStore,
} from '@/features/consignacao/store/use-consignacao-store';
import {
  AppTablePagination,
  EmptyState,
  LoadingState,
  PageHeader,
  SearchFilterPanel,
  type StatusRevendedor,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatPercentual(value?: number | null): string {
  return `${(value ?? 0).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  })}%`;
}

export default function RevendedoresPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    fetchErrorMessage,
    fetchRevendedores,
    isFetching,
    paginacao,
    revendedores,
    totalRevendedores,
  } = useConsignacaoStore(
    useShallow((state) => ({
      fetchErrorMessage: consignacaoStoreSelectors.fetchErrorMessage(state),
      fetchRevendedores: consignacaoStoreSelectors.fetchRevendedores(state),
      isFetching: consignacaoStoreSelectors.isFetching(state),
      paginacao: consignacaoStoreSelectors.paginacaoRevendedores(state),
      revendedores: consignacaoStoreSelectors.revendedores(state),
      totalRevendedores: consignacaoStoreSelectors.totalRevendedores(state),
    })),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRevendedorId, setEditingRevendedorId] = useState<number | null>(
    null,
  );
  const [searchInput, setSearchInput] = useState(paginacao.termo ?? '');
  const [statusFiltro, setStatusFiltro] = useState<StatusRevendedor | ''>(
    paginacao.status ?? '',
  );
  const [ordenarPor, setOrdenarPor] = useState<'nome' | 'dataInclusao'>(
    paginacao.ordenarPor ?? 'nome',
  );

  useEffect(() => {
    void fetchRevendedores();
  }, [fetchRevendedores]);

  const handleSearch = () => {
    void fetchRevendedores({
      pagina: 1,
      termo: searchInput.trim(),
      status: statusFiltro === '' ? undefined : statusFiltro,
      ordenarPor,
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setStatusFiltro('');
    setOrdenarPor('nome');
    void fetchRevendedores({
      pagina: 1,
      termo: '',
      status: undefined,
      ordenarPor: 'nome',
    });
  };

  const handleDialogSaved = async () => {
    await fetchRevendedores();
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Revendedores"
        description="Gerencie os parceiros que recebem peças em consignação."
        actionLabel="Novo revendedor"
        onAction={() => setDialogOpen(true)}
      />

      <SearchFilterPanel
        onSearch={handleSearch}
        onClear={handleClearFilters}
        isLoading={isFetching}
        columns={{ xs: 12, md: 12 }}
      >
        <Grid size={{ xs: 12, md: 5 }}>
          <TextField
            fullWidth
            label="Pesquisar revendedor"
            placeholder="Nome ou telefone"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            select
            fullWidth
            label="Status"
            value={statusFiltro}
            onChange={(event) =>
              setStatusFiltro(event.target.value as StatusRevendedor | '')
            }
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ATIVO">Ativo</MenuItem>
            <MenuItem value="INATIVO">Inativo</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={ordenarPor}
            onChange={(event) =>
              setOrdenarPor(event.target.value as 'nome' | 'dataInclusao')
            }
          >
            <MenuItem value="nome">Nome</MenuItem>
            <MenuItem value="dataInclusao">Data inclusão</MenuItem>
          </TextField>
        </Grid>
      </SearchFilterPanel>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack
            divider={<Divider flexItem />}
            aria-label="lista de revendedores"
          >
            {isFetching ? (
              <LoadingState />
            ) : revendedores.length > 0 ? (
              revendedores.map((revendedor) => (
                <Box
                  key={revendedor.id}
                  sx={{ px: 2, py: 2, cursor: 'pointer' }}
                  onClick={() => setEditingRevendedorId(revendedor.id)}
                >
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1.5}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {revendedor.nome}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {revendedor.telefone || 'Sem telefone'}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={
                          revendedor.status === 'ATIVO' ? 'Ativo' : 'Inativo'
                        }
                        color={
                          revendedor.status === 'ATIVO' ? 'success' : 'default'
                        }
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Desconto:{' '}
                      {formatPercentual(revendedor.percentualDesconto)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Incluído em {formatDateTime(revendedor.dataInclusao)}
                    </Typography>
                  </Stack>
                </Box>
              ))
            ) : (
              <EmptyState message="Nenhum revendedor cadastrado até o momento." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de revendedores">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Nome</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Telefone</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Desconto</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Data inclusão</strong>
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
                ) : revendedores.length > 0 ? (
                  revendedores.map((revendedor) => (
                    <TableRow
                      key={revendedor.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setEditingRevendedorId(revendedor.id)}
                    >
                      <TableCell>{revendedor.nome}</TableCell>
                      <TableCell>{revendedor.telefone || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            revendedor.status === 'ATIVO' ? 'Ativo' : 'Inativo'
                          }
                          color={
                            revendedor.status === 'ATIVO'
                              ? 'success'
                              : 'default'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatPercentual(revendedor.percentualDesconto)}
                      </TableCell>
                      <TableCell>
                        {formatDateTime(revendedor.dataInclusao)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ p: 0 }}>
                      <EmptyState message="Nenhum revendedor cadastrado até o momento." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={totalRevendedores}
          page={Math.max(0, paginacao.pagina - 1)}
          rowsPerPage={paginacao.tamanhoPagina}
          onPageChange={(_event, newPage) => {
            void fetchRevendedores({ pagina: newPage + 1 });
          }}
          onRowsPerPageChange={(event) => {
            void fetchRevendedores({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
        />
      </Paper>

      <RevendedorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleDialogSaved}
      />
      <RevendedorDialog
        open={editingRevendedorId !== null}
        revendedorId={editingRevendedorId}
        onClose={() => setEditingRevendedorId(null)}
        onSaved={handleDialogSaved}
      />
    </Stack>
  );
}
