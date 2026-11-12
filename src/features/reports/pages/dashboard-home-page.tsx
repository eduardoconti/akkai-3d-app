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
  ArrowDownward,
  ArrowUpward,
  Check,
  DragIndicator,
  ExpandLess,
  ExpandMore,
  Tune,
  ViewAgenda,
  ViewWeek,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import {
  formatCurrencyWithVisibility,
  FloatingTooltip,
  formatValueWithVisibility,
  getProblemDetailsFromError,
  PageHeader,
  StatCard,
  useValueVisibilityStore,
  getOverflowFadeSx,
  useFloatingTooltip,
  useHorizontalOverflow,
  type ProblemDetails,
} from '@/shared';
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
import {
  getContinuousMonthRange,
  getNiceAxisMax,
} from '../utils/monthly-chart';

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

/** Cores das séries do gráfico mensal (também usadas na legenda). */
const CHART_COLORS = {
  sales: '#16A06A',
  expenses: '#D9363E',
  positiveBalance: '#0B7FC0',
  negativeBalance: '#E08A00',
} as const;

const BAR_WIDTH = 14;
const BAR_GAP = 6;
const BAR_CLUSTER_WIDTH = 3 * BAR_WIDTH + 2 * BAR_GAP;
const MIN_MONTH_GROUP_WIDTH = 64;
const MAX_MONTH_GROUP_WIDTH = 120;

const DASHBOARD_WIDGET_ORDER_KEY = 'akkai.dashboard.widget-order';
const DASHBOARD_WIDGET_COLLAPSE_KEY = 'akkai.dashboard.widget-collapse';
const DASHBOARD_WIDGET_WIDTH_KEY = 'akkai.dashboard.widget-width';

type DashboardWidgetId =
  | 'monthly-summary'
  | 'top-products'
  | 'expense-categories';
type DashboardWidgetWidth = 'full' | 'half';

function getBarHeight(
  value: number,
  maxValue: number,
  chartHeight: number,
): number {
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

function getStoredCollapsedWidgets(): Partial<
  Record<DashboardWidgetId, boolean>
> {
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

function getStoredWidgetWidths(): Partial<
  Record<DashboardWidgetId, DashboardWidgetWidth>
> {
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
    return JSON.parse(rawValue) as Partial<
      Record<DashboardWidgetId, DashboardWidgetWidth>
    >;
  } catch {
    return {
      'monthly-summary': 'full',
      'top-products': 'half',
      'expense-categories': 'half',
    };
  }
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

function getMonthDateRange(
  year: number,
  month: number,
): {
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
  hideValues,
  items,
}: {
  hideValues: boolean;
  items: DashboardMonthlySummaryItem[];
}) {
  const chartHeight = 260;
  const chartTop = 24;
  // Largura da coluna fixa do eixo de valores (fora da área que rola).
  const axisWidth = 96;
  const {
    ref: scrollRef,
    element: scrollElement,
    overflow,
    width: containerWidth,
  } = useHorizontalOverflow<HTMLDivElement>();
  // Os meses dividem a largura do card; abaixo do mínimo, o gráfico rola.
  const groupWidth = Math.min(
    MAX_MONTH_GROUP_WIDTH,
    Math.max(MIN_MONTH_GROUP_WIDTH, containerWidth / Math.max(items.length, 1)),
  );
  const chartWidth = items.length * groupWidth;
  const clusterOffset = (groupWidth - BAR_CLUSTER_WIDTH) / 2;
  // Topo do eixo arredondado (ex.: 9.632 → 10.000) para marcações legíveis.
  const maxPositiveValue =
    getNiceAxisMax(
      Math.max(
        ...items.flatMap((item) => [
          item.valorVendas,
          item.valorDespesas,
          Math.max(item.saldo, 0),
        ]),
      ),
    ) || 1;
  const maxNegativeValue = getNiceAxisMax(
    Math.max(...items.map((item) => Math.max(item.saldo * -1, 0)), 0),
  );

  // Em telas estreitas, começa mostrando os meses mais recentes.
  useEffect(() => {
    if (scrollElement) {
      scrollElement.scrollLeft = scrollElement.scrollWidth;
    }
  }, [scrollElement, items.length]);
  const totalDomain = maxPositiveValue + maxNegativeValue || 1;
  const positiveAreaHeight = (maxPositiveValue / totalDomain) * chartHeight;
  const negativeAreaHeight = (maxNegativeValue / totalDomain) * chartHeight;
  const baselineY = chartTop + positiveAreaHeight;
  const getValueY = (value: number): number => {
    if (value >= 0) {
      return baselineY - (value / maxPositiveValue) * positiveAreaHeight;
    }

    if (maxNegativeValue <= 0) {
      return baselineY;
    }

    return (
      baselineY + (Math.abs(value) / maxNegativeValue) * negativeAreaHeight
    );
  };

  const axisTicks = [
    maxPositiveValue,
    maxPositiveValue * 0.5,
    0,
    maxNegativeValue > 0 ? -maxNegativeValue * 0.5 : null,
    maxNegativeValue > 0 ? -maxNegativeValue : null,
  ].filter((tick): tick is number => tick !== null);

  const { tooltip, getTargetProps } = useFloatingTooltip();
  const formatValue = (value: number) =>
    formatCurrencyWithVisibility(value, hideValues);

  return (
    <Box sx={{ display: 'flex', minWidth: 0 }}>
      <FloatingTooltip tooltip={tooltip} />

      {/* Eixo fixo: continua visível enquanto as barras rolam no celular. */}
      <svg width={axisWidth} height={320} aria-hidden style={{ flexShrink: 0 }}>
        {axisTicks.map((tick) => (
          <text
            key={tick}
            x={axisWidth - 8}
            y={getValueY(tick) + 4}
            textAnchor="end"
            fontSize="11"
            fill="currentColor"
            opacity="0.72"
          >
            {formatValue(tick)}
          </text>
        ))}
      </svg>

      <Box sx={[getOverflowFadeSx(overflow), { flexGrow: 1, minWidth: 0 }]}>
        <Box ref={scrollRef} sx={{ overflowX: 'auto', pb: 1 }}>
          <Box sx={{ minWidth: chartWidth }}>
            <svg
              width={chartWidth}
              height={320}
              role="group"
              aria-label="Resumo mensal de vendas, despesas e saldo"
            >
              {axisTicks.map((tick) => (
                <line
                  key={tick}
                  x1={0}
                  y1={getValueY(tick)}
                  x2={chartWidth}
                  y2={getValueY(tick)}
                  stroke="currentColor"
                  opacity={tick === 0 ? 0.2 : 0.08}
                  aria-hidden
                />
              ))}

              <line
                x1={0}
                y1={baselineY}
                x2={chartWidth}
                y2={baselineY}
                stroke="currentColor"
                opacity="0.18"
                aria-hidden
              />

              {items.map((item, index) => {
                const startX = index * groupWidth;
                const monthLabel =
                  MONTH_LABELS[item.mes - 1] ?? String(item.mes);
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
                    ? getBarHeight(
                        item.saldo,
                        maxPositiveValue,
                        positiveAreaHeight,
                      )
                    : getBarHeight(
                        Math.abs(item.saldo),
                        maxNegativeValue,
                        negativeAreaHeight,
                      );
                const salesY = baselineY - salesHeight;
                const expenseY = baselineY - expenseHeight;
                const balanceY =
                  item.saldo >= 0 ? baselineY - balanceHeight : baselineY;
                const balanceColor =
                  item.saldo >= 0
                    ? CHART_COLORS.positiveBalance
                    : CHART_COLORS.negativeBalance;
                const monthSummary = `${monthLabel}: vendas ${formatValue(item.valorVendas)}, despesas ${formatValue(item.valorDespesas)}, saldo ${formatValue(item.saldo)}`;

                // O mês inteiro é um alvo único: área de toque larga e um só ponto
                // de parada no teclado, com as três séries no mesmo tooltip.
                return (
                  <Box
                    component="g"
                    key={item.mes}
                    role="img"
                    aria-label={monthSummary}
                    {...getTargetProps(`mes-${item.mes}`, {
                      title: monthLabel,
                      lines: [
                        {
                          label: 'Vendas',
                          value: formatValue(item.valorVendas),
                          color: CHART_COLORS.sales,
                        },
                        {
                          label: 'Despesas',
                          value: formatValue(item.valorDespesas),
                          color: CHART_COLORS.expenses,
                        },
                        {
                          label: 'Saldo',
                          value: formatValue(item.saldo),
                          color: balanceColor,
                        },
                      ],
                    })}
                    sx={{
                      outline: 'none',
                      '& .chart-hit-area': {
                        fill: 'currentColor',
                        fillOpacity: 0,
                        transition: 'fill-opacity 0.15s ease',
                      },
                      '&:hover .chart-hit-area, &:focus-visible .chart-hit-area':
                        {
                          fillOpacity: 0.06,
                        },
                      '&:focus-visible .chart-hit-area': {
                        stroke: 'currentColor',
                        strokeOpacity: 0.4,
                        strokeWidth: 1.5,
                      },
                    }}
                  >
                    <rect
                      className="chart-hit-area"
                      x={startX}
                      y={chartTop - 8}
                      width={groupWidth}
                      height={300 - chartTop + 16}
                      rx="6"
                    />

                    <rect
                      x={startX + clusterOffset}
                      y={salesY}
                      width={BAR_WIDTH}
                      height={salesHeight}
                      rx="4"
                      fill={CHART_COLORS.sales}
                    />

                    <rect
                      x={startX + clusterOffset + BAR_WIDTH + BAR_GAP}
                      y={expenseY}
                      width={BAR_WIDTH}
                      height={expenseHeight}
                      rx="4"
                      fill={CHART_COLORS.expenses}
                    />

                    <rect
                      x={startX + clusterOffset + 2 * (BAR_WIDTH + BAR_GAP)}
                      y={balanceY}
                      width={BAR_WIDTH}
                      height={balanceHeight}
                      rx="4"
                      fill={balanceColor}
                    />

                    <text
                      x={startX + groupWidth / 2}
                      y={300}
                      textAnchor="middle"
                      fontSize="12"
                      fill="currentColor"
                      opacity="0.7"
                    >
                      {monthLabel}
                    </text>
                  </Box>
                );
              })}
            </svg>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const touchTargetSx = {
  '@media (pointer: coarse)': { minWidth: 44, minHeight: 44 },
} as const;

function DashboardWidget({
  children,
  isDragging,
  isDropTarget,
  id,
  isCollapsed,
  isCustomizing,
  onToggleWidth,
  onDragOver,
  onDragEnd,
  onDragStart,
  onDrop,
  onMove,
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
  /** Mostra os controles de largura e ordem (modo "Personalizar painel"). */
  isCustomizing: boolean;
  onToggleWidth: (widgetId: DashboardWidgetId) => void;
  onDragOver: (
    event: ReactDragEvent<HTMLDivElement>,
    targetId: DashboardWidgetId,
  ) => void;
  onDragEnd: () => void;
  onDragStart: (
    event: ReactDragEvent<HTMLElement>,
    widgetId: DashboardWidgetId,
  ) => void;
  onDrop: (targetId: DashboardWidgetId) => void;
  onMove: (widgetId: DashboardWidgetId, direction: -1 | 1) => void;
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
        p: { xs: 2, sm: 3 },
        minWidth: 0,
        borderRadius: 2,
        opacity: isDragging ? 0.55 : 1,
        border: '1px solid',
        borderColor: isDropTarget ? 'primary.main' : 'divider',
        boxShadow: isDropTarget
          ? '0 0 0 2px rgba(11, 127, 192, 0.14)'
          : undefined,
        transition:
          'opacity 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
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
          <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            <Typography
              variant="h6"
              component="h2"
              fontWeight={800}
              sx={{ lineHeight: 1.3 }}
            >
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>

          <Stack
            direction="row"
            spacing={0.5}
            sx={{ flexShrink: 0, mt: { xs: -0.5, sm: 0 } }}
          >
            {isCustomizing && !isMobile ? (
              <IconButton
                size="small"
                sx={touchTargetSx}
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
              sx={touchTargetSx}
              onClick={() => onToggleCollapse(id)}
              aria-label={
                isCollapsed ? 'Expandir gráfico' : 'Minimizar gráfico'
              }
            >
              {isCollapsed ? <ExpandMore /> : <ExpandLess />}
            </IconButton>
            {isCustomizing ? (
              <>
                {/* Alternativa ao arrastar: funciona em telas de toque e no teclado. */}
                <IconButton
                  size="small"
                  sx={touchTargetSx}
                  onClick={() => onMove(id, -1)}
                  aria-label="Mover para cima"
                >
                  <ArrowUpward />
                </IconButton>
                <IconButton
                  size="small"
                  sx={touchTargetSx}
                  onClick={() => onMove(id, 1)}
                  aria-label="Mover para baixo"
                >
                  <ArrowDownward />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label="Arrastar gráfico"
                  draggable
                  onDragStart={(event) => onDragStart(event, id)}
                  onDragEnd={onDragEnd}
                  sx={{
                    ...touchTargetSx,
                    cursor: 'grab',
                    touchAction: 'none',
                  }}
                >
                  <DragIndicator />
                </IconButton>
              </>
            ) : null}
          </Stack>
        </Stack>

        <Collapse in={!isCollapsed}>{children}</Collapse>
      </Stack>
    </Paper>
  );
}

export default function DashboardHomePage() {
  const [result, setResult] = useState<DashboardMonthlySummaryResponse | null>(
    null,
  );
  const [topProducts, setTopProducts] =
    useState<DashboardTopProductsResponse | null>(null);
  const [expenseCategories, setExpenseCategories] =
    useState<DashboardExpenseCategoriesResponse | null>(null);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [widgetOrder, setWidgetOrder] =
    useState<DashboardWidgetId[]>(getStoredWidgetOrder);
  const [collapsedWidgets, setCollapsedWidgets] = useState<
    Partial<Record<DashboardWidgetId, boolean>>
  >(getStoredCollapsedWidgets);
  const [widgetWidths, setWidgetWidths] = useState<
    Partial<Record<DashboardWidgetId, DashboardWidgetWidth>>
  >(getStoredWidgetWidths);
  const hideValues = useValueVisibilityStore((state) => state.hideValues);
  const [draggingWidgetId, setDraggingWidgetId] =
    useState<DashboardWidgetId | null>(null);
  const [dropTargetWidgetId, setDropTargetWidgetId] =
    useState<DashboardWidgetId | null>(null);
  const { tooltip, getTargetProps } = useFloatingTooltip();
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [topProductsMonthTotalQuantity, setTopProductsMonthTotalQuantity] =
    useState(0);
  const [
    expenseCategoriesMonthTotalValue,
    setExpenseCategoriesMonthTotalValue,
  ] = useState(0);

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

        const salesSummaryResponse = await getSalesSummary({
          dataInicio: topProductsDateRange.dataInicio,
          dataFim: topProductsDateRange.dataFim,
        });

        if (!active) {
          return;
        }

        setResult(response);
        setTopProducts(topProductsResponse);
        setExpenseCategories(expenseCategoriesResponse);
        setTopProductsMonthTotalQuantity(salesSummaryResponse.quantidadeItens);
        setExpenseCategoriesMonthTotalValue(
          expenseCategoriesResponse.valorTotal,
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

    return getContinuousMonthRange(result.itens);
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

  const handleMoveWidget = (widgetId: DashboardWidgetId, direction: -1 | 1) => {
    setWidgetOrder((current) => {
      const fromIndex = current.indexOf(widgetId);
      const toIndex = fromIndex + direction;

      if (fromIndex === -1 || toIndex < 0 || toIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[fromIndex], next[toIndex]] = [next[toIndex]!, next[fromIndex]!];
      return next;
    });
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
          isCustomizing={isCustomizing}
          widthMode={widgetWidths[widgetId] ?? 'full'}
          onToggleWidth={handleToggleWidth}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onMove={handleMoveWidget}
          onToggleCollapse={handleToggleCollapse}
        >
          <Stack spacing={2.5}>
            {strongestMonth ? (
              <Typography variant="body2" color="text.secondary">
                Melhor saldo: {MONTH_LABELS[strongestMonth.mes - 1]} ·{' '}
                {formatCurrencyWithVisibility(strongestMonth.saldo, hideValues)}
              </Typography>
            ) : null}

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: 1,
                    bgcolor: CHART_COLORS.sales,
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
                    bgcolor: CHART_COLORS.expenses,
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
                    bgcolor: CHART_COLORS.positiveBalance,
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
                    bgcolor: CHART_COLORS.negativeBalance,
                  }}
                />
                <Typography variant="body2" color="text.secondary">
                  Saldo negativo
                </Typography>
              </Stack>
            </Stack>

            {chartItems.length > 0 ? (
              <DashboardMonthlyChart
                hideValues={hideValues}
                items={chartItems}
              />
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
          isCustomizing={isCustomizing}
          widthMode={widgetWidths[widgetId] ?? 'half'}
          onToggleWidth={handleToggleWidth}
          onDragEnd={handleDragEnd}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onMove={handleMoveWidget}
          onToggleCollapse={handleToggleCollapse}
        >
          {topProducts && topProducts.itens.length > 0 ? (
            <Stack spacing={1.5}>
              {topProducts.itens.map((item, index) => {
                const maxQuantity = Math.max(
                  ...topProducts.itens.map(
                    (current) => current.quantidadeVendida,
                  ),
                  1,
                );
                const widthPercent =
                  (item.quantidadeVendida / maxQuantity) * 100;
                const totalMonthQuantity = topProductsMonthTotalQuantity;
                const monthShare =
                  totalMonthQuantity > 0
                    ? (item.quantidadeVendida / totalMonthQuantity) * 100
                    : 0;

                return (
                  <Box
                    key={`${item.idProduto ?? item.nomeProduto}-${index}`}
                    {...getTargetProps(`ranking-1-${index}`, {
                      color: '#0B7FC0',
                      title: `${index + 1}. ${item.nomeProduto}`,
                      lines: [
                        {
                          label: 'Quantidade',
                          value: `${item.quantidadeVendida} un`,
                        },
                      ],
                      caption: `${formatPercentage(monthShare)} do total vendido no mês`,
                    })}
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
                      <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                        <Typography fontWeight={700}>
                          {index + 1}. {item.nomeProduto}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.codigo ?? '-'}
                          {item.categoria?.nome
                            ? ` · ${item.categoria.nome}`
                            : ''}
                        </Typography>
                      </Box>

                      <Typography fontWeight={700} sx={{ flexShrink: 0 }}>
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
                            'linear-gradient(90deg, #0B7FC0 0%, #5BB8EA 100%)',
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
        isCustomizing={isCustomizing}
        widthMode={widgetWidths[widgetId] ?? 'half'}
        onToggleWidth={handleToggleWidth}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMove={handleMoveWidget}
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
                  {...getTargetProps(`ranking-2-${index}`, {
                    color: '#D9363E',
                    title: `${index + 1}. ${item.nomeCategoria}`,
                    lines: [
                      {
                        label: 'Valor',
                        value: formatCurrencyWithVisibility(
                          item.valorTotal,
                          hideValues,
                        ),
                      },
                    ],
                    caption: `${formatPercentage(monthShare)} do total de despesas do mês`,
                  })}
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
                    <Typography
                      fontWeight={700}
                      sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
                    >
                      {index + 1}. {item.nomeCategoria}
                    </Typography>

                    <Typography
                      fontWeight={700}
                      color="error.main"
                      sx={{ flexShrink: 0 }}
                    >
                      {formatCurrencyWithVisibility(
                        item.valorTotal,
                        hideValues,
                      )}
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
                          'linear-gradient(90deg, #D9363E 0%, #F0686E 100%)',
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
      <FloatingTooltip tooltip={tooltip} />

      <Stack spacing={3}>
        <PageHeader
          title="Visão geral"
          description="Acompanhe a evolução mensal de vendas, despesas e saldo."
          actions={
            <Button
              variant={isCustomizing ? 'contained' : 'outlined'}
              startIcon={isCustomizing ? <Check /> : <Tune />}
              onClick={() => setIsCustomizing((current) => !current)}
              aria-pressed={isCustomizing}
            >
              {isCustomizing ? 'Concluir' : 'Personalizar painel'}
            </Button>
          }
        />

        {problem?.detail ? (
          <Alert severity="error">{problem.detail}</Alert>
        ) : null}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : result ? (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, lg: 3 }} sx={{ minWidth: 0 }}>
                <StatCard
                  label={`Itens vendidos em ${result.ano}`}
                  value={formatValueWithVisibility(
                    String(result.totalQuantidadeItensVendidos),
                    hideValues,
                  )}
                  {...getTargetProps('card-1', {
                    lines: [
                      {
                        label: 'Catálogo',
                        value: String(result.totalQuantidadeItensCatalogo ?? 0),
                      },
                      {
                        label: 'Brindes',
                        value: String(result.totalQuantidadeBrindes ?? 0),
                      },
                      {
                        label: 'Avulsos',
                        value: String(result.totalQuantidadeItensAvulsos ?? 0),
                      },
                    ],
                  })}
                />
              </Grid>

              <Grid size={{ xs: 6, lg: 3 }} sx={{ minWidth: 0 }}>
                <StatCard
                  label={`Total de vendas em ${result.ano}`}
                  value={formatCurrencyWithVisibility(
                    result.totalVendas,
                    hideValues,
                  )}
                  tone="success"
                  {...getTargetProps('card-2', {
                    lines: [
                      {
                        label: 'Taxas',
                        value: formatCurrencyWithVisibility(
                          result.totalTaxas,
                          hideValues,
                        ),
                      },
                      {
                        label: 'Impostos',
                        value: formatCurrencyWithVisibility(
                          result.totalImpostos,
                          hideValues,
                        ),
                      },
                      {
                        label: 'Valor líquido',
                        value: formatCurrencyWithVisibility(
                          result.totalVendas -
                            result.totalTaxas -
                            result.totalImpostos,
                          hideValues,
                        ),
                      },
                    ],
                  })}
                />
              </Grid>

              <Grid size={{ xs: 6, lg: 3 }} sx={{ minWidth: 0 }}>
                <StatCard
                  label={`Total de despesas em ${result.ano}`}
                  value={formatCurrencyWithVisibility(
                    result.totalDespesas,
                    hideValues,
                  )}
                  tone="error"
                />
              </Grid>

              <Grid size={{ xs: 6, lg: 3 }} sx={{ minWidth: 0 }}>
                <StatCard
                  label={`Saldo acumulado em ${result.ano}`}
                  value={formatCurrencyWithVisibility(result.saldo, hideValues)}
                  tone={result.saldo >= 0 ? 'primary' : 'error'}
                  {...getTargetProps('card-3', {
                    lines: [
                      {
                        label: 'Fórmula',
                        value: 'vendas - taxas - despesas + ajustes',
                      },
                      {
                        label: 'Vendas',
                        value: formatCurrencyWithVisibility(
                          result.totalVendas,
                          hideValues,
                        ),
                      },
                      {
                        label: 'Taxas',
                        value: hideValues
                          ? formatCurrencyWithVisibility(
                              result.totalTaxas,
                              hideValues,
                            )
                          : `-${formatCurrencyWithVisibility(result.totalTaxas, hideValues)}`,
                      },
                      {
                        label: 'Despesas',
                        value: hideValues
                          ? formatCurrencyWithVisibility(
                              result.totalDespesas,
                              hideValues,
                            )
                          : `-${formatCurrencyWithVisibility(result.totalDespesas, hideValues)}`,
                      },
                      {
                        label: 'Ajustes de carteira',
                        value: hideValues
                          ? formatCurrencyWithVisibility(
                              Math.abs(result.totalAjusteCarteira ?? 0),
                              hideValues,
                            )
                          : `${(result.totalAjusteCarteira ?? 0) >= 0 ? '+' : '-'}${formatCurrencyWithVisibility(
                              Math.abs(result.totalAjusteCarteira ?? 0),
                              hideValues,
                            )}`,
                      },
                      {
                        label: 'Saldo',
                        value: formatCurrencyWithVisibility(
                          result.saldo,
                          hideValues,
                        ),
                      },
                    ],
                  })}
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                display: 'grid',
                gap: { xs: 2, sm: 3 },
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  lg: 'repeat(2, minmax(0, 1fr))',
                },
                alignItems: 'start',
              }}
            >
              {widgetOrder.map((widgetId) => (
                <Box
                  key={widgetId}
                  sx={{
                    minWidth: 0,
                    gridColumn: {
                      xs: 'auto',
                      lg:
                        (widgetWidths[widgetId] ??
                          (widgetId === 'monthly-summary'
                            ? 'full'
                            : 'half')) === 'full'
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
