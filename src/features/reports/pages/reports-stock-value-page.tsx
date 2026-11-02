import { useState } from 'react';
import { Chip, MenuItem, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  getStockValueReport,
  type StockValueProductItem,
  type StockValueReportResponse,
} from '@/features/reports/api/reports-api';
import {
  CurrencyValue,
  DEFAULT_PAGE_SIZE,
  FormFeedbackAlert,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  formatCurrencyWithVisibility,
  getProblemDetailsFromError,
  useValueVisibilityStore,
  type DataTableColumn,
  type ProblemDetails,
} from '@/shared';

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

type StockOrderBy = 'codigo' | 'nome' | 'quantidade' | 'valor' | 'valorTotal';
type SortDirection = 'asc' | 'desc';

interface AppliedFilters {
  ordenarPor: StockOrderBy;
  direcao: SortDirection;
}

export default function ReportsStockValuePage() {
  const hideValues = useValueVisibilityStore((state) => state.hideValues);
  const [result, setResult] = useState<StockValueReportResponse | null>(null);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_PAGE_SIZE);
  const [ordenarPor, setOrdenarPor] = useState<StockOrderBy>('codigo');
  const [direcao, setDirecao] = useState<SortDirection>('asc');
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(
    null,
  );
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchReport = async (
    nextPage: number,
    nextPageSize: number,
    filters: AppliedFilters,
  ) => {
    setProblem(null);
    setIsLoading(true);

    try {
      const response = await getStockValueReport({
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
    await fetchReport(1, tamanhoPagina, { ordenarPor, direcao });
  };

  const handleClearFilters = () => {
    setOrdenarPor('codigo');
    setDirecao('asc');
    setProblem(null);
    setResult(null);
    setAppliedFilters(null);
  };

  const stockColumns: DataTableColumn<StockValueProductItem>[] = [
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
      cell: (item) => formatQuantity(item.quantidade),
    },
    {
      id: 'valor',
      header: 'Valor',
      align: 'right',
      cell: (item) => <CurrencyValue value={item.valor} />,
    },
    {
      id: 'valorTotal',
      header: 'Valor total',
      align: 'right',
      cell: (item) => <CurrencyValue value={item.valorTotal} />,
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Valor dos produtos em estoque"
        description="Consulte o saldo positivo do estoque com valor unitario, valor total por item e totalizadores globais do relatorio."
      />

      <SearchFilterPanel
        onSearch={() => {
          void handleSubmit();
        }}
        onClear={handleClearFilters}
        isLoading={isLoading}
      >
        <Grid size={{ xs: 12, md: 6, lg: 10 }}>
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={ordenarPor}
            onChange={(event) =>
              setOrdenarPor(event.target.value as StockOrderBy)
            }
          >
            <MenuItem value="codigo">Codigo</MenuItem>
            <MenuItem value="nome">Nome</MenuItem>
            <MenuItem value="quantidade">Quantidade</MenuItem>
            <MenuItem value="valor">Valor</MenuItem>
            <MenuItem value="valorTotal">Valor total</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 10 }}>
          <TextField
            select
            fullWidth
            label="Direção"
            value={direcao}
            onChange={(event) =>
              setDirecao(event.target.value as SortDirection)
            }
          >
            <MenuItem value="asc">Crescente</MenuItem>
            <MenuItem value="desc">Decrescente</MenuItem>
          </TextField>
        </Grid>
      </SearchFilterPanel>

      <FormFeedbackAlert message={problem?.detail} />

      {result ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`Produtos: ${result.totalItens}`} size="small" />
            <Chip
              label={`Quantidade total: ${formatQuantity(result.totalQuantidade)}`}
              size="small"
            />
            <Chip
              label={`Soma dos valores: ${formatCurrencyWithVisibility(result.totalValor, hideValues)}`}
              size="small"
            />
            <Chip
              label={`Valor total em estoque: ${formatCurrencyWithVisibility(result.totalValorTotal, hideValues)}`}
              color="primary"
              size="small"
            />
          </Stack>

          <ResponsiveDataTable
            rows={result.itens}
            columns={stockColumns}
            getRowId={(item) => item.codigo}
            ariaLabel="relatorio de valor dos produtos em estoque"
            emptyMessage="Nenhum produto com estoque positivo foi encontrado."
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
