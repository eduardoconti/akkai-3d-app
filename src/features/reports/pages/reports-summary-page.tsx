import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Insights } from '@mui/icons-material';
import {
  getSalesSummary,
  type SalesSummary,
} from '@/features/reports/api/reports-api';
import {
  DatePickerField,
  FormFeedbackAlert,
  formatCurrency,
  getProblemDetailsFromError,
  type ProblemDetails,
} from '@/shared';

function getCurrentDateInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
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

const initialDate = getCurrentDateInput();

export default function ReportsSummaryPage() {
  const [dataInicio, setDataInicio] = useState(initialDate);
  const [dataFim, setDataFim] = useState(initialDate);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const periodoLabel = useMemo(() => {
    if (!summary) {
      return null;
    }

    if (summary.dataInicio === summary.dataFim) {
      return `Período consultado: ${formatApiDateToDisplay(summary.dataInicio)}`;
    }

    return `Período consultado: ${formatApiDateToDisplay(summary.dataInicio)} até ${formatApiDateToDisplay(summary.dataFim)}`;
  }, [summary]);

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
      });
      setSummary(result);
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  };

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

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={2.5}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <DatePickerField
                label="Data inicial"
                value={dataInicio}
                onValueChange={setDataInicio}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <DatePickerField
                label="Data final"
                value={dataFim}
                onValueChange={setDataFim}
              />
            </Grid>

            <Grid
              size={{ xs: 12, sm: 4 }}
              sx={{ display: 'flex', alignItems: 'stretch' }}
            >
              <Button
                fullWidth
                variant="contained"
                startIcon={isLoading ? <CircularProgress size={18} /> : <Insights />}
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Consultando...' : 'Consultar resumo'}
              </Button>
            </Grid>
          </Grid>

          <FormFeedbackAlert message={localError ?? problem?.detail} />

          {summary ? (
            <Stack spacing={2}>
              {periodoLabel ? (
                <Alert severity="info">{periodoLabel}</Alert>
              ) : null}

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
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

                <Grid size={{ xs: 12, md: 4 }}>
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

                <Grid size={{ xs: 12, md: 4 }}>
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
              </Grid>
            </Stack>
          ) : null}
        </Stack>
      </Paper>
    </Stack>
  );
}
