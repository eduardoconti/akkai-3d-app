import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
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
import {
  AddCircleOutline,
  AssignmentReturn,
  FileDownload,
  KeyboardArrowDown,
  KeyboardArrowUp,
  PointOfSale,
} from '@mui/icons-material';
import {
  baixarRelatorioConsignacaoPdf,
  listarTodosRevendedoresAtivos,
} from '@/features/consignacao/api/consignacao-api';
import ConsignacaoDialog from '@/features/consignacao/components/consignacao-dialog';
import RegistrarDevolucaoConsignadaDialog from '@/features/consignacao/components/registrar-devolucao-consignada-dialog';
import RegistrarVendasRevendedorDialog from '@/features/consignacao/components/registrar-vendas-revendedor-dialog';
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
  formatCurrency,
  getProblemDetailsFromError,
  useFeedbackStore,
  type Consignacao,
  type ItemConsignacao,
  type Revendedor,
  type StatusConsignacao,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function obterNomeProduto(item: ItemConsignacao): string {
  return `${item.nomeProduto} (${item.codigoProduto})`;
}

function obterStatusLabel(status: StatusConsignacao): string {
  const labels: Record<StatusConsignacao, string> = {
    ABERTA: 'Aberta',
    FECHADA: 'Fechada',
    CANCELADA: 'Cancelada',
  };

  return labels[status];
}

function obterStatusColor(status: StatusConsignacao) {
  if (status === 'ABERTA') {
    return 'success' as const;
  }

  if (status === 'FECHADA') {
    return 'primary' as const;
  }

  return 'default' as const;
}

function DetalheItens({
  consignacao,
  onDevolucao,
}: {
  consignacao: Consignacao;
  onDevolucao: (item: ItemConsignacao) => void;
}) {
  return (
    <Box
      sx={{
        m: 2,
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50',
        p: 2,
        borderRadius: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        Itens da Consignação #{consignacao.id}
      </Typography>

      <Stack
        direction="row"
        spacing={2}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" color="text.secondary">
          Enviado: {consignacao.quantidadeEnviada}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Vendido: {consignacao.quantidadeVendida}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Devolvido: {consignacao.quantidadeDevolvida}
        </Typography>
        <Typography variant="body2" fontWeight={700} color="success.main">
          Disponível: {consignacao.quantidadeDisponivel}
        </Typography>
      </Stack>

      <Table size="small" aria-label="itens da consignação">
        <TableHead>
          <TableRow>
            <TableCell>ID Produto</TableCell>
            <TableCell>Nome</TableCell>
            <TableCell align="right">Enviado</TableCell>
            <TableCell align="right">Vendido</TableCell>
            <TableCell align="right">Devolvido</TableCell>
            <TableCell align="right">Disponível</TableCell>
            <TableCell align="right">Unitário</TableCell>
            <TableCell align="right">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(consignacao.itens ?? []).map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.idProduto}</TableCell>
              <TableCell>{obterNomeProduto(item)}</TableCell>
              <TableCell align="right">{item.quantidadeEnviada}</TableCell>
              <TableCell align="right">{item.quantidadeVendida}</TableCell>
              <TableCell align="right">{item.quantidadeDevolvida}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                {item.quantidadeDisponivel}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(item.valorUnitario)}
              </TableCell>
              <TableCell align="right">
                <Button
                  size="small"
                  startIcon={<AssignmentReturn />}
                  onClick={() => onDevolucao(item)}
                  disabled={
                    consignacao.status !== 'ABERTA' ||
                    item.quantidadeDisponivel <= 0
                  }
                >
                  Devolver
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export default function ConsignacoesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    consignacoes,
    detalheConsignacao,
    fetchConsignacoes,
    fetchErrorMessage,
    isFetching,
    obterConsignacaoPorId,
    paginacao,
    totalConsignacoes,
  } = useConsignacaoStore(
    useShallow((state) => ({
      consignacoes: consignacaoStoreSelectors.consignacoes(state),
      detalheConsignacao: consignacaoStoreSelectors.detalheConsignacao(state),
      fetchConsignacoes: consignacaoStoreSelectors.fetchConsignacoes(state),
      fetchErrorMessage: consignacaoStoreSelectors.fetchErrorMessage(state),
      isFetching: consignacaoStoreSelectors.isFetching(state),
      obterConsignacaoPorId:
        consignacaoStoreSelectors.obterConsignacaoPorId(state),
      paginacao: consignacaoStoreSelectors.paginacaoConsignacoes(state),
      totalConsignacoes: consignacaoStoreSelectors.totalConsignacoes(state),
    })),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendasRevendedorDialogOpen, setVendasRevendedorDialogOpen] =
    useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [relatorioErrorMessage, setRelatorioErrorMessage] = useState<
    string | null
  >(null);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [revendedores, setRevendedores] = useState<Revendedor[]>([]);
  const [revendedorSelecionado, setRevendedorSelecionado] =
    useState<Revendedor | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<StatusConsignacao | ''>('');
  const [ordenarPor, setOrdenarPor] = useState<'dataInclusao' | 'revendedor'>(
    'dataInclusao',
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [devolucaoItem, setDevolucaoItem] = useState<ItemConsignacao | null>(
    null,
  );
  const [devolucaoConsignacao, setDevolucaoConsignacao] =
    useState<Consignacao | null>(null);

  useEffect(() => {
    void fetchConsignacoes({
      pagina: 1,
      termo: '',
      idRevendedor: undefined,
      status: undefined,
      ordenarPor: 'dataInclusao',
    });
  }, [fetchConsignacoes]);

  useEffect(() => {
    let active = true;

    listarTodosRevendedoresAtivos().then((resposta) => {
      if (active) {
        setRevendedores(resposta);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const consignacaoExpandida = useMemo(() => {
    if (!expandedId) {
      return null;
    }

    if (detalheConsignacao?.id === expandedId) {
      return detalheConsignacao;
    }

    return (
      consignacoes.find((consignacao) => consignacao.id === expandedId) ?? null
    );
  }, [consignacoes, detalheConsignacao, expandedId]);

  const handleSearch = () => {
    void fetchConsignacoes({
      pagina: 1,
      termo: searchInput.trim(),
      idRevendedor: revendedorSelecionado?.id,
      status: statusFiltro === '' ? undefined : statusFiltro,
      ordenarPor,
    });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setRevendedorSelecionado(null);
    setStatusFiltro('');
    setOrdenarPor('dataInclusao');
    void fetchConsignacoes({
      pagina: 1,
      termo: '',
      idRevendedor: undefined,
      status: undefined,
      ordenarPor: 'dataInclusao',
    });
  };

  const handleRefresh = async () => {
    await fetchConsignacoes();

    if (expandedId) {
      await obterConsignacaoPorId(expandedId);
    }
  };

  const handleExpand = async (id: number) => {
    const nextExpandedId = expandedId === id ? null : id;
    setExpandedId(nextExpandedId);

    if (nextExpandedId) {
      await obterConsignacaoPorId(nextExpandedId);
    }
  };

  const handleOpenDevolucao = (
    consignacao: Consignacao,
    item: ItemConsignacao,
  ) => {
    setDevolucaoConsignacao(consignacao);
    setDevolucaoItem(item);
  };

  const handleDownloadRelatorio = async (id: number) => {
    setRelatorioErrorMessage(null);

    try {
      const relatorio = await baixarRelatorioConsignacaoPdf(id);
      const url = URL.createObjectURL(relatorio.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = relatorio.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showSuccess('Relatório da consignação baixado com sucesso.');
    } catch (error) {
      const problem = getProblemDetailsFromError(error);
      setRelatorioErrorMessage(problem.detail);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        spacing={2}
      >
        <PageHeader
          title="Consignações"
          description="Controle as peças enviadas, vendidas, devolvidas e ainda disponíveis com revendedores."
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="outlined"
            startIcon={<AddCircleOutline />}
            onClick={() => setDialogOpen(true)}
          >
            Nova consignação
          </Button>
          <Button
            variant="contained"
            startIcon={<PointOfSale />}
            onClick={() => setVendasRevendedorDialogOpen(true)}
          >
            Registrar vendas
          </Button>
        </Stack>
      </Stack>

      <SearchFilterPanel
        onSearch={handleSearch}
        onClear={handleClearFilters}
        isLoading={isFetching}
        columns={{ xs: 12, md: 12 }}
      >
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Pesquisar consignação"
            placeholder="Nome do revendedor"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Autocomplete
            options={revendedores}
            value={revendedorSelecionado}
            onChange={(_event, value) => setRevendedorSelecionado(value)}
            getOptionLabel={(option) => option.nome}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label="Revendedor" />
            )}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            select
            fullWidth
            label="Status"
            value={statusFiltro}
            onChange={(event) =>
              setStatusFiltro(event.target.value as StatusConsignacao | '')
            }
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="ABERTA">Aberta</MenuItem>
            <MenuItem value="FECHADA">Fechada</MenuItem>
            <MenuItem value="CANCELADA">Cancelada</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 2 }}>
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={ordenarPor}
            onChange={(event) =>
              setOrdenarPor(event.target.value as 'dataInclusao' | 'revendedor')
            }
          >
            <MenuItem value="dataInclusao">Data inclusão</MenuItem>
            <MenuItem value="revendedor">Revendedor</MenuItem>
          </TextField>
        </Grid>
      </SearchFilterPanel>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      {relatorioErrorMessage ? (
        <Alert severity="error">{relatorioErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack
            divider={<Divider flexItem />}
            aria-label="lista de consignações"
          >
            {isFetching ? (
              <LoadingState />
            ) : consignacoes.length > 0 ? (
              consignacoes.map((consignacao) => {
                const expanded = expandedId === consignacao.id;
                const detalhe =
                  expanded && consignacaoExpandida
                    ? consignacaoExpandida
                    : consignacao;

                return (
                  <Box key={consignacao.id} sx={{ px: 2, py: 2 }}>
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1.5}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {consignacao.revendedor.nome}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTime(consignacao.dataInclusao)}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={obterStatusLabel(consignacao.status)}
                          color={obterStatusColor(consignacao.status)}
                          variant="outlined"
                        />
                      </Stack>

                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Typography variant="body2" color="text.secondary">
                          Enviado:{' '}
                          <strong>{consignacao.quantidadeEnviada}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Vendido:{' '}
                          <strong>{consignacao.quantidadeVendida}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Disponível:{' '}
                          <strong>{consignacao.quantidadeDisponivel}</strong>
                        </Typography>
                      </Stack>

                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          size="small"
                          onClick={() => void handleExpand(consignacao.id)}
                          endIcon={
                            expanded ? (
                              <KeyboardArrowUp />
                            ) : (
                              <KeyboardArrowDown />
                            )
                          }
                        >
                          Itens
                        </Button>
                        <Button
                          size="small"
                          startIcon={<FileDownload />}
                          onClick={() =>
                            void handleDownloadRelatorio(consignacao.id)
                          }
                        >
                          PDF
                        </Button>
                      </Stack>

                      <Collapse in={expanded} timeout="auto" unmountOnExit>
                        {(detalhe.itens ?? []).map((item) => (
                          <Box key={item.id} sx={{ py: 1 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {obterNomeProduto(item)}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Enviado {item.quantidadeEnviada} · Vendido{' '}
                              {item.quantidadeVendida} · Devolvido{' '}
                              {item.quantidadeDevolvida} · Disponível{' '}
                              {item.quantidadeDisponivel}
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              <Button
                                size="small"
                                startIcon={<AssignmentReturn />}
                                onClick={() =>
                                  handleOpenDevolucao(detalhe, item)
                                }
                                disabled={
                                  detalhe.status !== 'ABERTA' ||
                                  item.quantidadeDisponivel <= 0
                                }
                              >
                                Devolver
                              </Button>
                            </Box>
                          </Box>
                        ))}
                      </Collapse>
                    </Stack>
                  </Box>
                );
              })
            ) : (
              <EmptyState message="Nenhuma consignação cadastrada até o momento." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de consignações">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>
                    <strong>Revendedor</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Data inclusão</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Enviado</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Vendido</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Disponível</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Ações</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ p: 0 }}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : consignacoes.length > 0 ? (
                  consignacoes.map((consignacao) => {
                    const expanded = expandedId === consignacao.id;
                    const detalhe =
                      expanded && consignacaoExpandida
                        ? consignacaoExpandida
                        : consignacao;

                    return (
                      <Fragment key={consignacao.id}>
                        <TableRow hover>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => void handleExpand(consignacao.id)}
                              aria-label={
                                expanded
                                  ? 'Fechar itens da consignação'
                                  : 'Abrir itens da consignação'
                              }
                            >
                              {expanded ? (
                                <KeyboardArrowUp />
                              ) : (
                                <KeyboardArrowDown />
                              )}
                            </IconButton>
                          </TableCell>
                          <TableCell>{consignacao.revendedor.nome}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={obterStatusLabel(consignacao.status)}
                              color={obterStatusColor(consignacao.status)}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {formatDateTime(consignacao.dataInclusao)}
                          </TableCell>
                          <TableCell align="right">
                            {consignacao.quantidadeEnviada}
                          </TableCell>
                          <TableCell align="right">
                            {consignacao.quantidadeVendida}
                          </TableCell>
                          <TableCell align="right">
                            {consignacao.quantidadeDisponivel}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              startIcon={<FileDownload />}
                              onClick={() =>
                                void handleDownloadRelatorio(consignacao.id)
                              }
                            >
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={8} sx={{ p: 0, borderBottom: 0 }}>
                            <Collapse
                              in={expanded}
                              timeout="auto"
                              unmountOnExit
                            >
                              <DetalheItens
                                consignacao={detalhe}
                                onDevolucao={(item) =>
                                  handleOpenDevolucao(detalhe, item)
                                }
                              />
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </Fragment>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ p: 0 }}>
                      <EmptyState message="Nenhuma consignação cadastrada até o momento." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={totalConsignacoes}
          page={Math.max(0, paginacao.pagina - 1)}
          rowsPerPage={paginacao.tamanhoPagina}
          onPageChange={(_event, newPage) => {
            void fetchConsignacoes({ pagina: newPage + 1 });
          }}
          onRowsPerPageChange={(event) => {
            void fetchConsignacoes({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
        />
      </Paper>

      <ConsignacaoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleRefresh}
      />
      <RegistrarVendasRevendedorDialog
        open={vendasRevendedorDialogOpen}
        onClose={() => setVendasRevendedorDialogOpen(false)}
        onSaved={handleRefresh}
      />
      <RegistrarDevolucaoConsignadaDialog
        open={devolucaoItem !== null}
        consignacao={devolucaoConsignacao}
        item={devolucaoItem}
        onClose={() => {
          setDevolucaoItem(null);
          setDevolucaoConsignacao(null);
        }}
        onSaved={handleRefresh}
      />
    </Stack>
  );
}
