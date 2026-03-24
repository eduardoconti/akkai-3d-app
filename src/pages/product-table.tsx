import { useEffect } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import { useProductStore } from '../store/useProductSotre';
import { formatCurrency } from '../utils/moeda';

export default function BasicTable() {
  const { produtos, isLoading, fetchProdutos } = useProductStore();
  useEffect(() => {
    fetchProdutos();
  }, [fetchProdutos]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ elevation: 3, borderRadius: 2 }}>
      <Table sx={{ minWidth: 650 }} aria-label="tabela de produtos">
        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
          <TableRow>
            <TableCell>
              <strong>Código</strong>
            </TableCell>
            <TableCell>
              <strong>Nome</strong>
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
          {produtos.length > 0 ? (
            produtos.map((produto) => (
              <TableRow
                key={produto.id}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  '&:hover': { bgcolor: '#fafafa' },
                }}
              >
                <TableCell component="th" scope="row">
                  {produto.codigo}
                </TableCell>
                <TableCell>{produto.nome}</TableCell>
                <TableCell>{produto.descricao}</TableCell>
                <TableCell align="right">
                  {formatCurrency(produto.valor)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} align="center">
                Nenhum produto encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
