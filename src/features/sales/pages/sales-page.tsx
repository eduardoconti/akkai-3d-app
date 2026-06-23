import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Close,
  KeyboardArrowDown,
  KeyboardArrowUp,
  MoreVert,
  SwapHoriz,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import ExchangeReturnDialog from '../components/exchange-return-dialog';
import NewSaleDialog from '../components/new-sale-dialog';
import { saleStoreSelectors, useSaleStore } from '../store/use-sale-store';
import {
  getPaymentMethodLabel,
  getSaleTypeLabel,
} from '../utils/format-sale-labels';
import { listAllProducts } from '@/features/products/api/products-api';
import {
  DateRangePickerField,
  PAGINATED_SEARCH_PAGE_SIZE_OPTIONS,
  ProductAutocompleteField,
  SearchFilterPanel,
  formatCurrencyWithVisibility,
  formatLocalDate,
  useFeedbackStore,
  useOnlineStatus,
  useValueVisibilityStore,
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

interface SaleRowProps {
  venda: Venda;
  hideValues: boolean;
  onOpenActions: (
    event: React.MouseEvent<HTMLButtonElement>,
    venda: Venda,
  ) => void;
}

function SaleRow({ venda, hideValues, onOpenActions }: SaleRowProps) {
  const [open, setOpen] = useState(false);
  const pagamentos = getSalePayments(venda);
  const valorTaxa = getSalePaymentTotal(venda, 'valorTaxa');
  const valorImposto = getSalePaymentTotal(venda, 'valorImposto');

  return (
    <>
      <TableRow
        sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }}
        onClick={() => setOpen((current) => !current)}
      >
        <TableCell>
          <IconButton size="small">
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          #{venda.id}
        </TableCell>
        <TableCell>
          {formatLocalDate(
            venda.dataVenda ?? venda.dataInclusao,
            'display-date-time',
          )}
        </TableCell>
        <TableCell>
          <Chip
            label={getSaleTypeLabel(venda.tipo)}
            size="small"
            color={venda.tipo === 'FEIRA' ? 'secondary' : 'primary'}
            variant="outlined"
          />
        </TableCell>
        <TableCell>{venda.feira?.nome ?? '-'}</TableCell>
        <TableCell>{getSaleWalletLabel(venda)}</TableCell>
        <TableCell>{getSalePaymentMethodLabel(venda)}</TableCell>
        <TableCell align="right">
          {venda.desconto > 0
            ? formatSaleValue(venda.desconto, hideValues)
            : '-'}
        </TableCell>
        <TableCell align="right">
          {valorTaxa != null ? formatSaleValue(valorTaxa, hideValues) : '-'}
        </TableCell>
        <TableCell align="right">
          {valorImposto != null
            ? formatSaleValue(valorImposto, hideValues)
            : '-'}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 700 }}>
          {formatSaleValue(venda.valorTotal, hideValues)}
        </TableCell>
        <TableCell
          align="right"
          sx={{ fontWeight: 700, color: 'success.main' }}
        >
          {formatSaleValue(venda.valorLiquido ?? venda.valorTotal, hideValues)}
        </TableCell>
        <TableCell align="center">
          <IconButton
            size="small"
            aria-label={`Ações da venda ${venda.id}`}
            onClick={(event) => {
              event.stopPropagation();
              onOpenActions(event, venda);
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={13}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box
              sx={{
                m: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.03)'
                    : 'grey.50',
                p: 2,
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
                  {valorTaxa != null
                    ? formatSaleValue(valorTaxa, hideValues)
                    : '-'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Imposto:{' '}
                  {valorImposto != null
                    ? formatSaleValue(valorImposto, hideValues)
                    : '-'}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color="success.main"
                >
                  Líquido:{' '}
                  {formatSaleValue(
                    venda.valorLiquido ?? venda.valorTotal,
                    hideValues,
                  )}
                </Typography>
              </Stack>
              <Table size="small" sx={{ mb: 2 }}>
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
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function SalesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
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
  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Venda | null>(null);
  const [isExchangeReturnOpen, setIsExchangeReturnOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Venda | null>(null);
  const [selectedSale, setSelectedSale] = useState<Venda | null>(null);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<HTMLElement | null>(
    null,
  );
  const [isDeletingSale, setIsDeletingSale] = useState(false);

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

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Vendas
          </Typography>
          <Typography color="text.secondary">
            Acompanhe as últimas vendas com contexto de feira, pagamento e
            itens.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button
            variant="outlined"
            startIcon={<SwapHoriz />}
            onClick={() => setIsExchangeReturnOpen(true)}
            disabled={!isOnline}
          >
            Troca/devolução
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setIsNewSaleOpen(true)}
          >
            Nova venda
          </Button>
        </Stack>
      </Stack>

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
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Desconto total
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {formatSaleValue(totalizadores.descontoTotal, hideValues)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Valor total das vendas
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {formatSaleValue(totalizadores.valorTotal, hideValues)}
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
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

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de vendas">
            {isFetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : vendas.length > 0 ? (
              vendas.map((venda) => {
                const valorTaxa = getSalePaymentTotal(venda, 'valorTaxa');
                const valorImposto = getSalePaymentTotal(venda, 'valorImposto');

                return (
                  <Box key={venda.id} sx={{ px: 2, py: 2 }}>
                    <Stack spacing={1.25}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1}
                      >
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Venda #{venda.id}
                          </Typography>
                          <Typography variant="body2">
                            {formatLocalDate(
                              venda.dataVenda ?? venda.dataInclusao,
                              'display-date-time',
                            )}
                          </Typography>
                        </Box>
                        <Stack
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                        >
                          <Typography variant="subtitle1" fontWeight={700}>
                            {formatSaleValue(venda.valorTotal, hideValues)}
                          </Typography>
                          <IconButton
                            size="small"
                            aria-label={`Ações da venda ${venda.id}`}
                            onClick={(event) => handleOpenActions(event, venda)}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>

                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Chip
                          label={getSaleTypeLabel(venda.tipo)}
                          size="small"
                          color={
                            venda.tipo === 'FEIRA' ? 'secondary' : 'primary'
                          }
                          variant="outlined"
                        />
                        <Chip
                          label={getSalePaymentMethodLabel(venda)}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>

                      <Typography variant="body2" color="text.secondary">
                        Feira: {venda.feira?.nome ?? '-'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Carteira: {getSaleWalletLabel(venda)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Desconto:{' '}
                        {venda.desconto > 0
                          ? formatSaleValue(venda.desconto, hideValues)
                          : '-'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Taxa:{' '}
                        {valorTaxa != null
                          ? formatSaleValue(valorTaxa, hideValues)
                          : '-'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Imposto:{' '}
                        {valorImposto != null
                          ? formatSaleValue(valorImposto, hideValues)
                          : '-'}
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color="success.main"
                      >
                        Líquido:{' '}
                        {formatSaleValue(
                          venda.valorLiquido ?? venda.valorTotal,
                          hideValues,
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Itens: {venda.itens.map(getSaleItemName).join(', ')}
                      </Typography>
                    </Stack>
                  </Box>
                );
              })
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhuma venda encontrada para os filtros informados.
              </Box>
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de vendas">
              <TableHead>
                <TableRow>
                  <TableCell width={48} />
                  <TableCell>
                    <strong>ID</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Data</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Tipo</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Feira</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Carteira</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Pagamento</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Desconto</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Taxa</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Imposto</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Total</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Líquido</strong>
                  </TableCell>
                  <TableCell align="center" width={80}>
                    <strong>Ações</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : vendas.length > 0 ? (
                  vendas.map((venda) => (
                    <SaleRow
                      key={venda.id}
                      venda={venda}
                      hideValues={hideValues}
                      onOpenActions={handleOpenActions}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={13} align="center" sx={{ py: 6 }}>
                      Nenhuma venda encontrada para os filtros informados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={totalItens}
          page={Math.max(0, paginacao.pagina - 1)}
          onPageChange={(_event, newPage) => {
            void fetchVendas({ pagina: newPage + 1 });
          }}
          rowsPerPage={paginacao.tamanhoPagina}
          onRowsPerPageChange={(event) => {
            void fetchVendas({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
          rowsPerPageOptions={PAGINATED_SEARCH_PAGE_SIZE_OPTIONS}
          labelRowsPerPage="Itens por página"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
          sx={{
            '.MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              justifyContent: { xs: 'center', sm: 'flex-end' },
              gap: 1,
              px: { xs: 1, sm: 2 },
            },
          }}
        />
      </Paper>

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
        open={isNewSaleOpen || Boolean(editingSale)}
        onClose={() => {
          setIsNewSaleOpen(false);
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
