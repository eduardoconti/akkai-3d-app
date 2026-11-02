import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import {
  Add,
  AddCircleOutline,
  AssignmentReturn,
  Delete as DeleteIcon,
  Edit,
  FileDownload,
  KeyboardArrowDown,
  KeyboardArrowUp,
  PointOfSale,
  TaskAlt,
} from '@mui/icons-material';
import {
  baixarRelatorioConsignacaoPdf,
  listarTodosRevendedoresAtivos,
} from '@/features/consignacao/api/consignacao-api';
import ConsignacaoDialog from '@/features/consignacao/components/consignacao-dialog';
import FecharConsignacaoDialog from '@/features/consignacao/components/fechar-consignacao-dialog';
import ItemConsignacaoDialog from '@/features/consignacao/components/item-consignacao-dialog';
import RegistrarDevolucaoConsignadaDialog from '@/features/consignacao/components/registrar-devolucao-consignada-dialog';
import RegistrarVendasRevendedorDialog from '@/features/consignacao/components/registrar-vendas-revendedor-dialog';
import {
  consignacaoStoreSelectors,
  useConsignacaoStore,
} from '@/features/consignacao/store/use-consignacao-store';
import {
  ConfirmDialog,
  CurrencyValue,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  getProblemDetailsFromError,
  useFeedbackStore,
  type Consignacao,
  type DataTableColumn,
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

interface DetalheItensProps {
  consignacao: Consignacao;
  compacto: boolean;
  onAdicionar: () => void;
  onDevolucao: (item: ItemConsignacao) => void;
  onAlterar: (item: ItemConsignacao) => void;
  onExcluir: (item: ItemConsignacao) => void;
}

type AcoesItemProps = Pick<
  DetalheItensProps,
  'consignacao' | 'onDevolucao' | 'onAlterar' | 'onExcluir'
> & { item: ItemConsignacao };

function AcoesItem({
  consignacao,
  item,
  onDevolucao,
  onAlterar,
  onExcluir,
}: AcoesItemProps) {
  return (
    <>
      <Button
        size="small"
        startIcon={<Edit />}
        onClick={() => onAlterar(item)}
        disabled={consignacao.status !== 'ABERTA'}
      >
        Alterar
      </Button>
      <Button
        size="small"
        color="error"
        startIcon={<DeleteIcon />}
        onClick={() => onExcluir(item)}
        disabled={
          consignacao.status !== 'ABERTA' ||
          item.quantidadeVendida > 0 ||
          item.quantidadeDevolvida > 0
        }
      >
        Excluir
      </Button>
      <Button
        size="small"
        startIcon={<AssignmentReturn />}
        onClick={() => onDevolucao(item)}
        disabled={
          consignacao.status !== 'ABERTA' || item.quantidadeDisponivel <= 0
        }
      >
        Devolver
      </Button>
    </>
  );
}

function DetalheItensLista({
  consignacao,
  onAdicionar,
  onDevolucao,
  onAlterar,
  onExcluir,
}: Omit<DetalheItensProps, 'compacto'>) {
  return (
    <Box>
      {consignacao.status === 'ABERTA' ? (
        <Box sx={{ py: 1 }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Add />}
            onClick={onAdicionar}
          >
            Adicionar item
          </Button>
        </Box>
      ) : null}

      {(consignacao.itens ?? []).map((item) => (
        <Box key={item.id} sx={{ py: 1 }}>
          <Typography variant="body2" fontWeight={700}>
            {obterNomeProduto(item)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Enviado {item.quantidadeEnviada} · Vendido {item.quantidadeVendida}{' '}
            · Devolvido {item.quantidadeDevolvida} · Disponível{' '}
            {item.quantidadeDisponivel}
          </Typography>
          <Stack
            direction="row"
            spacing={0.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 0.5 }}
          >
            <AcoesItem
              consignacao={consignacao}
              item={item}
              onDevolucao={onDevolucao}
              onAlterar={onAlterar}
              onExcluir={onExcluir}
            />
          </Stack>
        </Box>
      ))}
    </Box>
  );
}

function DetalheItensTabela({
  consignacao,
  onAdicionar,
  onDevolucao,
  onAlterar,
  onExcluir,
}: Omit<DetalheItensProps, 'compacto'>) {
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
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Itens da Consignação #{consignacao.id}
        </Typography>

        <Button
          size="small"
          variant="outlined"
          startIcon={<Add />}
          onClick={onAdicionar}
          disabled={consignacao.status !== 'ABERTA'}
        >
          Adicionar item
        </Button>
      </Stack>

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
                <CurrencyValue value={item.valorUnitario} />
              </TableCell>
              <TableCell align="right">
                <Stack
                  direction="row"
                  spacing={0.5}
                  justifyContent="flex-end"
                  flexWrap="wrap"
                  useFlexGap
                >
                  <AcoesItem
                    consignacao={consignacao}
                    item={item}
                    onDevolucao={onDevolucao}
                    onAlterar={onAlterar}
                    onExcluir={onExcluir}
                  />
                </Stack>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function DetalheItens({ compacto, ...props }: DetalheItensProps) {
  return compacto ? (
    <DetalheItensLista {...props} />
  ) : (
    <DetalheItensTabela {...props} />
  );
}

export default function ConsignacoesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    consignacoes,
    detalheConsignacao,
    excluirItemConsignacao,
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
      excluirItemConsignacao:
        consignacaoStoreSelectors.excluirItemConsignacao(state),
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
  const [searchInput, setSearchInput] = useState(paginacao.termo ?? '');
  const [relatorioErrorMessage, setRelatorioErrorMessage] = useState<
    string | null
  >(null);
  const [itemErrorMessage, setItemErrorMessage] = useState<string | null>(null);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [revendedores, setRevendedores] = useState<Revendedor[]>([]);
  const [revendedorSelecionado, setRevendedorSelecionado] =
    useState<Revendedor | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<StatusConsignacao | ''>(
    paginacao.status ?? '',
  );
  const [ordenarPor, setOrdenarPor] = useState<'dataInclusao' | 'revendedor'>(
    paginacao.ordenarPor ?? 'dataInclusao',
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [devolucaoItem, setDevolucaoItem] = useState<ItemConsignacao | null>(
    null,
  );
  const [devolucaoConsignacao, setDevolucaoConsignacao] =
    useState<Consignacao | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemDialogConsignacao, setItemDialogConsignacao] =
    useState<Consignacao | null>(null);
  const [itemDialogItem, setItemDialogItem] = useState<ItemConsignacao | null>(
    null,
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [itemExclusaoConsignacao, setItemExclusaoConsignacao] =
    useState<Consignacao | null>(null);
  const [itemExclusao, setItemExclusao] = useState<ItemConsignacao | null>(
    null,
  );
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [fechamentoConsignacao, setFechamentoConsignacao] =
    useState<Consignacao | null>(null);

  useEffect(() => {
    void fetchConsignacoes();
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

  useEffect(() => {
    setRevendedorSelecionado(
      revendedores.find(
        (revendedor) => revendedor.id === paginacao.idRevendedor,
      ) ?? null,
    );
  }, [paginacao.idRevendedor, revendedores]);

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

  const handleOpenFechamento = async (consignacao: Consignacao) => {
    setItemErrorMessage(null);
    try {
      const detalhe = consignacao.itens
        ? consignacao
        : await obterConsignacaoPorId(consignacao.id);
      setFechamentoConsignacao(detalhe);
    } catch (error) {
      setItemErrorMessage(getProblemDetailsFromError(error).detail);
    }
  };

  const handleOpenAdicionarItem = (consignacao: Consignacao) => {
    setItemErrorMessage(null);
    setItemDialogConsignacao(consignacao);
    setItemDialogItem(null);
    setItemDialogOpen(true);
  };

  const handleOpenAlterarItem = (
    consignacao: Consignacao,
    item: ItemConsignacao,
  ) => {
    setItemErrorMessage(null);
    setItemDialogConsignacao(consignacao);
    setItemDialogItem(item);
    setItemDialogOpen(true);
  };

  const handleCloseItemDialog = () => {
    setItemDialogOpen(false);
    setItemDialogConsignacao(null);
    setItemDialogItem(null);
  };

  const handleOpenExcluirItem = (
    consignacao: Consignacao,
    item: ItemConsignacao,
  ) => {
    setItemErrorMessage(null);
    setItemExclusaoConsignacao(consignacao);
    setItemExclusao(item);
    setConfirmDeleteOpen(true);
  };

  const handleCloseConfirmDelete = () => {
    if (isDeletingItem) {
      return;
    }

    setConfirmDeleteOpen(false);
    setItemExclusaoConsignacao(null);
    setItemExclusao(null);
  };

  const handleConfirmExcluirItem = async () => {
    if (!itemExclusaoConsignacao || !itemExclusao) {
      return;
    }

    setIsDeletingItem(true);
    setItemErrorMessage(null);

    try {
      const result = await excluirItemConsignacao(
        itemExclusaoConsignacao.id,
        itemExclusao.id,
      );

      if (!result.success) {
        setItemErrorMessage(result.problem.detail);
        return;
      }

      await handleRefresh();
      showSuccess('Item da consignação excluído com sucesso.');
      setConfirmDeleteOpen(false);
      setItemExclusaoConsignacao(null);
      setItemExclusao(null);
    } finally {
      setIsDeletingItem(false);
    }
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

  const colunasConsignacoes: DataTableColumn<Consignacao>[] = [
    {
      id: 'expandir',
      header: '',
      mobile: 'actions',
      cell: (consignacao) => {
        const expanded = expandedId === consignacao.id;

        return (
          <IconButton
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              void handleExpand(consignacao.id);
            }}
            aria-label={
              expanded
                ? 'Fechar itens da consignação'
                : 'Abrir itens da consignação'
            }
          >
            {expanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        );
      },
    },
    {
      id: 'revendedor',
      header: 'Revendedor',
      mobile: 'title',
      cell: (consignacao) => consignacao.revendedor.nome,
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      cell: (consignacao) => (
        <Chip
          size="small"
          label={obterStatusLabel(consignacao.status)}
          color={obterStatusColor(consignacao.status)}
          variant="outlined"
        />
      ),
    },
    {
      id: 'dataInclusao',
      header: 'Data inclusão',
      cell: (consignacao) => formatDateTime(consignacao.dataInclusao),
    },
    {
      id: 'quantidadeEnviada',
      header: 'Enviado',
      align: 'right',
      cell: (consignacao) => consignacao.quantidadeEnviada,
    },
    {
      id: 'quantidadeVendida',
      header: 'Vendido',
      align: 'right',
      cell: (consignacao) => consignacao.quantidadeVendida,
    },
    {
      id: 'quantidadeDisponivel',
      header: 'Disponível',
      align: 'right',
      cell: (consignacao) => consignacao.quantidadeDisponivel,
    },
    {
      id: 'acoes',
      header: 'Ações',
      align: 'right',
      mobile: 'actions',
      cell: (consignacao) => (
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          <Button
            size="small"
            startIcon={<FileDownload />}
            onClick={(event) => {
              event.stopPropagation();
              void handleDownloadRelatorio(consignacao.id);
            }}
          >
            PDF
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<TaskAlt />}
            aria-label="Fechar consignação"
            onClick={(event) => {
              event.stopPropagation();
              void handleOpenFechamento(consignacao);
            }}
            disabled={
              consignacao.status !== 'ABERTA' ||
              consignacao.quantidadeDisponivel <= 0
            }
          >
            Fechar
          </Button>
        </Stack>
      ),
    },
  ];

  const renderDetalhe = (consignacao: Consignacao) => {
    const detalhe =
      expandedId === consignacao.id && consignacaoExpandida
        ? consignacaoExpandida
        : consignacao;

    return (
      <DetalheItens
        consignacao={detalhe}
        compacto={isMobile}
        onAdicionar={() => handleOpenAdicionarItem(detalhe)}
        onDevolucao={(item) => handleOpenDevolucao(detalhe, item)}
        onAlterar={(item) => handleOpenAlterarItem(detalhe, item)}
        onExcluir={(item) => handleOpenExcluirItem(detalhe, item)}
      />
    );
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Consignações"
        description="Controle as peças enviadas, vendidas, devolvidas e ainda disponíveis com revendedores."
        actions={
          <>
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
          </>
        }
      />

      <SearchFilterPanel
        defaultCollapsedOnMobile
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

      {itemErrorMessage ? (
        <Alert severity="error">{itemErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={consignacoes}
        columns={colunasConsignacoes}
        getRowId={(consignacao) => consignacao.id}
        ariaLabel="tabela de consignações"
        emptyMessage="Nenhuma consignação cadastrada até o momento."
        isLoading={isFetching}
        expandedRow={{
          isExpanded: (consignacao) => expandedId === consignacao.id,
          render: renderDetalhe,
        }}
        pagination={{
          count: totalConsignacoes,
          page: Math.max(0, paginacao.pagina - 1),
          rowsPerPage: paginacao.tamanhoPagina,
          onPageChange: (novaPagina) => {
            void fetchConsignacoes({ pagina: novaPagina + 1 });
          },
          onRowsPerPageChange: (novoTamanho) => {
            void fetchConsignacoes({ pagina: 1, tamanhoPagina: novoTamanho });
          },
        }}
      />

      <ConsignacaoDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleRefresh}
      />
      <ItemConsignacaoDialog
        open={itemDialogOpen}
        consignacao={itemDialogConsignacao}
        item={itemDialogItem}
        onClose={handleCloseItemDialog}
        onSaved={handleRefresh}
      />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Excluir item"
        message="Este item será removido da consignação. Essa ação não pode ser desfeita."
        confirmLabel="Confirmar exclusão"
        destructive
        isLoading={isDeletingItem}
        loadingLabel="Excluindo..."
        onConfirm={() => {
          void handleConfirmExcluirItem();
        }}
        onClose={handleCloseConfirmDelete}
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
      <FecharConsignacaoDialog
        open={fechamentoConsignacao !== null}
        consignacao={fechamentoConsignacao}
        onClose={() => setFechamentoConsignacao(null)}
        onSaved={handleRefresh}
      />
    </Stack>
  );
}
