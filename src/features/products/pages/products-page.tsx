import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
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
import { useTheme, type Theme } from '@mui/material/styles';
import EditProductDialog from '../components/edit-product-dialog';
import { useProductStore } from '../store/use-product-store';
import {
  formatCurrency,
  type DirecaoOrdenacao,
  type OrdenacaoProduto,
  type Produto,
} from '@/shared';

type StockState = {
  label: string;
  rowSx: Record<string, unknown>;
  chipColor: 'success' | 'warning' | 'error';
};

function getStockState(produto: Produto): StockState {
  if (produto.quantidadeEstoque < 0) {
    return {
      label: 'Negativo',
      chipColor: 'error',
      rowSx: {
        backgroundColor: 'error.lighter',
        '&:hover': { backgroundColor: 'error.light' },
      },
    };
  }

  if (
    produto.estoqueMinimo !== undefined &&
    produto.quantidadeEstoque < produto.estoqueMinimo
  ) {
    return {
      label: 'Abaixo do minimo',
      chipColor: 'warning',
      rowSx: {
        backgroundColor: 'warning.lighter',
        '&:hover': { backgroundColor: 'warning.light' },
      },
    };
  }

  return {
    label: 'Normal',
    chipColor: 'success',
    rowSx: {
      '&:hover': {
        backgroundColor: (theme: Theme) =>
          theme.palette.mode === 'dark'
            ? 'rgba(255,255,255,0.03)'
            : theme.palette.grey[50],
      },
    },
  };
}

export default function ProductsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    fetchErrorMessage,
    fetchProdutos,
    isFetchingProducts,
    paginacao,
    produtos,
    totalItens,
  } = useProductStore();
  const [searchInput, setSearchInput] = useState('');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchProdutos({ pagina: 1, termo: searchInput.trim() });
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [fetchProdutos, searchInput]);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Produtos
          </Typography>
          <Typography color="text.secondary">
            Consulte nome, código, categoria, estoque e valor dos produtos
            cadastrados.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            select
            label="Ordenar por"
            value={paginacao.ordenarPor ?? 'codigo'}
            onChange={(event) => {
              void fetchProdutos({
                pagina: 1,
                ordenarPor: event.target.value as OrdenacaoProduto,
              });
            }}
            sx={{ minWidth: { xs: '100%', md: 180 } }}
          >
            <MenuItem value="codigo">Código</MenuItem>
            <MenuItem value="nome">Nome</MenuItem>
          </TextField>

          <TextField
            select
            label="Direção"
            value={paginacao.direcao ?? 'asc'}
            onChange={(event) => {
              void fetchProdutos({
                pagina: 1,
                direcao: event.target.value as DirecaoOrdenacao,
              });
            }}
            sx={{ minWidth: { xs: '100%', md: 160 } }}
          >
            <MenuItem value="asc">Crescente</MenuItem>
            <MenuItem value="desc">Decrescente</MenuItem>
          </TextField>

          <TextField
            label="Pesquisar produto"
            placeholder="Nome, código ou categoria"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            sx={{ minWidth: { xs: '100%', md: 320 } }}
          />
        </Stack>
      </Stack>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de produtos">
            {isFetchingProducts ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : produtos.length > 0 ? (
              produtos.map((produto) => {
                const stockState = getStockState(produto);

                return (
                  <Box
                    key={produto.id}
                    onClick={() => setEditingProductId(produto.id)}
                    sx={{
                      cursor: 'pointer',
                      px: 2,
                      py: 2,
                      ...stockState.rowSx,
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1.5}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">
                            {produto.codigo}
                          </Typography>
                          <Typography variant="subtitle1" fontWeight={700}>
                            {produto.nome}
                          </Typography>
                        </Box>
                        <Chip
                          label={stockState.label}
                          size="small"
                          color={stockState.chipColor}
                          variant="filled"
                        />
                      </Stack>

                      <Stack spacing={0.75}>
                        <Typography variant="body2" color="text.secondary">
                          Categoria: {produto.categoria?.nome ?? '-'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Descrição: {produto.descricao || '-'}
                        </Typography>
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
                            {produto.quantidadeEstoque}
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="caption" color="text.secondary">
                            Valor
                          </Typography>
                          <Typography variant="body1" fontWeight={700}>
                            {formatCurrency(produto.valor)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhum produto encontrado para a pesquisa informada.
              </Box>
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 860 }} aria-label="tabela de produtos">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Código</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Nome</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Categoria</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Descrição</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Quantidade</strong>
                  </TableCell>
                  <TableCell align="center">
                    <strong>Estoque Atual</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Valor</strong>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {isFetchingProducts ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : produtos.length > 0 ? (
                  produtos.map((produto) => {
                    const stockState = getStockState(produto);

                    return (
                      <TableRow
                        key={produto.id}
                        onClick={() => setEditingProductId(produto.id)}
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 },
                          cursor: 'pointer',
                          ...stockState.rowSx,
                        }}
                      >
                        <TableCell component="th" scope="row">
                          {produto.codigo}
                        </TableCell>
                        <TableCell>{produto.nome}</TableCell>
                        <TableCell>{produto.categoria?.nome ?? '-'}</TableCell>
                        <TableCell>{produto.descricao || '-'}</TableCell>
                        <TableCell align="right">
                          {produto.quantidadeEstoque}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={stockState.label}
                            size="small"
                            color={stockState.chipColor}
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(produto.valor)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      Nenhum produto encontrado para a pesquisa informada.
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
            void fetchProdutos({ pagina: newPage + 1 });
          }}
          rowsPerPage={paginacao.tamanhoPagina}
          onRowsPerPageChange={(event) => {
            void fetchProdutos({
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

      <EditProductDialog
        open={editingProductId !== null}
        productId={editingProductId}
        onClose={() => setEditingProductId(null)}
        onUpdated={async () => {
          await fetchProdutos();
        }}
      />
    </Stack>
  );
}
