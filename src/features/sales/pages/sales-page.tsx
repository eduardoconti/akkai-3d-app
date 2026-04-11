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
  Close,
  KeyboardArrowDown,
  KeyboardArrowUp,
  MoreVert,
  Search,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import NewSaleDialog from '../components/new-sale-dialog';
import { useSaleStore } from '../store/use-sale-store';
import {
  getPaymentMethodLabel,
  getSaleTypeLabel,
} from '../utils/format-sale-labels';
import {
  DatePickerField,
  formatCurrency,
  useFeedbackStore,
  useOnlineStatus,
  type Feira,
  type TipoVenda,
  type Venda,
} from '@/shared';

function getCurrentDateInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getSaleItemName(vendaItem: Venda['itens'][number]): string {
  return vendaItem.nomeProduto || vendaItem.produto?.nome || 'Item sem nome';
}

interface SaleRowProps {
  venda: Venda;
  onOpenActions: (
    event: React.MouseEvent<HTMLButtonElement>,
    venda: Venda,
  ) => void;
}

function SaleRow({ venda, onOpenActions }: SaleRowProps) {
  const [open, setOpen] = useState(false);

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
          {new Date(venda.dataInclusao).toLocaleString('pt-BR')}
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
        <TableCell>{venda.carteira?.nome ?? '-'}</TableCell>
        <TableCell>{getPaymentMethodLabel(venda.meioPagamento)}</TableCell>
        <TableCell align="right">
          {venda.desconto > 0 ? formatCurrency(venda.desconto) : '-'}
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 700 }}>
          {formatCurrency(venda.valorTotal)}
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
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
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
                        {formatCurrency(item.valorUnitario)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.valorTotal)}
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
  const {
    excluirVenda,
    feiras,
    fetchErrorMessage,
    fetchFeiras,
    fetchVendas,
    isFetching,
    isSubmitting,
    paginacao,
    submitErrorMessage,
    totalItens,
    vendas,
  } = useSaleStore();
  const initialDate = getCurrentDateInput();
  const [dataInicio, setDataInicio] = useState(initialDate);
  const [dataFim, setDataFim] = useState(initialDate);
  const [type, setType] = useState<'TODOS' | TipoVenda>('TODOS');
  const [idFeira, setIdFeira] = useState<number | ''>('');
  const [editingSale, setEditingSale] = useState<Venda | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Venda | null>(null);
  const [selectedSale, setSelectedSale] = useState<Venda | null>(null);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<HTMLElement | null>(null);
  const [isDeletingSale, setIsDeletingSale] = useState(false);

  const handleSearch = () => {
    void fetchVendas({
      pagina: 1,
      dataInicio,
      dataFim,
      tipo: type === 'TODOS' ? undefined : type,
      idFeira: type === 'FEIRA' && idFeira !== '' ? idFeira : undefined,
    });
  };

  useEffect(() => {
    void fetchFeiras();
  }, [fetchFeiras]);

  useEffect(() => {
    if (type !== 'FEIRA') {
      setIdFeira('');
    }
  }, [type]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchVendas({
        pagina: 1,
        dataInicio,
        dataFim,
        tipo: type === 'TODOS' ? undefined : type,
        idFeira: type === 'FEIRA' && idFeira !== '' ? idFeira : undefined,
      });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dataFim, dataInicio, fetchVendas, idFeira, type]);

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
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Vendas
        </Typography>
        <Typography color="text.secondary">
          Acompanhe as últimas vendas com contexto de feira, pagamento e itens.
        </Typography>
      </Box>

      <Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <DatePickerField
              label="Data inicial"
              value={dataInicio}
              onValueChange={setDataInicio}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <DatePickerField
              label="Data final"
              value={dataFim}
              onValueChange={setDataFim}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
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
            </TextField>
          </Grid>

          {type === 'FEIRA' ? (
            <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
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
                  feiras.length === 0 ? 'Nenhuma feira cadastrada.' : 'Opcional'
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

          <Grid size={{ xs: 12, sm: 6, lg: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Search />}
              onClick={handleSearch}
              sx={{ height: '100%', minHeight: 56 }}
            >
              Pesquisar
            </Button>
          </Grid>
        </Grid>
      </Box>

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
              vendas.map((venda) => (
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
                          {new Date(venda.dataInclusao).toLocaleString('pt-BR')}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={700}>
                          {formatCurrency(venda.valorTotal)}
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

                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                      <Chip
                        label={getSaleTypeLabel(venda.tipo)}
                        size="small"
                        color={venda.tipo === 'FEIRA' ? 'secondary' : 'primary'}
                        variant="outlined"
                      />
                      <Chip
                        label={getPaymentMethodLabel(venda.meioPagamento)}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Feira: {venda.feira?.nome ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Carteira: {venda.carteira?.nome ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Desconto: {venda.desconto > 0 ? formatCurrency(venda.desconto) : '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Itens: {venda.itens.map(getSaleItemName).join(', ')}
                    </Typography>
                  </Stack>
                </Box>
              ))
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
                    <strong>Total</strong>
                  </TableCell>
                  <TableCell align="center" width={80}>
                    <strong>Ações</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : vendas.length > 0 ? (
                  vendas.map((venda) => (
                    <SaleRow
                      key={venda.id}
                      venda={venda}
                      onOpenActions={handleOpenActions}
                    />
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
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
          rowsPerPageOptions={[10, 25, 50]}
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
        <MenuItem onClick={handleStartEdit} disabled={!isOnline || isDeleteBusy}>
          Alterar
        </MenuItem>
        <MenuItem onClick={handleAskDelete} disabled={!isOnline || isDeleteBusy}>
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
            Tem certeza que deseja excluir a venda #{saleToDelete?.id}? Essa ação
            não pode ser desfeita.
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
        onClose={() => setEditingSale(null)}
        sale={editingSale}
      />
    </Stack>
  );
}
