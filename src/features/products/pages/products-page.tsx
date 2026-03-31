import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
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
} from '@mui/material';
import EditProductDialog from '../components/edit-product-dialog';
import { useProductStore } from '../store/use-product-store';
import { formatCurrency, type Produto } from '@/shared';

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
      '&:hover': { backgroundColor: 'grey.50' },
    },
  };
}

export default function ProductsPage() {
  const {
    fetchErrorMessage,
    fetchProdutos,
    isFetching,
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

        <TextField
          label="Pesquisar produto"
          placeholder="Nome, código ou categoria"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          sx={{ minWidth: { xs: '100%', md: 320 } }}
        />
      </Stack>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
        <Table sx={{ minWidth: 980 }} aria-label="tabela de produtos">
          <TableHead sx={{ backgroundColor: 'grey.100' }}>
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
            {isFetching ? (
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
        />
      </TableContainer>

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
