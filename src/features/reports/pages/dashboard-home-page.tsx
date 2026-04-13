import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  formatCurrency,
  getProblemDetailsFromError,
  type ProblemDetails,
} from '@/shared';
import {
  getDashboardMonthlySummary,
  type DashboardMonthlySummaryItem,
  type DashboardMonthlySummaryResponse,
} from '../api/reports-api';

const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

function getBarHeight(value: number, maxValue: number, chartHeight: number): number {
  if (maxValue <= 0) {
    return 0;
  }

  return (value / maxValue) * chartHeight;
}

interface ChartTooltipState {
  x: number;
  y: number;
  color: string;
  label: string;
  value: number;
}

function DashboardMonthlyChart({
  items,
}: {
  items: DashboardMonthlySummaryItem[];
}) {
  const chartHeight = 260;
  const chartTop = 24;
  const chartLeft = 96;
  const groupWidth = 70;
  const chartWidth = chartLeft + items.length * groupWidth;
  const maxPositiveValue = Math.max(
    ...items.flatMap((item) => [
      item.valorVendas,
      item.valorDespesas,
      Math.max(item.saldo, 0),
    ]),
    1,
  );
  const maxNegativeValue = Math.max(
    ...items.map((item) => Math.max(item.saldo * -1, 0)),
    0,
  );
  const totalDomain = maxPositiveValue + maxNegativeValue || 1;
  const positiveAreaHeight = (maxPositiveValue / totalDomain) * chartHeight;
  const negativeAreaHeight = (maxNegativeValue / totalDomain) * chartHeight;
  const baselineY = chartTop + positiveAreaHeight;
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null);

  const getValueY = (value: number): number => {
    if (value >= 0) {
      return baselineY - (value / maxPositiveValue) * positiveAreaHeight;
    }

    if (maxNegativeValue <= 0) {
      return baselineY;
    }

    return baselineY + (Math.abs(value) / maxNegativeValue) * negativeAreaHeight;
  };

  const axisTicks = [
    maxPositiveValue,
    maxPositiveValue * 0.5,
    0,
    maxNegativeValue > 0 ? -maxNegativeValue * 0.5 : null,
    maxNegativeValue > 0 ? -maxNegativeValue : null,
  ].filter((tick): tick is number => tick !== null);

  const handleOpenTooltip =
    (label: string, value: number, color: string) =>
    (event: React.MouseEvent<SVGRectElement>) => {
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        color,
        label,
        value,
      });
    };

  return (
    <Box sx={{ overflowX: 'auto', pb: 1, position: 'relative' }}>
      {tooltip ? (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            left: tooltip.x + 12,
            top: tooltip.y - 12,
            px: 1.25,
            py: 1,
            pointerEvents: 'none',
            zIndex: 1400,
            borderRadius: 2,
          }}
        >
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: 1,
                  bgcolor: tooltip.color,
                }}
              />
              <Typography variant="caption" fontWeight={700}>
                {tooltip.label}
              </Typography>
            </Stack>
            <Typography variant="body2">{formatCurrency(tooltip.value)}</Typography>
          </Stack>
        </Paper>
      ) : null}

      <Box sx={{ minWidth: chartWidth }}>
        <svg width={chartWidth} height={320} role="img" aria-label="Resumo mensal">
          {axisTicks.map((tick) => {
            const y = getValueY(tick);

            return (
              <g key={tick}>
                <line
                  x1={chartLeft - 12}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="currentColor"
                  opacity={tick === 0 ? 0.2 : 0.08}
                />
                <text
                  x={chartLeft - 18}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="currentColor"
                  opacity="0.72"
                >
                  {formatCurrency(tick)}
                </text>
              </g>
            );
          })}

          <line
            x1={chartLeft - 12}
            y1={baselineY}
            x2={chartWidth}
            y2={baselineY}
            stroke="currentColor"
            opacity="0.18"
          />

          {items.map((item, index) => {
            const startX = chartLeft + index * groupWidth;
            const monthLabel = MONTH_LABELS[item.mes - 1] ?? String(item.mes);
            const salesHeight = getBarHeight(
              item.valorVendas,
              maxPositiveValue,
              positiveAreaHeight,
            );
            const expenseHeight = getBarHeight(
              item.valorDespesas,
              maxPositiveValue,
              positiveAreaHeight,
            );
            const balanceHeight =
              item.saldo >= 0
                ? getBarHeight(item.saldo, maxPositiveValue, positiveAreaHeight)
                : getBarHeight(Math.abs(item.saldo), maxNegativeValue, negativeAreaHeight);
            const salesY = baselineY - salesHeight;
            const expenseY = baselineY - expenseHeight;
            const balanceY = item.saldo >= 0 ? baselineY - balanceHeight : baselineY;
            const balanceColor = item.saldo >= 0 ? '#D4AF37' : '#EF6C00';

            return (
              <g key={item.mes}>
                <rect
                  x={startX + 8}
                  y={salesY}
                  width="14"
                  height={salesHeight}
                  rx="4"
                  fill="#2E7D32"
                  onMouseMove={handleOpenTooltip(
                    `${monthLabel} · Vendas`,
                    item.valorVendas,
                    '#2E7D32',
                  )}
                  onMouseLeave={() => setTooltip(null)}
                />

                <rect
                  x={startX + 28}
                  y={expenseY}
                  width="14"
                  height={expenseHeight}
                  rx="4"
                  fill="#C62828"
                  onMouseMove={handleOpenTooltip(
                    `${monthLabel} · Despesas`,
                    item.valorDespesas,
                    '#C62828',
                  )}
                  onMouseLeave={() => setTooltip(null)}
                />

                <rect
                  x={startX + 48}
                  y={balanceY}
                  width="14"
                  height={balanceHeight}
                  rx="4"
                  fill={balanceColor}
                  onMouseMove={handleOpenTooltip(
                    `${monthLabel} · Saldo`,
                    item.saldo,
                    balanceColor,
                  )}
                  onMouseLeave={() => setTooltip(null)}
                />

                <text
                  x={startX + 35}
                  y={300}
                  textAnchor="middle"
                  fontSize="12"
                  fill="currentColor"
                  opacity="0.7"
                >
                  {monthLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </Box>
    </Box>
  );
}

export default function DashboardHomePage() {
  const [result, setResult] = useState<DashboardMonthlySummaryResponse | null>(null);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setProblem(null);

      try {
        const response = await getDashboardMonthlySummary();

        if (!active) {
          return;
        }

        setResult(response);
      } catch (error) {
        if (!active) {
          return;
        }

        setProblem(getProblemDetailsFromError(error));
        setResult(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const strongestMonth = useMemo(() => {
    if (!result || result.itens.length === 0) {
      return null;
    }

    return result.itens.reduce((best, current) =>
      current.saldo > best.saldo ? current : best,
    );
  }, [result]);

  const chartItems = useMemo(() => {
    if (!result) {
      return [];
    }

    return result.itens.filter(
      (item) =>
        item.valorVendas !== 0 || item.valorDespesas !== 0 || item.saldo !== 0,
    );
  }, [result]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Visão geral
        </Typography>
        <Typography color="text.secondary">
          Acompanhe a evolução mensal de vendas, despesas e saldo.
        </Typography>
      </Box>

      {problem?.detail ? <Alert severity="error">{problem.detail}</Alert> : null}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : result ? (
        <Stack spacing={3}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Total de vendas em {result.ano}
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                  {formatCurrency(result.totalVendas)}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Total de despesas em {result.ano}
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight={800}
                  sx={{ mt: 1, color: 'error.main' }}
                >
                  {formatCurrency(result.totalDespesas)}
                </Typography>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Saldo acumulado em {result.ano}
                </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{
                      mt: 1,
                      color: result.saldo >= 0 ? '#D4AF37' : 'warning.dark',
                    }}
                  >
                    {formatCurrency(result.saldo)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                spacing={1}
              >
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Resumo mensal
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valores mensais de vendas, despesas e saldo em {result.ano}.
                  </Typography>
                </Box>

                {strongestMonth ? (
                  <Typography variant="body2" color="text.secondary">
                    Melhor saldo: {MONTH_LABELS[strongestMonth.mes - 1]} ·{' '}
                    {formatCurrency(strongestMonth.saldo)}
                  </Typography>
                ) : null}
              </Stack>

              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: 1,
                      bgcolor: '#2E7D32',
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Vendas
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: 1,
                      bgcolor: '#C62828',
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Despesas
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: 1,
                      bgcolor: '#D4AF37',
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Saldo positivo
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: 1,
                      bgcolor: '#EF6C00',
                    }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Saldo negativo
                  </Typography>
                </Stack>
              </Stack>

              {chartItems.length > 0 ? (
                <DashboardMonthlyChart items={chartItems} />
              ) : (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    Nenhum mês com movimentação foi encontrado para este ano.
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Stack>
      ) : null}
    </Stack>
  );
}
