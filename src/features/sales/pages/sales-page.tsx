import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  MenuItem,
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
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { useSaleStore } from '../store/use-sale-store';
import {
  getPaymentMethodLabel,
  getSaleTypeLabel,
} from '../utils/format-sale-labels';
import { formatCurrency, type TipoVenda, type Venda } from '@/shared';

function getSaleItemName(vendaItem: Venda['itens'][number]): string {
  return vendaItem.nomeProduto || vendaItem.produto?.nome || 'Item sem nome';
}

function SaleRow({ venda }: { venda: Venda }) {
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
        <TableCell>{getPaymentMethodLabel(venda.meioPagamento)}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 700 }}>
          {formatCurrency(venda.valorTotal)}
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ m: 2, bgcolor: 'grey.50', p: 2, borderRadius: 2 }}>
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
                    <TableCell align="right">Desconto</TableCell>
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

export default function SalesPage() {
  const { fetchErrorMessage, fetchVendas, isFetching, vendas } = useSaleStore();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'TODOS' | TipoVenda>('TODOS');

  useEffect(() => {
    void fetchVendas();
  }, [fetchVendas]);

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    return vendas.filter((venda) => {
      const matchesType = type === 'TODOS' || venda.tipo === type;

      if (!matchesType) {
        return false;
      }

      if (!query) {
        return true;
      }

      const productNames = venda.itens.map((item) => getSaleItemName(item)).join(' ');
      const haystack = [
        venda.id,
        venda.feira?.nome ?? '',
        venda.tipo,
        venda.meioPagamento,
        productNames,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [search, type, vendas]);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Vendas
          </Typography>
          <Typography color="text.secondary">
            Acompanhe as últimas vendas com contexto de feira, pagamento e itens.
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Pesquisar venda"
            placeholder="ID, feira, pagamento ou produto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ minWidth: { xs: '100%', md: 320 } }}
          />

          <TextField
            select
            label="Tipo"
            value={type}
            onChange={(event) => setType(event.target.value as 'TODOS' | TipoVenda)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="TODOS">Todos</MenuItem>
            <MenuItem value="FEIRA">Feira</MenuItem>
            <MenuItem value="LOJA">Loja</MenuItem>
            <MenuItem value="ONLINE">Online</MenuItem>
          </TextField>
        </Stack>
      </Stack>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 2 }}>
        <Table aria-label="tabela de vendas">
          <TableHead sx={{ bgcolor: 'grey.100' }}>
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
                <strong>Pagamento</strong>
              </TableCell>
              <TableCell align="right">
                <strong>Total</strong>
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
            ) : filteredSales.length > 0 ? (
              filteredSales.map((venda) => <SaleRow key={venda.id} venda={venda} />)
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  Nenhuma venda encontrada para os filtros informados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
