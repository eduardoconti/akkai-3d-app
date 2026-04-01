import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
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
import { AddCircleOutline } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { NewExpenseDialog } from '@/features/finance';
import { useFinanceStore } from '@/features/finance/store/use-finance-store';
import {
  convertDateToApiFormat,
  formatApiDateToDisplay,
} from '@/features/finance/types/finance-form';
import { DatePickerField, formatCurrency } from '@/shared';

function getExpenseCategoryLabel(categoria: string): string {
  switch (categoria) {
    case 'DESPESA_FIXA':
      return 'Despesa fixa';
    case 'MATERIA_PRIMA':
      return 'Matéria-prima';
    case 'EMBALAGEM':
      return 'Embalagem';
    case 'EVENTO':
      return 'Evento';
    case 'TRANSPORTE':
      return 'Transporte';
    default:
      return 'Outros';
  }
}

function getPaymentMethodLabel(meioPagamento: string): string {
  switch (meioPagamento) {
    case 'DIN':
      return 'Dinheiro';
    case 'DEB':
      return 'Cartão débito';
    case 'CRE':
      return 'Cartão crédito';
    default:
      return 'Pix';
  }
}

function getCurrentDateInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function FinanceExpensesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    despesas,
    fetchDespesas,
    fetchErrorMessage,
    isFetching,
    paginacao,
    totalItens,
  } = useFinanceStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [dataInicio, setDataInicio] = useState(getCurrentDateInput());
  const [dataFim, setDataFim] = useState(getCurrentDateInput());

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchDespesas({
        pagina: 1,
        termo: searchInput.trim(),
        dataInicio: convertDateToApiFormat(dataInicio) ?? '',
        dataFim: convertDateToApiFormat(dataFim) ?? '',
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [dataFim, dataInicio, fetchDespesas, searchInput]);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Despesas
          </Typography>
          <Typography color="text.secondary">
            Registre saídas com categoria, pagamento e carteira para acompanhar
            os custos do negócio.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={() => setDialogOpen(true)}
        >
          Nova despesa
        </Button>
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField
            fullWidth
            label="Pesquisar despesa"
            placeholder="Descrição, categoria, observação ou carteira"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <DatePickerField
            label="Data inicial"
            value={dataInicio}
            onValueChange={setDataInicio}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <DatePickerField
            label="Data final"
            value={dataFim}
            onValueChange={setDataFim}
          />
        </Grid>
      </Grid>

      {fetchErrorMessage ? <Alert severity="error">{fetchErrorMessage}</Alert> : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de despesas">
            {isFetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : despesas.length > 0 ? (
              despesas.map((despesa) => (
                <Box key={despesa.id} sx={{ px: 2, py: 2 }}>
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatApiDateToDisplay(despesa.dataLancamento)}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {despesa.descricao}
                        </Typography>
                      </Box>
                      <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        color="error.main"
                      >
                        {formatCurrency(despesa.valor)}
                      </Typography>
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Categoria: {getExpenseCategoryLabel(despesa.categoria)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pagamento: {getPaymentMethodLabel(despesa.meioPagamento)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Carteira: {despesa.carteira?.nome ?? '-'}
                    </Typography>
                  </Stack>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhuma despesa encontrada para os filtros informados.
              </Box>
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de despesas">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Data</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Descrição</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Categoria</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Pagamento</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Carteira</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Valor</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : despesas.length > 0 ? (
                  despesas.map((despesa) => (
                    <TableRow key={despesa.id}>
                      <TableCell>
                        {formatApiDateToDisplay(despesa.dataLancamento)}
                      </TableCell>
                      <TableCell>{despesa.descricao}</TableCell>
                      <TableCell>{getExpenseCategoryLabel(despesa.categoria)}</TableCell>
                      <TableCell>{getPaymentMethodLabel(despesa.meioPagamento)}</TableCell>
                      <TableCell>{despesa.carteira?.nome ?? '-'}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: 'error.main', fontWeight: 700 }}
                      >
                        {formatCurrency(despesa.valor)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      Nenhuma despesa encontrada para os filtros informados.
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
            void fetchDespesas({ pagina: newPage + 1 });
          }}
          rowsPerPage={paginacao.tamanhoPagina}
          onRowsPerPageChange={(event) => {
            void fetchDespesas({
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

      <NewExpenseDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </Stack>
  );
}
