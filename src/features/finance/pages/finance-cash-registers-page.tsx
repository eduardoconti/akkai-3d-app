import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
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
import { useTheme } from '@mui/material/styles';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import CashRegisterDetailsDialog from '@/features/finance/components/cash-register-details-dialog';
import { listCashRegisters } from '@/features/finance/api/finance-api';
import { listFairs } from '@/features/sales/api/sales-api';
import { convertDateToApiDateFormat } from '@/features/finance/types/finance-form';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants/pagination';
import { getMonthRangeInput } from '@/shared/utils/date-range';
import {
  AppTablePagination,
  DateRangePickerField,
  EmptyState,
  LoadingState,
  PageHeader,
  SearchFilterPanel,
  type Caixa,
  type Feira,
  type PesquisaPaginadaCaixas,
} from '@/shared';

const periodoInicial = getMonthRangeInput();

const pesquisaInicial: PesquisaPaginadaCaixas = {
  pagina: 1,
  tamanhoPagina: DEFAULT_PAGE_SIZE,
  dataInicio: periodoInicial.startValue,
  dataFim: periodoInicial.endValue,
  idFeira: undefined,
};

export default function FinanceCashRegistersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { openCashRegisterDialog } = useMainLayoutActions();
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [feiras, setFeiras] = useState<Feira[]>([]);
  const [pesquisa, setPesquisa] =
    useState<PesquisaPaginadaCaixas>(pesquisaInicial);
  const [dateRange, setDateRange] = useState({
    startValue: pesquisaInicial.dataInicio ?? '',
    endValue: pesquisaInicial.dataFim ?? '',
  });
  const [idFeira, setIdFeira] = useState<number | ''>('');
  const [totalItens, setTotalItens] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [caixaSelecionadoId, setCaixaSelecionadoId] = useState<number | null>(
    null,
  );

  const carregarCaixas = useCallback(
    async (alteracoes?: Partial<PesquisaPaginadaCaixas>) => {
      const proximaPesquisa = { ...pesquisa, ...alteracoes };
      setCarregando(true);
      setErro(null);
      try {
        const resultado = await listCashRegisters(proximaPesquisa);
        setCaixas(resultado.itens);
        setTotalItens(resultado.totalItens);
        setPesquisa({
          ...proximaPesquisa,
          pagina: resultado.pagina,
          tamanhoPagina: resultado.tamanhoPagina,
        });
      } catch (error) {
        setErro(getProblemDetailsFromError(error).detail);
      } finally {
        setCarregando(false);
      }
    },
    [pesquisa],
  );

  useEffect(() => {
    void listFairs()
      .then(setFeiras)
      .catch(() => setErro('Não foi possível carregar as feiras.'));
    void carregarCaixas();
    // A carga inicial deve usar apenas os valores iniciais do filtro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const atualizar = () => void carregarCaixas();
    window.addEventListener('caixas:atualizados', atualizar);
    return () => window.removeEventListener('caixas:atualizados', atualizar);
  }, [carregarCaixas]);

  const handleSearch = () => {
    void carregarCaixas({
      pagina: 1,
      dataInicio: convertDateToApiDateFormat(dateRange.startValue) ?? '',
      dataFim: convertDateToApiDateFormat(dateRange.endValue) ?? '',
      idFeira: idFeira === '' ? undefined : idFeira,
    });
  };

  const handleClear = () => {
    setDateRange({ startValue: '', endValue: '' });
    setIdFeira('');
    void carregarCaixas({
      pagina: 1,
      dataInicio: '',
      dataFim: '',
      idFeira: undefined,
    });
  };

  const formatarDataHora = (valor?: string | null) =>
    valor ? new Date(valor).toLocaleString('pt-BR') : '-';

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Caixas"
        description="Pesquise as aberturas e acompanhe as conferências realizadas por feira."
        actionLabel="Abertura de caixa"
        onAction={openCashRegisterDialog}
      />

      <SearchFilterPanel
        onSearch={handleSearch}
        onClear={handleClear}
        isLoading={carregando}
        columns={{ xs: 12, md: 12, lg: 12 }}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <DateRangePickerField
            label="Período de abertura"
            startValue={dateRange.startValue}
            endValue={dateRange.endValue}
            onValueChange={setDateRange}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select
            fullWidth
            label="Feira"
            value={idFeira}
            onChange={(event) =>
              setIdFeira(
                event.target.value === '' ? '' : Number(event.target.value),
              )
            }
          >
            <MenuItem value="">Todas</MenuItem>
            {feiras.map((feira) => (
              <MenuItem key={feira.id} value={feira.id}>
                {feira.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </SearchFilterPanel>

      {erro ? <Alert severity="error">{erro}</Alert> : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de caixas">
            {carregando ? (
              <LoadingState />
            ) : caixas.length > 0 ? (
              caixas.map((caixa) => (
                <Box
                  key={caixa.id}
                  onClick={() => setCaixaSelecionadoId(caixa.id)}
                  sx={{
                    px: 2,
                    py: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography fontWeight={700}>
                        {caixa.feira?.nome ?? `Feira ${caixa.idFeira}`}
                      </Typography>
                      <Chip
                        size="small"
                        color={
                          caixa.status === 'ABERTO' ? 'success' : 'default'
                        }
                        label={caixa.status === 'ABERTO' ? 'Aberto' : 'Fechado'}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      Abertura: {formatarDataHora(caixa.dataAbertura)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Fechamento: {formatarDataHora(caixa.dataFechamento)}
                    </Typography>
                  </Stack>
                </Box>
              ))
            ) : (
              <EmptyState message="Nenhum caixa encontrado para os filtros informados." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de caixas">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Abertura</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Feira</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Fechamento</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {carregando ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ p: 0 }}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : caixas.length > 0 ? (
                  caixas.map((caixa) => (
                    <TableRow
                      key={caixa.id}
                      hover
                      onClick={() => setCaixaSelecionadoId(caixa.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        {formatarDataHora(caixa.dataAbertura)}
                      </TableCell>
                      <TableCell>
                        {caixa.feira?.nome ?? `Feira ${caixa.idFeira}`}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={
                            caixa.status === 'ABERTO' ? 'success' : 'default'
                          }
                          label={
                            caixa.status === 'ABERTO' ? 'Aberto' : 'Fechado'
                          }
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {formatarDataHora(caixa.dataFechamento)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ p: 0 }}>
                      <EmptyState message="Nenhum caixa encontrado para os filtros informados." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={totalItens}
          page={Math.max(0, pesquisa.pagina - 1)}
          rowsPerPage={pesquisa.tamanhoPagina}
          onPageChange={(_event, novaPagina) =>
            void carregarCaixas({ pagina: novaPagina + 1 })
          }
          onRowsPerPageChange={(event) =>
            void carregarCaixas({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            })
          }
        />
      </Paper>

      <CashRegisterDetailsDialog
        open={caixaSelecionadoId !== null}
        caixaId={caixaSelecionadoId}
        caixaResumo={
          caixas.find((caixa) => caixa.id === caixaSelecionadoId) ?? null
        }
        onClose={() => setCaixaSelecionadoId(null)}
      />
    </Stack>
  );
}
