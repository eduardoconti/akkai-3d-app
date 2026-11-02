import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Portal,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Close,
  KeyboardArrowDown,
  KeyboardArrowUp,
  MoreVert,
  SwapHoriz,
} from '@mui/icons-material';
import ExchangeReturnDialog from '../components/exchange-return-dialog';
import NewSaleDialog from '../components/new-sale-dialog';
import { saleStoreSelectors, useSaleStore } from '../store/use-sale-store';
import {
  getPaymentMethodLabel,
  getSaleTypeLabel,
} from '../utils/format-sale-labels';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import { listAllProducts } from '@/features/products/api/products-api';
import {
  DateRangePickerField,
  PageHeader,
  ProductAutocompleteField,
  ResponsiveDataTable,
  SearchFilterPanel,
  TableColumnVisibilityButton,
  formatCurrencyWithVisibility,
  formatValueWithVisibility,
  formatLocalDate,
  useTableColumnVisibility,
  useFeedbackStore,
  useOnlineStatus,
  useValueVisibilityStore,
  type DataTableColumn,
  type DataTablePagination,
  type TableColumnOption,
  type MeioPagamento,
  type Feira,
  type Produto,
  type TipoVenda,
  type Venda,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

function getSaleItemName(vendaItem: Venda['itens'][number]): string {
  return vendaItem.nomeProduto || vendaItem.produto?.nome || 'Item sem nome';
}

function formatSaleValue(value: number, hideValues: boolean): string {
  return formatCurrencyWithVisibility(value, hideValues);
}

interface CardTooltipLine {
  label: string;
  value: string;
}

interface CardTooltipState {
  x: number;
  y: number;
  lines: CardTooltipLine[];
}

function getSalePayments(venda: Venda): Venda['pagamentos'] {
  return venda.pagamentos ?? [];
}

function formatUniqueLabels(labels: string[]): string {
  const uniqueLabels = [...new Set(labels.filter(Boolean))];
  return uniqueLabels.length > 0 ? uniqueLabels.join(' + ') : '-';
}

function getSaleWalletLabel(venda: Venda): string {
  return formatUniqueLabels(
    getSalePayments(venda).map(
      (pagamento) =>
        pagamento.carteira?.nome ?? `Carteira #${pagamento.idCarteira}`,
    ),
  );
}

function getSalePaymentMethodLabel(venda: Venda): string {
  return formatUniqueLabels(
    getSalePayments(venda).map((pagamento) =>
      getPaymentMethodLabel(pagamento.meioPagamento),
    ),
  );
}

function getSalePaymentTotal(
  venda: Venda,
  key: 'valorTaxa' | 'valorImposto',
): number | null {
  const pagamentos = getSalePayments(venda);

  if (!pagamentos.some((pagamento) => pagamento[key] != null)) {
    return null;
  }

  return pagamentos.reduce(
    (total, pagamento) => total + (pagamento[key] ?? 0),
    0,
  );
}

type SaleTableColumnId =
  | 'id'
  | 'data'
  | 'tipo'
  | 'feira'
  | 'carteira'
  | 'pagamento'
  | 'desconto'
  | 'taxa'
  | 'imposto'
  | 'total'
  | 'liquido';

const SALE_TABLE_COLUMNS: readonly TableColumnOption<SaleTableColumnId>[] = [
  { id: 'id', label: 'ID', required: true },
  { id: 'data', label: 'Data' },
  { id: 'tipo', label: 'Tipo' },
  { id: 'feira', label: 'Feira' },
  { id: 'carteira', label: 'Carteira' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'desconto', label: 'Desconto' },
  { id: 'taxa', label: 'Taxa' },
  { id: 'imposto', label: 'Imposto' },
  { id: 'total', label: 'Total' },
  { id: 'liquido', label: 'Líquido' },
];

const DEFAULT_SALE_TABLE_COLUMN_IDS: readonly SaleTableColumnId[] = [
  'id',
  'data',
  'tipo',
  'feira',
  'carteira',
  'pagamento',
  'desconto',
  'taxa',
  'imposto',
  'total',
  'liquido',
];

const EXPAND_COLUMN_ID = 'expandir';
const ACTIONS_COLUMN_ID = 'acoes';

interface SaleDetailsProps {
  venda: Venda;
  hideValues: boolean;
}

function SaleDetails({ venda, hideValues }: SaleDetailsProps) {
  const pagamentos = getSalePayments(venda);
  const valorTaxa = getSalePaymentTotal(venda, 'valorTaxa');
  const valorImposto = getSalePaymentTotal(venda, 'valorImposto');

  return (
    <Box
      sx={{
        m: { xs: 0, md: 2 },
        mt: { xs: 1.5, md: 2 },
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50',
        p: { xs: 1.5, md: 2 },
        borderRadius: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        Itens da Venda #{venda.id}
      </Typography>
      <Stack
        direction="row"
        spacing={2}
        flexWrap="wrap"
        useFlexGap
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" color="text.secondary">
          Taxa:{' '}
          {valorTaxa != null ? formatSaleValue(valorTaxa, hideValues) : '-'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Imposto:{' '}
          {valorImposto != null
            ? formatSaleValue(valorImposto, hideValues)
            : '-'}
        </Typography>
        <Typography variant="body2" fontWeight={700} color="success.main">
          Líquido:{' '}
          {formatSaleValue(venda.valorLiquido ?? venda.valorTotal, hideValues)}
        </Typography>
      </Stack>
      <TableContainer sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Carteira</TableCell>
              <TableCell>Meio</TableCell>
              <TableCell align="right">Valor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagamentos.map((pagamento) => (
              <TableRow key={pagamento.id}>
                <TableCell>
                  {pagamento.carteira?.nome ??
                    `Carteira #${pagamento.idCarteira}`}
                </TableCell>
                <TableCell>
                  {getPaymentMethodLabel(pagamento.meioPagamento)}
                </TableCell>
                <TableCell align="right">
                  {formatSaleValue(pagamento.valor, hideValues)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID Produto</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell align="right">Qtd</TableCell>
              <TableCell align="right">Unitário</TableCell>
              <TableCell align="right">Total Item</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {venda.itens.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.idProduto ?? '-'}</TableCell>
                <TableCell>{getSaleItemName(item)}</TableCell>
                <TableCell align="right">{item.quantidade}</TableCell>
                <TableCell align="right">
                  {formatSaleValue(item.valorUnitario, hideValues)}
                </TableCell>
                <TableCell align="right">
                  {formatSaleValue(item.valorTotal, hideValues)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default function SalesPage() {
  const { openNewSaleDialog } = useMainLayoutActions();
  const isOnline = useOnlineStatus();
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const hideValues = useValueVisibilityStore((state) => state.hideValues);
  const {
    carteiras,
    excluirVenda,
    feiras,
    fetchCarteiras,
    fetchErrorMessage,
    fetchFeiras,
    fetchVendas,
    isFetching,
    isSubmitting,
    paginacao,
    submitErrorMessage,
    totalItens,
    totalizadores,
    vendas,
  } = useSaleStore(
    useShallow((state) => ({
      excluirVenda: saleStoreSelectors.excluirVenda(state),
      carteiras: saleStoreSelectors.carteiras(state),
      feiras: saleStoreSelectors.feiras(state),
      fetchCarteiras: saleStoreSelectors.fetchCarteiras(state),
      fetchErrorMessage: saleStoreSelectors.fetchErrorMessage(state),
      fetchFeiras: saleStoreSelectors.fetchFeiras(state),
      fetchVendas: saleStoreSelectors.fetchVendas(state),
      isFetching: saleStoreSelectors.isFetching(state),
      isSubmitting: saleStoreSelectors.isSubmitting(state),
      paginacao: saleStoreSelectors.paginacao(state),
      submitErrorMessage: saleStoreSelectors.submitErrorMessage(state),
      totalItens: saleStoreSelectors.totalItens(state),
      totalizadores: saleStoreSelectors.totalizadores(state),
      vendas: saleStoreSelectors.vendas(state),
    })),
  );
  const [dateRange, setDateRange] = useState({
    startValue: paginacao.dataInicio ?? '',
    endValue: paginacao.dataFim ?? '',
  });
  const [type, setType] = useState<'TODOS' | TipoVenda>(
    paginacao.tipo ?? 'TODOS',
  );
  const [idFeira, setIdFeira] = useState<number | ''>(paginacao.idFeira ?? '');
  const [idProduto, setIdProduto] = useState<number | ''>(
    paginacao.idProduto ?? '',
  );
  const [idCarteira, setIdCarteira] = useState<number | ''>(
    paginacao.idCarteira ?? '',
  );
  const [meioPagamento, setMeioPagamento] = useState<MeioPagamento | ''>(
    paginacao.meioPagamento ?? '',
  );
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [editingSale, setEditingSale] = useState<Venda | null>(null);
  const [isExchangeReturnOpen, setIsExchangeReturnOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Venda | null>(null);
  const [selectedSale, setSelectedSale] = useState<Venda | null>(null);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [cardTooltip, setCardTooltip] = useState<CardTooltipState | null>(null);
  const [expandedSaleIds, setExpandedSaleIds] = useState<Set<number>>(
    () => new Set(),
  );
  const { visibleColumnIds, toggleColumnVisibility, resetColumnVisibility } =
    useTableColumnVisibility<SaleTableColumnId>(
      'akkai:sales-page:vendas:columns',
      SALE_TABLE_COLUMNS,
      DEFAULT_SALE_TABLE_COLUMN_IDS,
    );
  const tableVisibleColumnIds = useMemo(
    () => [EXPAND_COLUMN_ID, ...visibleColumnIds, ACTIONS_COLUMN_ID],
    [visibleColumnIds],
  );

  const handleToggleExpanded = (
    event: React.MouseEvent<HTMLButtonElement>,
    venda: Venda,
  ) => {
    event.stopPropagation();
    setExpandedSaleIds((current) => {
      const next = new Set(current);

      if (!next.delete(venda.id)) {
        next.add(venda.id);
      }

      return next;
    });
  };

  const handleSearch = () => {
    void fetchVendas({
      pagina: 1,
      dataInicio: dateRange.startValue,
      dataFim: dateRange.endValue,
      tipo: type === 'TODOS' ? undefined : type,
      idFeira: type === 'FEIRA' && idFeira !== '' ? idFeira : undefined,
      idProduto: idProduto === '' ? undefined : idProduto,
      idCarteira: idCarteira === '' ? undefined : idCarteira,
      meioPagamento: meioPagamento === '' ? undefined : meioPagamento,
    });
  };

  const handleClearFilters = () => {
    setDateRange({ startValue: '', endValue: '' });
    setType('TODOS');
    setIdFeira('');
    setIdProduto('');
    setIdCarteira('');
    setMeioPagamento('');
    void fetchVendas({
      pagina: 1,
      dataInicio: '',
      dataFim: '',
      tipo: undefined,
      idFeira: undefined,
      idProduto: undefined,
      idCarteira: undefined,
      meioPagamento: undefined,
    });
  };

  useEffect(() => {
    void fetchFeiras();
    void fetchCarteiras();
    void fetchVendas();
  }, [fetchCarteiras, fetchFeiras, fetchVendas]);

  useEffect(() => {
    let isMounted = true;

    setIsLoadingProducts(true);
    listAllProducts()
      .then((items) => {
        if (isMounted) {
          setProdutos(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setProdutos([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (type !== 'FEIRA') {
      setIdFeira('');
    }
  }, [type]);

  const handleOpenActions = (
    event: React.MouseEvent<HTMLButtonElement>,
    venda: Venda,
  ) => {
    event.stopPropagation();
    setSelectedSale(venda);
    setActionsAnchorEl(event.currentTarget);
  };

  const handleCloseActions = () => {
    setActionsAnchorEl(null);
    setSelectedSale(null);
  };

  const handleStartEdit = () => {
    if (!selectedSale) {
      return;
    }

    setEditingSale(selectedSale);
    handleCloseActions();
  };

  const handleAskDelete = () => {
    if (!selectedSale) {
      return;
    }

    setSaleToDelete(selectedSale);
    handleCloseActions();
  };

  const handleConfirmDelete = async () => {
    if (!saleToDelete) {
      return;
    }

    setIsDeletingSale(true);

    try {
      const result = await excluirVenda(saleToDelete.id);

      if (!result.success) {
        return;
      }

      await fetchVendas();
      showSuccess('Venda excluída com sucesso.');
      setSaleToDelete(null);
    } finally {
      setIsDeletingSale(false);
    }
  };

  const isDeleteBusy = isSubmitting || isDeletingSale;

  const handleCloseDeleteDialog = () => {
    if (isDeleteBusy) {
      return;
    }

    setSaleToDelete(null);
  };

  const tablePagination: DataTablePagination = {
    count: totalItens,
    page: Math.max(0, paginacao.pagina - 1),
    rowsPerPage: paginacao.tamanhoPagina,
    onPageChange: (novaPagina) => {
      void fetchVendas({ pagina: novaPagina + 1 });
    },
    onRowsPerPageChange: (novoTamanho) => {
      void fetchVendas({ pagina: 1, tamanhoPagina: novoTamanho });
    },
  };

  const saleColumns: DataTableColumn<Venda>[] = [
    {
      id: EXPAND_COLUMN_ID,
      header: '',
      mobile: 'actions',
      cell: (venda) => {
        const isExpanded = expandedSaleIds.has(venda.id);

        return (
          <IconButton
            size="small"
            aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} detalhes da venda ${venda.id}`}
            aria-expanded={isExpanded}
            onClick={(event) => handleToggleExpanded(event, venda)}
          >
            {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        );
      },
    },
    {
      id: 'id',
      header: 'ID',
      mobile: 'eyebrow',
      cell: (venda) => `Venda #${venda.id}`,
    },
    {
      id: 'data',
      header: 'Data',
      mobile: 'title',
      cell: (venda) =>
        formatLocalDate(
          venda.dataVenda ?? venda.dataInclusao,
          'display-date-time',
        ),
    },
    {
      id: 'tipo',
      header: 'Tipo',
      mobile: 'badge',
      cell: (venda) => (
        <Chip
          label={getSaleTypeLabel(venda.tipo)}
          size="small"
          color={venda.tipo === 'FEIRA' ? 'secondary' : 'primary'}
          variant="outlined"
        />
      ),
    },
    {
      id: 'pagamento',
      header: 'Pagamento',
      mobile: 'badge',
      cell: (venda) => (
        <Chip
          label={getSalePaymentMethodLabel(venda)}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: 'total',
      header: 'Total',
      mobile: 'aside',
      align: 'right',
      cell: (venda) => (
        <Typography
          component="span"
          variant="inherit"
          fontWeight={700}
          sx={{ fontSize: { xs: '1rem', md: 'inherit' } }}
        >
          {formatSaleValue(venda.valorTotal, hideValues)}
        </Typography>
      ),
    },
    {
      id: 'feira',
      header: 'Feira',
      cell: (venda) => venda.feira?.nome ?? '-',
    },
    {
      id: 'carteira',
      header: 'Carteira',
      cell: (venda) => getSaleWalletLabel(venda),
    },
    {
      id: 'desconto',
      header: 'Desconto',
      align: 'right',
      cell: (venda) =>
        venda.desconto > 0 ? formatSaleValue(venda.desconto, hideValues) : '-',
    },
    {
      id: 'taxa',
      header: 'Taxa',
      align: 'right',
      cell: (venda) => {
        const valorTaxa = getSalePaymentTotal(venda, 'valorTaxa');
        return valorTaxa != null ? formatSaleValue(valorTaxa, hideValues) : '-';
      },
    },
    {
      id: 'imposto',
      header: 'Imposto',
      align: 'right',
      cell: (venda) => {
        const valorImposto = getSalePaymentTotal(venda, 'valorImposto');
        return valorImposto != null
          ? formatSaleValue(valorImposto, hideValues)
          : '-';
      },
    },
    {
      id: 'liquido',
      header: 'Líquido',
      align: 'right',
      cell: (venda) => (
        <Typography
          component="span"
          variant="inherit"
          fontWeight={700}
          color="success.main"
        >
          {formatSaleValue(venda.valorLiquido ?? venda.valorTotal, hideValues)}
        </Typography>
      ),
    },
    {
      // Exibida apenas nos cartões mobile: fica fora de `tableVisibleColumnIds`.
      id: 'itens',
      header: 'Itens',
      cell: (venda) => venda.itens.map(getSaleItemName).join(', '),
    },
    {
      id: ACTIONS_COLUMN_ID,
      header: 'Ações',
      mobile: 'actions',
      align: 'center',
      cell: (venda) => (
        <IconButton
          size="small"
          aria-label={`Ações da venda ${venda.id}`}
          onClick={(event) => handleOpenActions(event, venda)}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      ),
    },
  ];

  const handleCardMouseMove =
    (lines: CardTooltipLine[]) => (event: React.MouseEvent<HTMLDivElement>) => {
      setCardTooltip({ x: event.clientX, y: event.clientY, lines });
    };

  return (
    <Stack spacing={3}>
      {cardTooltip ? (
        <Portal>
          <Paper
            elevation={3}
            sx={{
              position: 'fixed',
              left: cardTooltip.x + 14,
              top: cardTooltip.y - 14,
              px: 1.5,
              py: 1,
              pointerEvents: 'none',
              zIndex: 1400,
              borderRadius: 2,
            }}
          >
            <Stack spacing={0.5}>
              {cardTooltip.lines.map((line) => (
                <Stack
                  key={line.label}
                  direction="row"
                  spacing={1.5}
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="caption" color="text.secondary">
                    {line.label}
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {line.value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Portal>
      ) : null}

      <PageHeader
        title="Vendas"
        description="Acompanhe as últimas vendas com contexto de feira, pagamento e itens."
        actionLabel="Nova venda"
        onAction={openNewSaleDialog}
        actions={
          <Button
            variant="outlined"
            startIcon={<SwapHoriz />}
            onClick={() => setIsExchangeReturnOpen(true)}
            disabled={!isOnline}
          >
            Troca/devolução
          </Button>
        }
      />

      <Box>
        <SearchFilterPanel
          onSearch={handleSearch}
          onClear={handleClearFilters}
          columns={{ xs: 12, md: 12, lg: 24 }}
        >
          <Grid size={{ xs: 12, md: 6, lg: type === 'FEIRA' ? 5 : 6 }}>
            <DateRangePickerField
              label="Período"
              startValue={dateRange.startValue}
              endValue={dateRange.endValue}
              onValueChange={setDateRange}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: 3 }}>
            <TextField
              select
              fullWidth
              label="Tipo"
              value={type}
              onChange={(event) =>
                setType(event.target.value as 'TODOS' | TipoVenda)
              }
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              <MenuItem value="FEIRA">Feira</MenuItem>
              <MenuItem value="LOJA">Loja</MenuItem>
              <MenuItem value="ONLINE">Online</MenuItem>
              <MenuItem value="CONSIGNACAO">Consignação</MenuItem>
            </TextField>
          </Grid>

          {type === 'FEIRA' ? (
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <TextField
                select
                fullWidth
                label="Feira"
                value={idFeira}
                onChange={(event) =>
                  setIdFeira(
                    event.target.value === '' ? '' : Number(event.target.value),
                  )
                }
                helperText={
                  feiras.length === 0 ? 'Nenhuma feira cadastrada.' : undefined
                }
              >
                <MenuItem value="">Todas</MenuItem>
                {feiras.map((feira: Feira) => (
                  <MenuItem key={feira.id} value={feira.id}>
                    {feira.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          ) : null}

          <Grid size={{ xs: 12, md: 6, lg: 5 }}>
            <ProductAutocompleteField
              products={produtos}
              productId={idProduto}
              onChange={(produto) => setIdProduto(produto?.id ?? '')}
              label="Produto"
              helperText={
                isLoadingProducts
                  ? 'Carregando produtos...'
                  : produtos.length === 0
                    ? 'Nenhum produto cadastrado.'
                    : undefined
              }
              loading={isLoadingProducts}
              disabled={isLoadingProducts || produtos.length === 0}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: type === 'FEIRA' ? 4 : 5 }}>
            <TextField
              select
              fullWidth
              label="Carteira"
              value={idCarteira}
              onChange={(event) =>
                setIdCarteira(
                  event.target.value === '' ? '' : Number(event.target.value),
                )
              }
            >
              <MenuItem value="">Todas</MenuItem>
              {carteiras.map((carteira) => (
                <MenuItem key={carteira.id} value={carteira.id}>
                  {carteira.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: type === 'FEIRA' ? 4 : 5 }}>
            <TextField
              select
              fullWidth
              label="Pagamento"
              value={meioPagamento}
              onChange={(event) =>
                setMeioPagamento(
                  event.target.value === ''
                    ? ''
                    : (event.target.value as MeioPagamento),
                )
              }
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="DIN">Dinheiro</MenuItem>
              <MenuItem value="DEB">Cartão débito</MenuItem>
              <MenuItem value="CRE">Cartão crédito</MenuItem>
              <MenuItem value="PIX">Pix</MenuItem>
            </TextField>
          </Grid>
        </SearchFilterPanel>
      </Box>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper
            variant="outlined"
            sx={{ p: 2, cursor: 'default' }}
            onMouseMove={handleCardMouseMove([
              {
                label: 'Catálogo',
                value: String(totalizadores.quantidadeItensCatalogo ?? 0),
              },
              {
                label: 'Brindes',
                value: String(totalizadores.quantidadeBrindes ?? 0),
              },
              {
                label: 'Avulsos',
                value: String(totalizadores.quantidadeItensAvulsos ?? 0),
              },
            ])}
            onMouseLeave={() => setCardTooltip(null)}
          >
            <Typography variant="body2" color="text.secondary">
              Itens
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {formatValueWithVisibility(
                String(totalizadores.quantidadeItensVendidos ?? 0),
                hideValues,
              )}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Desconto total
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {formatSaleValue(totalizadores.descontoTotal, hideValues)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Valor total das vendas
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {formatSaleValue(totalizadores.valorTotal, hideValues)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Valor líquido das vendas
            </Typography>
            <Typography variant="h6" fontWeight={700} color="success.main">
              {formatSaleValue(totalizadores.valorLiquido, hideValues)}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      {submitErrorMessage ? (
        <Alert severity="error">{submitErrorMessage}</Alert>
      ) : null}

      <ResponsiveDataTable
        rows={vendas}
        columns={saleColumns}
        getRowId={(venda) => venda.id}
        ariaLabel="tabela de vendas"
        emptyMessage="Nenhuma venda encontrada para os filtros informados."
        isLoading={isFetching}
        visibleColumnIds={tableVisibleColumnIds}
        toolbar={
          <TableColumnVisibilityButton
            columns={SALE_TABLE_COLUMNS}
            visibleColumnIds={visibleColumnIds}
            onToggleColumn={toggleColumnVisibility}
            onResetColumns={resetColumnVisibility}
          />
        }
        expandedRow={{
          isExpanded: (venda) => expandedSaleIds.has(venda.id),
          render: (venda) => (
            <SaleDetails venda={venda} hideValues={hideValues} />
          ),
        }}
        pagination={tablePagination}
      />

      <Menu
        anchorEl={actionsAnchorEl}
        open={Boolean(actionsAnchorEl)}
        onClose={handleCloseActions}
      >
        <MenuItem
          onClick={handleStartEdit}
          disabled={!isOnline || isDeleteBusy}
        >
          Alterar
        </MenuItem>
        <MenuItem
          onClick={handleAskDelete}
          disabled={!isOnline || isDeleteBusy}
        >
          Excluir
        </MenuItem>
      </Menu>

      <Dialog open={Boolean(saleToDelete)} onClose={handleCloseDeleteDialog}>
        <DialogTitle sx={{ px: 3, py: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Excluir venda
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Confirme a remoção da venda selecionada.
              </Typography>
            </Box>

            <IconButton
              onClick={handleCloseDeleteDialog}
              aria-label="Fechar modal de exclusão de venda"
              disabled={isDeleteBusy}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Tem certeza que deseja excluir a venda #{saleToDelete?.id}? Essa
            ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleteBusy}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              void handleConfirmDelete();
            }}
            disabled={isDeleteBusy}
          >
            {isDeleteBusy ? 'Excluindo...' : 'Confirmar exclusão'}
          </Button>
        </DialogActions>
      </Dialog>

      <NewSaleDialog
        open={Boolean(editingSale)}
        onClose={() => {
          setEditingSale(null);
        }}
        sale={editingSale}
        onSaved={async () => {
          await fetchVendas({ pagina: 1 });
        }}
      />

      <ExchangeReturnDialog
        open={isExchangeReturnOpen}
        onClose={() => setIsExchangeReturnOpen(false)}
        onSaved={async () => {
          await fetchCarteiras();
        }}
        produtos={produtos}
        carteiras={carteiras}
        isLoadingProducts={isLoadingProducts}
      />
    </Stack>
  );
}
