import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
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
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Search } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import FairProductPricesDialog from '../components/fair-product-prices-dialog';
import {
  listFairs,
  searchFairProductPrices,
} from '@/features/sales/api/sales-api';
import {
  AppTablePagination,
  EmptyState,
  LoadingState,
  PageHeader,
  formatCurrency,
  getProblemDetailsFromError,
  type DirecaoOrdenacao,
  type Feira,
  type OrdenacaoPrecoProdutoFeira,
  type PesquisaPaginadaPrecosProdutosFeira,
  type PrecoProdutoFeira,
} from '@/shared';

const initialPagination: PesquisaPaginadaPrecosProdutosFeira = {
  pagina: 1,
  tamanhoPagina: 10,
  termo: '',
  ordenarPor: 'codigo',
  direcao: 'asc',
};

function getProductName(price: PrecoProdutoFeira) {
  return price.produto?.nome ?? `Produto #${price.idProduto}`;
}

function getProductCode(price: PrecoProdutoFeira) {
  return price.produto?.codigo ?? '-';
}

export default function FairProductPricesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [prices, setPrices] = useState<PrecoProdutoFeira[]>([]);
  const [fairs, setFairs] = useState<Feira[]>([]);
  const [pagination, setPagination] =
    useState<PesquisaPaginadaPrecosProdutosFeira>(initialPagination);
  const [searchInput, setSearchInput] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<PrecoProdutoFeira | null>(
    null,
  );
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    const loadFairs = async () => {
      try {
        const nextFairs = await listFairs();
        if (active) {
          setFairs(nextFairs);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(getProblemDetailsFromError(error).detail);
        }
      }
    };

    void loadFairs();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const termo = searchInput.trim();
      setPagination((current) =>
        current.termo === termo ? current : { ...current, pagina: 1, termo },
      );
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    const loadPrices = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await searchFairProductPrices(pagination);

        if (!active) {
          return;
        }

        setPrices(response.itens);
        setTotalItems(response.totalItens);
      } catch (error) {
        if (active) {
          setErrorMessage(getProblemDetailsFromError(error).detail);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadPrices();

    return () => {
      active = false;
    };
  }, [pagination, reloadToken]);

  const handleSearch = () => {
    setPagination((current) => ({
      ...current,
      pagina: 1,
      termo: searchInput.trim(),
    }));
  };

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Preços por feira"
        description="Consulte os preços específicos cadastrados por feira e produto."
      />

      <Grid container spacing={2} columns={{ xs: 12, md: 12, lg: 20 }}>
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TextField
            select
            fullWidth
            label="Feira"
            value={pagination.idFeira ?? ''}
            onChange={(event) => {
              setPagination((current) => ({
                ...current,
                pagina: 1,
                idFeira:
                  event.target.value === ''
                    ? undefined
                    : Number(event.target.value),
              }));
            }}
          >
            <MenuItem value="">Todas as feiras</MenuItem>
            {fairs.map((fair) => (
              <MenuItem key={fair.id} value={fair.id}>
                {fair.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={pagination.ordenarPor ?? 'codigo'}
            onChange={(event) => {
              setPagination((current) => ({
                ...current,
                pagina: 1,
                ordenarPor: event.target.value as OrdenacaoPrecoProdutoFeira,
              }));
            }}
          >
            <MenuItem value="codigo">Código</MenuItem>
            <MenuItem value="nome">Produto</MenuItem>
            <MenuItem value="valor">Preço</MenuItem>
            <MenuItem value="feira">Feira</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
          <TextField
            select
            fullWidth
            label="Direção"
            value={pagination.direcao ?? 'asc'}
            onChange={(event) => {
              setPagination((current) => ({
                ...current,
                pagina: 1,
                direcao: event.target.value as DirecaoOrdenacao,
              }));
            }}
          >
            <MenuItem value="asc">Crescente</MenuItem>
            <MenuItem value="desc">Decrescente</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 7 }}>
          <TextField
            fullWidth
            label="Pesquisar produto"
            placeholder="Nome ou código"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Grid>

        <Grid
          size={{ xs: 12, md: 6, lg: 3 }}
          sx={{ display: 'flex', alignItems: 'flex-start' }}
        >
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Search />}
            onClick={handleSearch}
            sx={{ height: 56 }}
          >
            Pesquisar
          </Button>
        </Grid>
      </Grid>

      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack
            divider={<Divider flexItem />}
            aria-label="lista de preços por feira"
          >
            {isLoading ? (
              <LoadingState />
            ) : prices.length > 0 ? (
              prices.map((price) => (
                <Box
                  key={price.id}
                  onClick={() => setEditingPrice(price)}
                  sx={{ cursor: 'pointer', px: 2, py: 2 }}
                >
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      Código: {getProductCode(price)}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {getProductName(price)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Feira: {price.feira?.nome ?? price.idFeira}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Preço padrão:{' '}
                      {price.produto
                        ? formatCurrency(price.produto.valor)
                        : '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Preço na feira: {formatCurrency(price.valor)}
                    </Typography>
                  </Stack>
                </Box>
              ))
            ) : (
              <EmptyState message="Nenhum preço específico encontrado." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table
              sx={{ minWidth: 860 }}
              aria-label="tabela de preços por feira"
            >
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Código</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Produto</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Feira</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Preço padrão</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Preço na feira</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ p: 0 }}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : prices.length > 0 ? (
                  prices.map((price) => (
                    <TableRow
                      key={price.id}
                      hover
                      onClick={() => setEditingPrice(price)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{getProductCode(price)}</TableCell>
                      <TableCell>{getProductName(price)}</TableCell>
                      <TableCell>
                        {price.feira?.nome ?? price.idFeira}
                      </TableCell>
                      <TableCell align="right">
                        {price.produto
                          ? formatCurrency(price.produto.valor)
                          : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(price.valor)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ p: 0 }}>
                      <EmptyState message="Nenhum preço específico encontrado." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={totalItems}
          page={Math.max(0, pagination.pagina - 1)}
          rowsPerPage={pagination.tamanhoPagina}
          onPageChange={(_event, newPage) => {
            setPagination((current) => ({ ...current, pagina: newPage + 1 }));
          }}
          onRowsPerPageChange={(event) => {
            setPagination((current) => ({
              ...current,
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            }));
          }}
        />
      </Paper>

      <FairProductPricesDialog
        open={editingPrice !== null}
        fairId={editingPrice?.idFeira ?? null}
        fairName={editingPrice?.feira?.nome}
        price={editingPrice}
        onClose={() => setEditingPrice(null)}
        onChanged={() => setReloadToken((current) => current + 1)}
      />
    </Stack>
  );
}
