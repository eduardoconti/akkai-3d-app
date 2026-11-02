import { useState } from 'react';
import { Chip, MenuItem, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  getProductionReport,
  type ProductionReportItem,
  type ProductionReportResponse,
} from '@/features/reports/api/reports-api';
import {
  CurrencyValue,
  DateRangePickerField,
  DEFAULT_PAGE_SIZE,
  FormFeedbackAlert,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  formatCurrencyWithVisibility,
  getMonthRangeInput,
  getProblemDetailsFromError,
  useValueVisibilityStore,
  type DataTableColumn,
  type ProblemDetails,
} from '@/shared';

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value);
}

type ProductionOrderBy =
  | 'codigo'
  | 'nome'
  | 'quantidadeProduzida'
  | 'valorEstimado';
type SortDirection = 'asc' | 'desc';

interface AppliedFilters {
  dataInicio: string;
  dataFim: string;
  ordenarPor: ProductionOrderBy;
  direcao: SortDirection;
}

export default function ReportsProductionPage() {
  const hideValues = useValueVisibilityStore((state) => state.hideValues);
  const [dateRange, setDateRange] = useState(getMonthRangeInput);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_PAGE_SIZE);
  const [ordenarPor, setOrdenarPor] = useState<ProductionOrderBy>(
    'quantidadeProduzida',
  );
  const [direcao, setDirecao] = useState<SortDirection>('desc');
  const [result, setResult] = useState<ProductionReportResponse | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(
    null,
  );
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = async (
    nextPage: number,
    nextPageSize: number,
    filters: AppliedFilters,
  ) => {
    setProblem(null);
    setLocalError(null);
    setIsLoading(true);

    try {
      const response = await getProductionReport({
        dataInicio: filters.dataInicio,
        dataFim: filters.dataFim,
        pagina: nextPage,
        tamanhoPagina: nextPageSize,
        ordenarPor: filters.ordenarPor,
        direcao: filters.direcao,
      });
      setTamanhoPagina(response.tamanhoPagina);
      setResult(response);
      setAppliedFilters(filters);
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
      setResult(null);
      setAppliedFilters(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    setProblem(null);
    setLocalError(null);

    if (!dateRange.startValue || !dateRange.endValue) {
      setLocalError('Selecione as datas inicial e final.');
      setResult(null);
      setAppliedFilters(null);
      return;
    }

    await fetchReport(1, tamanhoPagina, {
      dataInicio: dateRange.startValue,
      dataFim: dateRange.endValue,
      ordenarPor,
      direcao,
    });
  };

  const handleClearFilters = () => {
    setDateRange({ startValue: '', endValue: '' });
    setOrdenarPor('quantidadeProduzida');
    setDirecao('desc');
    setProblem(null);
    setLocalError(null);
    setResult(null);
    setAppliedFilters(null);
  };

  const productionColumns: DataTableColumn<ProductionReportItem>[] = [
    {
      id: 'codigo',
      header: 'Codigo',
      mobile: 'eyebrow',
      cell: (item) => item.codigo,
    },
    {
      id: 'nome',
      header: 'Nome',
      mobile: 'title',
      cell: (item) => item.nome,
    },
    {
      id: 'quantidade',
      header: 'Quantidade',
      align: 'right',
      mobile: 'aside',
      cell: (item) => formatQuantity(item.quantidadeProduzida),
    },
    {
      id: 'valorUnitario',
      header: 'Valor unitario',
      align: 'right',
      cell: (item) => <CurrencyValue value={item.valorUnitario} />,
    },
    {
      id: 'valorEstimado',
      header: 'Valor estimado',
      align: 'right',
      cell: (item) => <CurrencyValue value={item.valorEstimado} />,
    },
    {
      id: 'mediaQuantidade',
      header: 'Media pecas/dia',
      align: 'right',
      cell: (item) => formatQuantity(item.mediaQuantidadePorDia),
    },
    {
      id: 'mediaValor',
      header: 'Media valor/dia',
      align: 'right',
      cell: (item) => <CurrencyValue value={item.mediaValorPorDia} />,
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Relatorio de producao"
        description="Consulte as pecas produzidas no período, o valor estimado com base no valor atual dos produtos e as medias diarias de quantidade e valor."
      />

      <SearchFilterPanel
        onSearch={() => {
          void handleSubmit();
        }}
        onClear={handleClearFilters}
        isLoading={isLoading}
      >
        <Grid size={{ xs: 12, md: 6, lg: 8 }}>
          <DateRangePickerField
            label="Período"
            startValue={dateRange.startValue}
            endValue={dateRange.endValue}
            onValueChange={setDateRange}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={ordenarPor}
            onChange={(event) =>
              setOrdenarPor(event.target.value as ProductionOrderBy)
            }
          >
            <MenuItem value="quantidadeProduzida">
              Quantidade produzida
            </MenuItem>
            <MenuItem value="valorEstimado">Valor estimado</MenuItem>
            <MenuItem value="codigo">Codigo</MenuItem>
            <MenuItem value="nome">Nome</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <TextField
            select
            fullWidth
            label="Direção"
            value={direcao}
            onChange={(event) =>
              setDirecao(event.target.value as SortDirection)
            }
          >
            <MenuItem value="desc">Decrescente</MenuItem>
            <MenuItem value="asc">Crescente</MenuItem>
          </TextField>
        </Grid>
      </SearchFilterPanel>

      <FormFeedbackAlert message={localError ?? problem?.detail} />

      {result ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Periodo: ${result.diasNoPeriodo} dia(s)`}
              size="small"
            />
            <Chip
              label={`Pecas produzidas: ${formatQuantity(result.totalQuantidadeProduzida)}`}
              size="small"
            />
            <Chip
              label={`Valor estimado: ${formatCurrencyWithVisibility(result.totalValorEstimado, hideValues)}`}
              color="primary"
              size="small"
            />
            <Chip
              label={`Media de pecas/dia: ${formatQuantity(result.mediaQuantidadePorDia)}`}
              size="small"
            />
            <Chip
              label={`Media de valor/dia: ${formatCurrencyWithVisibility(result.mediaValorPorDia, hideValues)}`}
              size="small"
            />
          </Stack>

          <ResponsiveDataTable
            rows={result.itens}
            columns={productionColumns}
            getRowId={(item) => item.codigo}
            ariaLabel="relatorio de producao"
            emptyMessage="Nenhuma produção foi encontrada no período selecionado."
            isLoading={isLoading}
            pagination={{
              count: result.totalItens,
              page: Math.max(0, result.pagina - 1),
              rowsPerPage: result.tamanhoPagina,
              onPageChange: (newPage) => {
                if (appliedFilters) {
                  void fetchReport(
                    newPage + 1,
                    result.tamanhoPagina,
                    appliedFilters,
                  );
                }
              },
              onRowsPerPageChange: (newRowsPerPage) => {
                if (appliedFilters) {
                  void fetchReport(1, newRowsPerPage, appliedFilters);
                }
              },
            }}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
