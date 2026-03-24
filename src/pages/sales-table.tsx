import React, { useState, useEffect } from 'react';
import {
  Box,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Paper,
  Chip,
  CircularProgress,
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { useSaleStore, type Venda } from '../store/useSaleStore';
import { formatCurrency } from '../utils/moeda';

function Row({ venda }: { venda: Venda }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow
        sx={{ '& > *': { borderBottom: 'unset' }, cursor: 'pointer' }}
        onClick={() => setOpen(!open)}
      >
        <TableCell>
          <IconButton size="small">
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row">
          {venda.id}
        </TableCell>
        <TableCell>
          {new Date(venda.dataInclusao).toLocaleDateString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </TableCell>
        <TableCell>
          <Chip
            label={venda.tipo}
            size="small"
            color="primary"
            variant="outlined"
          />
        </TableCell>
        <TableCell>{venda.meioPagamento}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 'bold' }}>
          {formatCurrency(venda.valorTotal)}
        </TableCell>
      </TableRow>

      {/* AREA EXPANSÍVEL */}
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2, bgcolor: '#fafafa', p: 2, borderRadius: 1 }}>
              <Typography
                variant="subtitle2"
                gutterBottom
                component="div"
                sx={{ fontWeight: 'bold' }}
              >
                Itens da Venda #{venda.id}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID Produto</TableCell>
                    <TableCell align="left">Nome</TableCell>
                    <TableCell align="right">Qtd</TableCell>
                    <TableCell align="right">Unitário</TableCell>
                    <TableCell align="right">Desconto</TableCell>
                    <TableCell align="right">Total Item</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {venda.itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.idProduto}</TableCell>
                      <TableCell align="left">{item.produto.nome}</TableCell>
                      <TableCell align="right">{item.quantidade}</TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.valorUnitario)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'error.main' }}>
                        {formatCurrency(item.desconto)}
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

export default function SalesTable() {
  const { vendas, fetchVendas, isLoading } = useSaleStore();

  useEffect(() => {
    fetchVendas();
  }, [fetchVendas]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 3 }}>
      <Table aria-label="vendas table">
        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
          <TableRow>
            <TableCell width={50} />
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
              <strong>Pagamento</strong>
            </TableCell>
            <TableCell align="right">
              <strong>Total</strong>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vendas.map((venda) => (
            <Row key={venda.id} venda={venda} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
