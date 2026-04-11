import { useEffect } from 'react';
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
import { useProductStore } from '../store/use-product-store';

interface StockHistoryDialogProps {
  open: boolean;
  productId: number | null;
  productName: string;
  onClose: () => void;
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
    default:
      return origem;
  }
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

export default function StockHistoryDialog({
  open,
  productId,
  productName,
  onClose,
}: StockHistoryDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    fetchMovimentacoesEstoque,
    isFetchingStockMovements,
    movimentacoesEstoque,
    paginacaoMovimentacoesEstoque,
    stockMovementsErrorMessage,
    totalMovimentacoesEstoque,
  } = useProductStore();

  useEffect(() => {
    if (!open || !productId) {
      return;
    }

    void fetchMovimentacoesEstoque(productId, { pagina: 1 });
  }, [fetchMovimentacoesEstoque, open, productId]);

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
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Historico de estoque
            </Typography>
            <Typography color="text.secondary">
              {productName || 'Produto'} com movimentacoes mais recentes primeiro.
            </Typography>
          </Box>

          <IconButton onClick={onClose} aria-label="Fechar historico de estoque">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          {stockMovementsErrorMessage ? (
            <Alert severity="error">{stockMovementsErrorMessage}</Alert>
          ) : null}

          <Paper sx={{ overflow: 'hidden' }}>
            {isMobile ? (
              <Stack
                divider={<Divider flexItem />}
                aria-label="lista de movimentacoes de estoque"
              >
                {isFetchingStockMovements ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
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
                            <Typography variant="body2" color="text.secondary">
                              {formatDateTime(movimentacao.dataInclusao)}
                            </Typography>
                          </Box>

                          <Chip
                            label={getMovementOriginLabel(movimentacao.origem)}
                            size="small"
                            color={getMovementTypeColor(movimentacao.tipo)}
                          />
                        </Stack>

                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          spacing={2}
                        >
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Quantidade
                            </Typography>
                            <Typography variant="body1" fontWeight={700}>
                              {movimentacao.quantidade}
                            </Typography>
                          </Box>

                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">
                              Origem
                            </Typography>
                            <Typography variant="body1" fontWeight={700}>
                              {getMovementOriginLabel(movimentacao.origem)}
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
                        <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                          <CircularProgress />
                        </TableCell>
                      </TableRow>
                    ) : movimentacoesEstoque.length > 0 ? (
                      movimentacoesEstoque.map((movimentacao) => (
                        <TableRow key={movimentacao.id}>
                          <TableCell>
                            {formatDateTime(movimentacao.dataInclusao)}
                          </TableCell>
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
                        <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
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
                if (!productId) {
                  return;
                }

                void fetchMovimentacoesEstoque(productId, { pagina: newPage + 1 });
              }}
              rowsPerPage={paginacaoMovimentacoesEstoque.tamanhoPagina}
              onRowsPerPageChange={(event) => {
                if (!productId) {
                  return;
                }

                void fetchMovimentacoesEstoque(productId, {
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
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
