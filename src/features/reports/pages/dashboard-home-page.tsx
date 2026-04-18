import {
  useEffect,
  useMemo,
  useState,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  DragIndicator,
  ExpandLess,
  ExpandMore,
  Visibility,
  VisibilityOff,
  ViewAgenda,
  ViewWeek,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  formatCurrency,
  getProblemDetailsFromError,
  type ProblemDetails,
} from '@/shared';
import { listExpenses } from '@/features/finance/api/finance-api';
import {
  getDashboardExpenseCategories,
  getDashboardMonthlySummary,
  getSalesSummary,
  getDashboardTopProducts,
  type DashboardExpenseCategoriesResponse,
  type DashboardMonthlySummaryItem,
  type DashboardMonthlySummaryResponse,
  type DashboardTopProductsResponse,
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

const DASHBOARD_WIDGET_ORDER_KEY = 'akkai.dashboard.widget-order';
const DASHBOARD_WIDGET_COLLAPSE_KEY = 'akkai.dashboard.widget-collapse';
const DASHBOARD_WIDGET_WIDTH_KEY = 'akkai.dashboard.widget-width';
const DASHBOARD_HIDE_VALUES_KEY = 'akkai.dashboard.hide-values';

type DashboardWidgetId =
  | 'monthly-summary'
  | 'top-products'
  | 'expense-categories';
type DashboardWidgetWidth = 'full' | 'half';

interface ChartTooltipState {
  x: number;
  y: number;
  color: string;
  label: string;
  value: number;
}

interface RankingTooltipState {
  x: number;
  y: number;
  color: string;
  label: string;
  valueLabel: string;
  percentageLabel: string;
}

interface CardTooltipLine {
  label: string;
  value: string;
}

interface CardTooltipState {
  x: number;
  y: number;
  lines: CardTooltipLine[];
}

function getBarHeight(value: number, maxValue: number, chartHeight: number): number {
  if (maxValue <= 0) {
    return 0;
  }

  return (value / maxValue) * chartHeight;
}

function getStoredWidgetOrder(): DashboardWidgetId[] {
  if (typeof window === 'undefined') {
    return ['monthly-summary', 'top-products', 'expense-categories'];
  }

  const rawValue = window.localStorage.getItem(DASHBOARD_WIDGET_ORDER_KEY);

  if (!rawValue) {
    return ['monthly-summary', 'top-products', 'expense-categories'];
  }

  try {
    const parsed = JSON.parse(rawValue) as DashboardWidgetId[];
    const validWidgets: DashboardWidgetId[] = [
      'monthly-summary',
      'top-products',
      'expense-categories',
    ];

    return validWidgets.filter((widgetId) => parsed.includes(widgetId));
  } catch {
    return ['monthly-summary', 'top-products', 'expense-categories'];
  }
}

function getStoredCollapsedWidgets(): Partial<Record<DashboardWidgetId, boolean>> {
  if (typeof window === 'undefined') {
    return {};
  }

  const rawValue = window.localStorage.getItem(DASHBOARD_WIDGET_COLLAPSE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    return JSON.parse(rawValue) as Partial<Record<DashboardWidgetId, boolean>>;
  } catch {
    return {};
  }
}

function getStoredWidgetWidths(): Partial<Record<DashboardWidgetId, DashboardWidgetWidth>> {
  if (typeof window === 'undefined') {
    return {
      'monthly-summary': 'full',
      'top-products': 'half',
      'expense-categories': 'half',
    };
  }

  const rawValue = window.localStorage.getItem(DASHBOARD_WIDGET_WIDTH_KEY);

  if (!rawValue) {
    return {
      'monthly-summary': 'full',
      'top-products': 'half',
      'expense-categories': 'half',
    };
  }

  try {
    return JSON.parse(rawValue) as Partial<Record<DashboardWidgetId, DashboardWidgetWidth>>;
  } catch {
    return {
      'monthly-summary': 'full',
      'top-products': 'half',
      'expense-categories': 'half',
    };
  }
}

function getStoredHideValues(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(DASHBOARD_HIDE_VALUES_KEY) === 'true';
}

function formatDashboardValue(value: string, hideValues: boolean): string {
  return hideValues ? '••••••' : value;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

function getMonthDateRange(year: number, month: number): {
  dataInicio: string;
  dataFim: string;
} {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    dataInicio: formatDate(startDate),
    dataFim: formatDate(endDate),
  };
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

function DashboardWidget({
  children,
  isDragging,
  isDropTarget,
  id,
  isCollapsed,
  onToggleWidth,
  onDragOver,
  onDragEnd,
  onDragStart,
  onDrop,
  onToggleCollapse,
  subtitle,
  title,
  widthMode,
}: {
  children: ReactNode;
  isDragging: boolean;
  isDropTarget: boolean;
  id: DashboardWidgetId;
  isCollapsed: boolean;
  onToggleWidth: (widgetId: DashboardWidgetId) => void;
  onDragOver: (event: ReactDragEvent<HTMLDivElement>, targetId: DashboardWidgetId) => void;
  onDragEnd: () => void;
  onDragStart: (
    event: ReactDragEvent<HTMLElement>,
    widgetId: DashboardWidgetId,
  ) => void;
  onDrop: (targetId: DashboardWidgetId) => void;
  onToggleCollapse: (widgetId: DashboardWidgetId) => void;
  subtitle: string;
  title: string;
  widthMode: DashboardWidgetWidth;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        opacity: isDragging ? 0.55 : 1,
        border: '1px solid',
        borderColor: isDropTarget ? 'primary.main' : 'divider',
        boxShadow: isDropTarget ? '0 0 0 2px rgba(25, 118, 210, 0.12)' : undefined,
        transition: 'opacity 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}
      onDragOver={(event) => onDragOver(event, id)}
      onDrop={() => onDrop(id)}
    >
      <Stack spacing={2.5}>
        <Stack
          direction="row"
          justifyContent="space-between"
          spacing={1}
          alignItems="flex-start"
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={800}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>

          <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
            {!isMobile ? (
              <IconButton
                size="small"
                onClick={() => onToggleWidth(id)}
                aria-label={
                  widthMode === 'full'
                    ? 'Mudar para meia largura'
                    : 'Mudar para largura total'
                }
              >
                {widthMode === 'full' ? <ViewWeek /> : <ViewAgenda />}
              </IconButton>
            ) : null}
            <IconButton
              size="small"
              onClick={() => onToggleCollapse(id)}
              aria-label={isCollapsed ? 'Expandir gráfico' : 'Minimizar gráfico'}
            >
              {isCollapsed ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
            <IconButton
              size="small"
              aria-label="Arrastar gráfico"
              draggable
              onDragStart={(event) => onDragStart(event, id)}
              onDragEnd={onDragEnd}
              sx={{ cursor: 'grab' }}
            >
              <DragIndicator />
            </IconButton>
          </Stack>
        </Stack>

        <Collapse in={!isCollapsed}>{children}</Collapse>
      </Stack>
    </Paper>
  );
}

export default function DashboardHomePage() {
  const [result, setResult] = useState<DashboardMonthlySummaryResponse | null>(null);
  const [topProducts, setTopProducts] = useState<DashboardTopProductsResponse | null>(
    null,
  );
  const [expenseCategories, setExpenseCategories] =
    useState<DashboardExpenseCategoriesResponse | null>(null);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(
    getStoredWidgetOrder,
  );
  const [collapsedWidgets, setCollapsedWidgets] = useState<
    Partial<Record<DashboardWidgetId, boolean>>
  >(getStoredCollapsedWidgets);
  const [widgetWidths, setWidgetWidths] = useState<
    Partial<Record<DashboardWidgetId, DashboardWidgetWidth>>
  >(getStoredWidgetWidths);
  const [hideValues, setHideValues] = useState<boolean>(getStoredHideValues);
  const [draggingWidgetId, setDraggingWidgetId] = useState<DashboardWidgetId | null>(
    null,
  );
  const [dropTargetWidgetId, setDropTargetWidgetId] = useState<DashboardWidgetId | null>(
    null,
  );
  const [rankingTooltip, setRankingTooltip] = useState<RankingTooltipState | null>(null);
  const [cardTooltip, setCardTooltip] = useState<CardTooltipState | null>(null);
  const [topProductsMonthTotalQuantity, setTopProductsMonthTotalQuantity] = useState(0);
  const [expenseCategoriesMonthTotalValue, setExpenseCategoriesMonthTotalValue] = useState(0);

  useEffect(() => {
    window.localStorage.setItem(
      DASHBOARD_WIDGET_ORDER_KEY,
      JSON.stringify(widgetOrder),
    );
  }, [widgetOrder]);

  useEffect(() => {
    window.localStorage.setItem(
      DASHBOARD_WIDGET_COLLAPSE_KEY,
      JSON.stringify(collapsedWidgets),
    );
  }, [collapsedWidgets]);

  useEffect(() => {
    window.localStorage.setItem(
      DASHBOARD_WIDGET_WIDTH_KEY,
      JSON.stringify(widgetWidths),
    );
  }, [widgetWidths]);

  useEffect(() => {
    window.localStorage.setItem(
      DASHBOARD_HIDE_VALUES_KEY,
      String(hideValues),
    );
  }, [hideValues]);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      setIsLoading(true);
      setProblem(null);

      try {
        const [response, topProductsResponse, expenseCategoriesResponse] =
          await Promise.all([
            getDashboardMonthlySummary(),
            getDashboardTopProducts(),
            getDashboardExpenseCategories(),
          ]);

        const topProductsDateRange = getMonthDateRange(
          topProductsResponse.ano,
          topProductsResponse.mes,
        );
        const expenseCategoriesDateRange = getMonthDateRange(
          expenseCategoriesResponse.ano,
          expenseCategoriesResponse.mes,
        );

        const [salesSummaryResponse, expenseSummaryResponse] = await Promise.all([
          getSalesSummary({
            dataInicio: topProductsDateRange.dataInicio,
            dataFim: topProductsDateRange.dataFim,
          }),
          listExpenses({
            pagina: 1,
            tamanhoPagina: 1,
            termo: '',
            dataInicio: expenseCategoriesDateRange.dataInicio,
            dataFim: expenseCategoriesDateRange.dataFim,
            idsCategorias: [],
          }),
        ]);

        if (!active) {
          return;
        }

        setResult(response);
        setTopProducts(topProductsResponse);
        setExpenseCategories(expenseCategoriesResponse);
        setTopProductsMonthTotalQuantity(salesSummaryResponse.quantidadeItens);
        setExpenseCategoriesMonthTotalValue(
          expenseSummaryResponse.totalizadores.valorTotal,
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setProblem(getProblemDetailsFromError(error));
        setResult(null);
        setTopProducts(null);
        setExpenseCategories(null);
        setTopProductsMonthTotalQuantity(0);
        setExpenseCategoriesMonthTotalValue(0);
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

  const handleDragStart = (
    event: ReactDragEvent<HTMLElement>,
    widgetId: DashboardWidgetId,
  ) => {
    event.dataTransfer.effectAllowed = 'move';
    const transparentImage = new Image();
    transparentImage.src =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    event.dataTransfer.setDragImage(transparentImage, 0, 0);
    setDraggingWidgetId(widgetId);
    setDropTargetWidgetId(null);
  };

  const handleDragEnd = () => {
    setDraggingWidgetId(null);
    setDropTargetWidgetId(null);
  };

  const handleDragOver = (
    event: ReactDragEvent<HTMLDivElement>,
    targetId: DashboardWidgetId,
  ) => {
    event.preventDefault();
    if (draggingWidgetId && draggingWidgetId !== targetId) {
      setDropTargetWidgetId(targetId);
    }
  };

  const handleDrop = (targetId: DashboardWidgetId) => {
    if (!draggingWidgetId || draggingWidgetId === targetId) {
      setDraggingWidgetId(null);
      setDropTargetWidgetId(null);
      return;
    }

    setWidgetOrder((current) => {
      const next = [...current];
      const fromIndex = next.indexOf(draggingWidgetId);
      const toIndex = next.indexOf(targetId);

      if (fromIndex === -1 || toIndex === -1) {
        return current;
      }

      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggingWidgetId);
      return next;
    });

    setDraggingWidgetId(null);
    setDropTargetWidgetId(null);
  };

  const handleToggleCollapse = (widgetId: DashboardWidgetId) => {
    setCollapsedWidgets((current) => ({
      ...current,
      [widgetId]: !current[widgetId],
    }));
  };

  const handleToggleWidth = (widgetId: DashboardWidgetId) => {
    setWidgetWidths((current) => ({
      ...current,
      [widgetId]: current[widgetId] === 'half' ? 'full' : 'half',
    }));
  };

  const handleOpenRankingTooltip =
    (tooltip: Omit<RankingTooltipState, 'x' | 'y'>) =>
    (event: React.MouseEvent<HTMLDivElement>) => {
      setRankingTooltip({
        ...tooltip,
        x: event.clientX,
        y: event.clientY,
      });
    };

  const handleCardMouseMove =
    (lines: CardTooltipLine[]) => (event: React.MouseEvent<HTMLDivElement>) => {
      setCardTooltip({ x: event.clientX, y: event.clientY, lines });
    };

  const renderWidget = (widgetId: DashboardWidgetId) => {
    if (!result) {
      return null;
    }

    if (widgetId === 'monthly-summary') {
      return (
        <DashboardWidget
          id={widgetId}
          isDragging={draggingWidgetId === widgetId}
          isDropTarget={dropTargetWidgetId === widgetId}
          title="Resumo mensal"
          subtitle={`Valores mensais de vendas, despesas e saldo em ${result.ano}.`}
          isCollapsed={Boolean(collapsedWidgets[widgetId])}
          widthMode={widgetWidths[widgetId] ?? 'full'}
          onToggleWidth={handleToggleWidth}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onToggleCollapse={handleToggleCollapse}
        >
          <Stack spacing={2.5}>
            {strongestMonth ? (
              <Typography variant="body2" color="text.secondary">
                Melhor saldo: {MONTH_LABELS[strongestMonth.mes - 1]} ·{' '}
                {formatCurrency(strongestMonth.saldo)}
              </Typography>
            ) : null}

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
        </DashboardWidget>
      );
    }

    if (widgetId === 'top-products') {
      return (
        <DashboardWidget
          id={widgetId}
          isDragging={draggingWidgetId === widgetId}
          isDropTarget={dropTargetWidgetId === widgetId}
          title="Top 5 produtos mais vendidos no mês"
          subtitle={`Ranking do mês ${MONTH_LABELS[(topProducts?.mes ?? 1) - 1]} de ${topProducts?.ano ?? result.ano}.`}
          isCollapsed={Boolean(collapsedWidgets[widgetId])}
          widthMode={widgetWidths[widgetId] ?? 'half'}
          onToggleWidth={handleToggleWidth}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onToggleCollapse={handleToggleCollapse}
        >
          {topProducts && topProducts.itens.length > 0 ? (
            <Stack spacing={1.5}>
              {topProducts.itens.map((item, index) => {
                const maxQuantity = Math.max(
                  ...topProducts.itens.map((current) => current.quantidadeVendida),
                  1,
                );
                const widthPercent = (item.quantidadeVendida / maxQuantity) * 100;
                const totalMonthQuantity = topProductsMonthTotalQuantity;
                const monthShare =
                  totalMonthQuantity > 0
                    ? (item.quantidadeVendida / totalMonthQuantity) * 100
                    : 0;

                return (
                  <Box
                    key={`${item.idProduto ?? item.nomeProduto}-${index}`}
                    onMouseMove={handleOpenRankingTooltip({
                      color: '#1565C0',
                      label: `${index + 1}. ${item.nomeProduto}`,
                      valueLabel: `${item.quantidadeVendida} un`,
                      percentageLabel: `${formatPercentage(monthShare)} do total vendido no mes`,
                    })}
                    onMouseLeave={() => setRankingTooltip(null)}
                    sx={{
                      cursor: 'default',
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      spacing={2}
                      sx={{ mb: 0.75 }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={700}>
                          {index + 1}. {item.nomeProduto}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.codigo ?? '-'}
                          {item.categoria?.nome ? ` · ${item.categoria.nome}` : ''}
                        </Typography>
                      </Box>

                      <Typography fontWeight={700}>
                        {item.quantidadeVendida} un
                      </Typography>
                    </Stack>

                    <Box
                      sx={{
                        height: 10,
                        borderRadius: 999,
                        bgcolor: 'action.hover',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${widthPercent}%`,
                          height: '100%',
                          borderRadius: 999,
                          background:
                            'linear-gradient(90deg, #1565C0 0%, #42A5F5 100%)',
                        }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">
                Nenhuma venda encontrada no mês atual.
              </Typography>
            </Box>
          )}
        </DashboardWidget>
      );
    }

    return (
      <DashboardWidget
        id={widgetId}
        isDragging={draggingWidgetId === widgetId}
        isDropTarget={dropTargetWidgetId === widgetId}
        title="Despesas do mês por categoria"
        subtitle={`Categorias com maior peso nas despesas de ${MONTH_LABELS[(expenseCategories?.mes ?? 1) - 1]} de ${expenseCategories?.ano ?? result.ano}.`}
        isCollapsed={Boolean(collapsedWidgets[widgetId])}
        widthMode={widgetWidths[widgetId] ?? 'half'}
        onToggleWidth={handleToggleWidth}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onToggleCollapse={handleToggleCollapse}
      >
        {expenseCategories && expenseCategories.itens.length > 0 ? (
          <Stack spacing={1.5}>
            {expenseCategories.itens.map((item, index) => {
              const maxValue = Math.max(
                ...expenseCategories.itens.map((current) => current.valorTotal),
                1,
              );
              const widthPercent = (item.valorTotal / maxValue) * 100;
              const totalMonthExpenses = expenseCategoriesMonthTotalValue;
              const monthShare =
                totalMonthExpenses > 0
                  ? (item.valorTotal / totalMonthExpenses) * 100
                  : 0;

              return (
                <Box
                  key={`${item.idCategoria ?? item.nomeCategoria}-${index}`}
                  onMouseMove={handleOpenRankingTooltip({
                    color: '#C62828',
                    label: `${index + 1}. ${item.nomeCategoria}`,
                    valueLabel: formatCurrency(item.valorTotal),
                    percentageLabel: `${formatPercentage(monthShare)} do total de despesas do mes`,
                  })}
                  onMouseLeave={() => setRankingTooltip(null)}
                  sx={{
                    cursor: 'default',
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    spacing={2}
                    sx={{ mb: 0.75 }}
                  >
                    <Typography fontWeight={700}>
                      {index + 1}. {item.nomeCategoria}
                    </Typography>

                    <Typography fontWeight={700} color="error.main">
                      {formatCurrency(item.valorTotal)}
                    </Typography>
                  </Stack>

                  <Box
                    sx={{
                      height: 10,
                      borderRadius: 999,
                      bgcolor: 'action.hover',
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${widthPercent}%`,
                        height: '100%',
                        borderRadius: 999,
                        background:
                          'linear-gradient(90deg, #C62828 0%, #EF5350 100%)',
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              Nenhuma despesa encontrada no mês atual.
            </Typography>
          </Box>
        )}
      </DashboardWidget>
    );
  };

  return (
    <>
      {rankingTooltip ? (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            left: rankingTooltip.x + 12,
            top: rankingTooltip.y - 12,
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
                  bgcolor: rankingTooltip.color,
                }}
              />
              <Typography variant="caption" fontWeight={700}>
                {rankingTooltip.label}
              </Typography>
            </Stack>
            <Typography variant="body2">{rankingTooltip.valueLabel}</Typography>
            <Typography variant="caption" color="text.secondary">
              {rankingTooltip.percentageLabel}
            </Typography>
          </Stack>
        </Paper>
      ) : null}

      {cardTooltip ? (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            left: cardTooltip.x + 14,
            top: cardTooltip.y - 14,
            px: 1.5,
            py: 1,
            pointerEvents: 'none',
            zIndex: 1400,
            borderRadius: 2,
          }}
        >
          <Stack spacing={0.5}>
            {cardTooltip.lines.map((line) => (
              <Stack key={line.label} direction="row" spacing={1.5} justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  {line.label}
                </Typography>
                <Typography variant="caption" fontWeight={700}>
                  {line.value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      ) : null}

      <Stack spacing={3}>
        <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        spacing={2}
        >
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Visão geral
            </Typography>
            <Typography color="text.secondary">
              Acompanhe a evolução mensal de vendas, despesas e saldo.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={hideValues ? <Visibility /> : <VisibilityOff />}
            onClick={() => setHideValues((current) => !current)}
          >
            {hideValues ? 'Exibir valores' : 'Ocultar valores'}
          </Button>
        </Stack>

        {problem?.detail ? <Alert severity="error">{problem.detail}</Alert> : null}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : result ? (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2.5, borderRadius: 3, cursor: 'default' }}
                  onMouseMove={handleCardMouseMove([
                    {
                      label: 'Itens',
                      value: String(result.totalQuantidadeItensVendidos),
                    },
                    {
                      label: 'Brindes',
                      value: String(result.totalQuantidadeBrindes),
                    },
                  ])}
                  onMouseLeave={() => setCardTooltip(null)}
                >
                  <Typography variant="body2" color="text.secondary">
                    Itens vendidos em {result.ano}
                  </Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                    {formatDashboardValue(
                      String(result.totalQuantidadeItensVendidos),
                      hideValues,
                    )}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Paper
                  variant="outlined"
                  sx={{ p: 2.5, borderRadius: 3, cursor: 'default' }}
                  onMouseMove={handleCardMouseMove([
                    {
                      label: 'Taxas',
                      value: hideValues ? '••••••' : formatCurrency(result.totalTaxas),
                    },
                    {
                      label: 'Impostos',
                      value: hideValues ? '••••••' : formatCurrency(result.totalImpostos),
                    },
                    {
                      label: 'Valor líquido',
                      value: hideValues
                        ? '••••••'
                        : formatCurrency(
                            result.totalVendas - result.totalTaxas - result.totalImpostos,
                          ),
                    },
                  ])}
                  onMouseLeave={() => setCardTooltip(null)}
                >
                  <Typography variant="body2" color="text.secondary">
                    Total de vendas em {result.ano}
                  </Typography>
                  <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
                    {formatDashboardValue(
                      formatCurrency(result.totalVendas),
                      hideValues,
                    )}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total de despesas em {result.ano}
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    sx={{ mt: 1, color: 'error.main' }}
                  >
                    {formatDashboardValue(
                      formatCurrency(result.totalDespesas),
                      hideValues,
                    )}
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
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
                    {formatDashboardValue(
                      formatCurrency(result.saldo),
                      hideValues,
                    )}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Box
              sx={{
                display: 'grid',
                gap: 3,
                gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' },
                alignItems: 'start',
              }}
            >
              {widgetOrder.map((widgetId) => (
                <Box
                  key={widgetId}
                  sx={{
                    gridColumn: {
                      xs: 'auto',
                      lg:
                        (widgetWidths[widgetId] ??
                          (widgetId === 'monthly-summary' ? 'full' : 'half')) ===
                        'full'
                          ? '1 / -1'
                          : 'span 1',
                    },
                  }}
                >
                  {renderWidget(widgetId)}
                </Box>
              ))}
            </Box>
          </Stack>
        ) : null}
      </Stack>
    </>
  );
}
