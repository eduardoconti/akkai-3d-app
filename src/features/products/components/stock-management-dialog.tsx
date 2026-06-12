import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import StockMovementForm from './stock-movement-form';
import {
  productStoreSelectors,
  useProductStore,
} from '../store/use-product-store';
import {
  DEFAULT_PAGE_SIZE,
  PAGINATED_SEARCH_PAGE_SIZE_OPTIONS,
  type EstoqueProduto,
  type Produto,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface StockManagementDialogProps {
  open: boolean;
  produto: Produto | null;
  onClose: () => void;
  onUpdated?: () => Promise<void> | void;
}

function getMovementTypeLabel(tipo: 'E' | 'S') {
  return tipo === 'E' ? 'Entrada' : 'Saida';
}

function getMovementTypeColor(tipo: 'E' | 'S'): 'success' | 'error' {
  return tipo === 'E' ? 'success' : 'error';
}

function getMovementOriginLabel(origem: string) {
  switch (origem) {
    case 'COMPRA':
      return 'Compra';
    case 'VENDA':
      return 'Venda';
    case 'AJUSTE':
      return 'Ajuste';
    case 'PERDA':
      return 'Perda';
    case 'PRODUCAO':
      return 'Producao';
    case 'CONSIGNACAO':
      return 'Consignacao';
    default:
      return origem;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

export default function StockManagementDialog({
  open,
  produto,
  onClose,
  onUpdated,
}: StockManagementDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    atualizarQuantidadeEstoqueLocal,
    fetchMovimentacoesEstoque,
    isFetchingStockMovements,
    movimentacoesEstoque,
    paginacaoMovimentacoesEstoque,
    stockMovementsErrorMessage,
    totalMovimentacoesEstoque,
  } = useProductStore(
    useShallow((state) => ({
      atualizarQuantidadeEstoqueLocal:
        productStoreSelectors.atualizarQuantidadeEstoqueLocal(state),
      fetchMovimentacoesEstoque:
        productStoreSelectors.fetchMovimentacoesEstoque(state),
      isFetchingStockMovements:
        productStoreSelectors.isFetchingStockMovements(state),
      movimentacoesEstoque: productStoreSelectors.movimentacoesEstoque(state),
      paginacaoMovimentacoesEstoque:
        productStoreSelectors.paginacaoMovimentacoesEstoque(state),
      stockMovementsErrorMessage:
        productStoreSelectors.stockMovementsErrorMessage(state),
      totalMovimentacoesEstoque:
        productStoreSelectors.totalMovimentacoesEstoque(state),
    })),
  );
  const [quantidadeAtual, setQuantidadeAtual] = useState(0);

  useEffect(() => {
    setQuantidadeAtual(produto?.quantidadeEstoque ?? 0);
  }, [produto?.id, produto?.quantidadeEstoque]);

  useEffect(() => {
    if (!open || !produto) {
      return;
    }

    void fetchMovimentacoesEstoque(produto.id, {
      pagina: 1,
      tamanhoPagina: DEFAULT_PAGE_SIZE,
    });
  }, [fetchMovimentacoesEstoque, open, produto]);

  const produtoEstoque = useMemo<EstoqueProduto | null>(() => {
    if (!produto) {
      return null;
    }

    return {
      id: produto.id,
      nome: produto.nome,
      codigo: produto.codigo,
      descricao: produto.descricao,
      estoqueMinimo: produto.estoqueMinimo,
      idCategoria: produto.idCategoria,
      categoria: produto.categoria,
      quantidadeEstoque: quantidadeAtual,
    };
  }, [produto, quantidadeAtual]);

  const handleSavedMovement = async (delta: number) => {
    if (!produto) {
      return;
    }

    setQuantidadeAtual((current) => current + delta);
    atualizarQuantidadeEstoqueLocal(produto.id, delta);
    await fetchMovimentacoesEstoque(produto.id, { pagina: 1 });
    await onUpdated?.();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ px: 3, py: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" fontWeight={700}>
              Estoque do produto
            </Typography>
            <Typography color="text.secondary">
              {produto?.nome || 'Produto'} com saldo atual e movimentacoes mais
              recentes.
            </Typography>
          </Box>

          <IconButton onClick={onClose} aria-label="Fechar estoque do produto">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {produtoEstoque ? (
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Codigo {produtoEstoque.codigo}
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {produtoEstoque.nome}
                </Typography>
              </Box>

              <Chip
                label={`Saldo atual: ${produtoEstoque.quantidadeEstoque}`}
                color={
                  produtoEstoque.quantidadeEstoque < 0 ? 'error' : 'primary'
                }
                variant="filled"
              />
            </Stack>

            <Paper
              variant="outlined"
              sx={{ p: 2.5, borderRadius: 2, overflow: 'hidden' }}
            >
              <StockMovementForm
                produto={produtoEstoque}
                onSaved={handleSavedMovement}
              />
            </Paper>

            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Historico de movimentacoes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Movimentacoes mais recentes primeiro.
                </Typography>
              </Box>

              {stockMovementsErrorMessage ? (
                <Box sx={{ px: 2.5, pb: 1 }}>
                  <Alert severity="error">{stockMovementsErrorMessage}</Alert>
                </Box>
              ) : null}

              {isMobile ? (
                <Stack
                  divider={<Divider flexItem />}
                  aria-label="lista de movimentacoes de estoque"
                >
                  {isFetchingStockMovements ? (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', py: 6 }}
                    >
                      <CircularProgress />
                    </Box>
                  ) : movimentacoesEstoque.length > 0 ? (
                    movimentacoesEstoque.map((movimentacao) => (
                      <Box key={movimentacao.id} sx={{ px: 2, py: 2 }}>
                        <Stack spacing={1.5}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            spacing={1.5}
                          >
                            <Box>
                              <Typography variant="subtitle1" fontWeight={700}>
                                {getMovementTypeLabel(movimentacao.tipo)}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {formatDateTime(movimentacao.dataInclusao)}
                              </Typography>
                            </Box>

                            <Chip
                              label={getMovementOriginLabel(
                                movimentacao.origem,
                              )}
                              size="small"
                              color={getMovementTypeColor(movimentacao.tipo)}
                            />
                          </Stack>

                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            spacing={2}
                          >
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Quantidade
                              </Typography>
                              <Typography variant="body1" fontWeight={700}>
                                {movimentacao.quantidade}
                              </Typography>
                            </Box>

                            <Box
                              sx={{ minWidth: 0, flex: 1, textAlign: 'right' }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Usuario
                              </Typography>
                              <Typography
                                variant="body1"
                                fontWeight={700}
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {movimentacao.usuario}
                              </Typography>
                            </Box>
                          </Stack>
                        </Stack>
                      </Box>
                    ))
                  ) : (
                    <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                      Nenhuma movimentacao encontrada para este produto.
                    </Box>
                  )}
                </Stack>
              ) : (
                <TableContainer>
                  <Table aria-label="tabela de movimentacoes de estoque">
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <strong>Data</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Usuario</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Movimentacao</strong>
                        </TableCell>
                        <TableCell>
                          <strong>Origem</strong>
                        </TableCell>
                        <TableCell align="right">
                          <strong>Quantidade</strong>
                        </TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {isFetchingStockMovements ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                            <CircularProgress />
                          </TableCell>
                        </TableRow>
                      ) : movimentacoesEstoque.length > 0 ? (
                        movimentacoesEstoque.map((movimentacao) => (
                          <TableRow key={movimentacao.id}>
                            <TableCell>
                              {formatDateTime(movimentacao.dataInclusao)}
                            </TableCell>
                            <TableCell>{movimentacao.usuario}</TableCell>
                            <TableCell>
                              <Chip
                                label={getMovementTypeLabel(movimentacao.tipo)}
                                size="small"
                                color={getMovementTypeColor(movimentacao.tipo)}
                              />
                            </TableCell>
                            <TableCell>
                              {getMovementOriginLabel(movimentacao.origem)}
                            </TableCell>
                            <TableCell align="right">
                              {movimentacao.quantidade}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                            Nenhuma movimentacao encontrada para este produto.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <TablePagination
                component="div"
                count={totalMovimentacoesEstoque}
                page={Math.max(0, paginacaoMovimentacoesEstoque.pagina - 1)}
                onPageChange={(_event, newPage) => {
                  if (!produto) {
                    return;
                  }

                  void fetchMovimentacoesEstoque(produto.id, {
                    pagina: newPage + 1,
                  });
                }}
                rowsPerPage={paginacaoMovimentacoesEstoque.tamanhoPagina}
                onRowsPerPageChange={(event) => {
                  if (!produto) {
                    return;
                  }

                  void fetchMovimentacoesEstoque(produto.id, {
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
          </Stack>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
