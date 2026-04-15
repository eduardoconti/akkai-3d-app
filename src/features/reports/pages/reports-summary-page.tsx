import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Search } from '@mui/icons-material';
import {
  getSalesSummary,
  type SalesSummary,
} from '@/features/reports/api/reports-api';
import { listFairs } from '@/features/sales/api/sales-api';
import {
  DateRangePickerField,
  FormFeedbackAlert,
  formatCurrency,
  getProblemDetailsFromError,
  type Feira,
  type ProblemDetails,
  type TipoVenda,
} from '@/shared';

function getMonthStartInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function getMonthEndInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
  ).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatApiDateToDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function getSaleTypeLabel(tipoVenda: 'TODOS' | TipoVenda): string {
  switch (tipoVenda) {
    case 'FEIRA':
      return 'Feira';
    case 'LOJA':
      return 'Loja';
    case 'ONLINE':
      return 'Online';
    default:
      return 'Todos';
  }
}

export default function ReportsSummaryPage() {
  const [dataInicio, setDataInicio] = useState(getMonthStartInput);
  const [dataFim, setDataFim] = useState(getMonthEndInput);
  const [tipoVenda, setTipoVenda] = useState<'TODOS' | TipoVenda>('TODOS');
  const [idFeira, setIdFeira] = useState<number | ''>('');
  const [feiras, setFeiras] = useState<Feira[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [hasLoadedFeiras, setHasLoadedFeiras] = useState(false);

  useEffect(() => {
    if (tipoVenda !== 'FEIRA' || hasLoadedFeiras) {
      return;
    }

    let active = true;

    const loadFeiras = async () => {
      setIsLoadingFilters(true);

      try {
        const feirasResponse = await listFairs();

        if (!active) {
          return;
        }

        setFeiras(feirasResponse);
        setHasLoadedFeiras(true);
      } catch (error) {
        if (!active) {
          return;
        }

        setProblem(getProblemDetailsFromError(error));
      } finally {
        if (active) {
          setIsLoadingFilters(false);
        }
      }
    };

    void loadFeiras();

    return () => {
      active = false;
    };
  }, [hasLoadedFeiras, tipoVenda]);

  useEffect(() => {
    if (tipoVenda !== 'FEIRA') {
      setIdFeira('');
    }
  }, [tipoVenda]);

  const periodoLabel = useMemo(() => {
    if (!summary) {
      return null;
    }

    const filtros: string[] = [];

    if (tipoVenda !== 'TODOS') {
      filtros.push(`Tipo: ${getSaleTypeLabel(tipoVenda)}`);
    }

    if (tipoVenda === 'FEIRA' && idFeira !== '') {
      const feiraSelecionada = feiras.find((feira) => feira.id === idFeira);

      if (feiraSelecionada) {
        filtros.push(`Feira: ${feiraSelecionada.nome}`);
      }
    }

    if (summary.dataInicio === summary.dataFim) {
      const base = `Período consultado: ${formatApiDateToDisplay(summary.dataInicio)}`;
      return filtros.length > 0 ? `${base} | ${filtros.join(' | ')}` : base;
    }

    const base = `Período consultado: ${formatApiDateToDisplay(summary.dataInicio)} até ${formatApiDateToDisplay(summary.dataFim)}`;
    return filtros.length > 0 ? `${base} | ${filtros.join(' | ')}` : base;
  }, [summary, tipoVenda, idFeira, feiras]);

  const handleSubmit = async () => {
    setProblem(null);
    setLocalError(null);
    setIsLoading(true);

    if (!dataInicio || !dataFim) {
      setLocalError('Selecione as datas inicial e final.');
      setSummary(null);
      setIsLoading(false);
      return;
    }

    try {
      const result = await getSalesSummary({
        dataInicio,
        dataFim,
        tipoVenda: tipoVenda === 'TODOS' ? undefined : tipoVenda,
        idFeira: tipoVenda === 'FEIRA' && idFeira !== '' ? idFeira : undefined,
      });
      setSummary(result);
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void handleSubmit();
    }, 300);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [dataFim, dataInicio, idFeira, tipoVenda]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Resumo de vendas
        </Typography>
        <Typography color="text.secondary">
          Consulte a quantidade de itens vendidos, o desconto total e o valor
          total em um período.
        </Typography>
      </Box>

      <Grid container spacing={2} columns={{ xs: 12, md: 12, lg: 20 }}>
            <Grid size={{ xs: 12, md: 6, lg: tipoVenda === 'FEIRA' ? 7 : 8 }}>
              <DateRangePickerField
                label="Período"
                startValue={dataInicio}
                endValue={dataFim}
                onValueChange={({ startValue, endValue }) => {
                  setDataInicio(startValue);
                  setDataFim(endValue);
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6, lg: tipoVenda === 'FEIRA' ? 5 : 6 }}>
              <TextField
                select
                fullWidth
                label="Tipo de venda"
                value={tipoVenda}
                onChange={(event) =>
                  setTipoVenda(event.target.value as 'TODOS' | TipoVenda)
                }
              >
                <MenuItem value="TODOS">Todos</MenuItem>
                <MenuItem value="FEIRA">Feira</MenuItem>
                <MenuItem value="LOJA">Loja</MenuItem>
                <MenuItem value="ONLINE">Online</MenuItem>
              </TextField>
            </Grid>

            {tipoVenda === 'FEIRA' ? (
              <Grid size={{ xs: 12, md: 6, lg: 5 }}>
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
                  disabled={isLoadingFilters}
                  helperText={
                    feiras.length === 0 && !isLoadingFilters
                      ? 'Nenhuma feira cadastrada.'
                      : 'Disponível apenas para vendas do tipo feira.'
                  }
                >
                  <MenuItem value="">Todas as feiras</MenuItem>
                  {feiras.map((feira) => (
                    <MenuItem key={feira.id} value={feira.id}>
                      {feira.nome}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            ) : null}

            <Grid
              size={{ xs: 12, md: 6, lg: tipoVenda === 'FEIRA' ? 3 : 6 }}
              sx={{ display: 'flex', alignItems: 'flex-start' }}
            >
              <Button
                fullWidth
                variant="outlined"
                startIcon={isLoading ? <CircularProgress size={18} /> : <Search />}
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={isLoading}
                sx={{ height: 56 }}
              >
                {isLoading ? 'Consultando...' : 'Pesquisar'}
              </Button>
            </Grid>
      </Grid>

      <FormFeedbackAlert message={localError ?? problem?.detail} />

      {summary ? (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={2}>
            {periodoLabel ? (
              <Alert severity="info">{periodoLabel}</Alert>
            ) : null}

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2.5, borderRadius: 3, height: '100%' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Quantidade de itens
                  </Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                    {summary.quantidadeItens}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2.5, borderRadius: 3, height: '100%' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Desconto total
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{ mt: 1, color: 'warning.dark' }}
                  >
                    {formatCurrency(summary.descontoTotal)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2.5, borderRadius: 3, height: '100%' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Valor total
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{ mt: 1, color: 'success.main' }}
                  >
                    {formatCurrency(summary.valorTotal)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2.5, borderRadius: 3, height: '100%' }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Valor líquido
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{ mt: 1, color: 'success.main' }}
                  >
                    {formatCurrency(summary.valorLiquido)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
