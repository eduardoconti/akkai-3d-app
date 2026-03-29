import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
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
} from '@mui/material';
import { useProductStore } from '../store/use-product-store';
import { formatCurrency } from '@/shared';

export default function ProductsPage() {
  const { fetchErrorMessage, fetchProdutos, isFetching, produtos } = useProductStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    void fetchProdutos();
  }, [fetchProdutos]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return produtos;
    }

    return produtos.filter((produto) =>
      [produto.nome, produto.codigo, produto.categoria?.nome ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [produtos, search]);

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
            Consulte nome, código, categoria e valor dos produtos cadastrados.
          </Typography>
        </Box>

        <TextField
          label="Pesquisar produto"
          placeholder="Nome, código ou categoria"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: { xs: '100%', md: 320 } }}
        />
      </Stack>

      {fetchErrorMessage ? <Alert severity="error">{fetchErrorMessage}</Alert> : null}

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
        <Table sx={{ minWidth: 760 }} aria-label="tabela de produtos">
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
                <strong>Valor</strong>
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {isFetching ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((produto) => (
                <TableRow
                  key={produto.id}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover': { bgcolor: 'grey.50' },
                  }}
                >
                  <TableCell component="th" scope="row">
                    {produto.codigo}
                  </TableCell>
                  <TableCell>{produto.nome}</TableCell>
                  <TableCell>{produto.categoria?.nome ?? '-'}</TableCell>
                  <TableCell>{produto.descricao || '-'}</TableCell>
                  <TableCell align="right">{formatCurrency(produto.valor)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  Nenhum produto encontrado para a pesquisa informada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
