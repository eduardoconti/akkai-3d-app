import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Chip,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { listAllCategories } from '@/features/products/api/products-api';
import {
  getBestSellingProducts,
  type BestSellingProductItem,
  type BestSellingProductsResponse,
} from '@/features/reports/api/reports-api';
import { listFairs } from '@/features/sales/api/sales-api';
import { getSaleTypeLabel } from '@/features/sales/utils/format-sale-labels';
import {
  DateRangePickerField,
  DEFAULT_PAGE_SIZE,
  FormFeedbackAlert,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  getMonthRangeInput,
  getProblemDetailsFromError,
  type Categoria,
  type DataTableColumn,
  type Feira,
  type ProblemDetails,
  type TipoVenda,
} from '@/shared';

function formatApiDateToDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function getPeriodoLabel(result: BestSellingProductsResponse | null) {
  if (!result) {
    return null;
  }

  if (!result.dataInicio && !result.dataFim) {
    return 'Período consultado: todo o histórico';
  }

  if (result.dataInicio && !result.dataFim) {
    return `Período consultado: a partir de ${formatApiDateToDisplay(result.dataInicio)}`;
  }

  if (!result.dataInicio && result.dataFim) {
    return `Período consultado: até ${formatApiDateToDisplay(result.dataFim)}`;
  }

  if (result.dataInicio === result.dataFim) {
    return `Período consultado: ${formatApiDateToDisplay(result.dataInicio!)}`;
  }

  return `Período consultado: ${formatApiDateToDisplay(result.dataInicio!)} até ${formatApiDateToDisplay(result.dataFim!)}`;
}

function getProductRowKey(
  item: BestSellingProductItem,
  index: number,
  pagina: number,
): string {
  return [
    pagina,
    index,
    item.idProduto ?? 'avulso',
    item.codigo ?? 'sem-codigo',
    item.nomeProduto,
    item.categoria?.id ?? 'sem-categoria',
  ].join('-');
}

interface AppliedFilters {
  dataInicio: string;
  dataFim: string;
  tipoVenda: 'TODOS' | TipoVenda;
  idFeira: number | '';
  categoriasSelecionadas: Categoria[];
}

export default function ReportsBestSellingProductsPage() {
  const [dateRange, setDateRange] = useState(getMonthRangeInput);
  const [tipoVenda, setTipoVenda] = useState<'TODOS' | TipoVenda>('TODOS');
  const [idFeira, setIdFeira] = useState<number | ''>('');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<
    Categoria[]
  >([]);
  const [feiras, setFeiras] = useState<Feira[]>([]);
  const [result, setResult] = useState<BestSellingProductsResponse | null>(
    null,
  );
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(
    null,
  );
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [isLoadingFeiras, setIsLoadingFeiras] = useState(false);

  useEffect(() => {
    let active = true;

    async function carregarCategorias() {
      setIsLoadingFilters(true);

      try {
        const categoriasResponse = await listAllCategories();

        if (active) {
          setCategorias(categoriasResponse);
        }
      } catch (error) {
        if (active) {
          setProblem(getProblemDetailsFromError(error));
        }
      } finally {
        if (active) {
          setIsLoadingFilters(false);
        }
      }
    }

    void carregarCategorias();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tipoVenda !== 'FEIRA') {
      setIdFeira('');
      return;
    }

    if (feiras.length > 0) {
      return;
    }

    let active = true;

    async function carregarFeiras() {
      setIsLoadingFeiras(true);

      try {
        const feirasResponse = await listFairs();

        if (active) {
          setFeiras(feirasResponse);
        }
      } catch (error) {
        if (active) {
          setProblem(getProblemDetailsFromError(error));
        }
      } finally {
        if (active) {
          setIsLoadingFeiras(false);
        }
      }
    }

    void carregarFeiras();

    return () => {
      active = false;
    };
  }, [feiras.length, tipoVenda]);

  const getCurrentFilters = (): AppliedFilters => ({
    dataInicio: dateRange.startValue,
    dataFim: dateRange.endValue,
    tipoVenda,
    idFeira,
    categoriasSelecionadas,
  });

  const buscarRelatorio = async (
    pagina = 1,
    tamanhoPagina = result?.tamanhoPagina ?? DEFAULT_PAGE_SIZE,
    filters = getCurrentFilters(),
  ) => {
    setProblem(null);

    setIsLoading(true);

    try {
      const response = await getBestSellingProducts({
        dataInicio: filters.dataInicio || undefined,
        dataFim: filters.dataFim || undefined,
        tipoVenda:
          filters.tipoVenda === 'TODOS' ? undefined : filters.tipoVenda,
        idFeira:
          filters.tipoVenda === 'FEIRA' && filters.idFeira !== ''
            ? filters.idFeira
            : undefined,
        idsCategorias:
          filters.categoriasSelecionadas.length > 0
            ? filters.categoriasSelecionadas.map((categoria) => categoria.id)
            : undefined,
        pagina,
        tamanhoPagina,
      });

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

  const handleClearFilters = () => {
    setDateRange({ startValue: '', endValue: '' });
    setTipoVenda('TODOS');
    setIdFeira('');
    setCategoriasSelecionadas([]);
    setProblem(null);
    setResult(null);
    setAppliedFilters(null);
  };

  const periodoLabel = getPeriodoLabel(result);
  const visibleFilters = appliedFilters ?? getCurrentFilters();

  const productColumns: DataTableColumn<BestSellingProductItem>[] = [
    {
      id: 'codigo',
      header: 'Código',
      mobile: 'eyebrow',
      cell: (item) => item.codigo ?? '-',
    },
    {
      id: 'produto',
      header: 'Produto',
      mobile: 'title',
      cell: (item) => item.nomeProduto,
    },
    {
      id: 'categoria',
      header: 'Categoria',
      cell: (item) => item.categoria?.nome ?? '-',
    },
    {
      id: 'quantidade',
      header: 'Quantidade vendida',
      align: 'right',
      mobile: 'aside',
      cell: (item) => item.quantidadeVendida,
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Produtos mais vendidos"
        description="Identifique os produtos com maior giro em todo o histórico ou filtre por período, tipo de venda, feira e categorias."
      />

      <SearchFilterPanel
        onSearch={() => {
          void buscarRelatorio(1);
        }}
        onClear={handleClearFilters}
        isLoading={isLoading}
      >
        <Grid size={{ xs: 12, md: 6, lg: 6 }}>
          <DateRangePickerField
            label="Período"
            startValue={dateRange.startValue}
            endValue={dateRange.endValue}
            onValueChange={setDateRange}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
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
            <MenuItem value="CONSIGNACAO">Consignação</MenuItem>
          </TextField>
        </Grid>

        {tipoVenda === 'FEIRA' ? (
          <Grid size={{ xs: 12, md: 6, lg: 5 }}>
            <TextField
              select
              fullWidth
              disabled={isLoadingFeiras}
              label="Feira"
              value={idFeira}
              onChange={(event) =>
                setIdFeira(
                  event.target.value === '' ? '' : Number(event.target.value),
                )
              }
              helperText={
                feiras.length === 0 && !isLoadingFeiras
                  ? 'Nenhuma feira cadastrada.'
                  : undefined
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

        <Grid size={{ xs: 12, md: 6, lg: tipoVenda === 'FEIRA' ? 5 : 10 }}>
          <Autocomplete
            multiple
            options={categorias}
            value={categoriasSelecionadas}
            loading={isLoadingFilters}
            onChange={(_event, value) => setCategoriasSelecionadas(value)}
            getOptionLabel={(option) => option.nome}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Categorias"
                placeholder="Selecione uma ou mais categorias"
              />
            )}
          />
        </Grid>
      </SearchFilterPanel>

      <FormFeedbackAlert message={problem?.detail} />

      {result ? (
        <Stack spacing={2}>
          {periodoLabel ? <Alert severity="info">{periodoLabel}</Alert> : null}

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              label={`Tipo: ${getSaleTypeLabel(visibleFilters.tipoVenda)}`}
              size="small"
            />
            <Chip
              label={`Categorias: ${visibleFilters.categoriasSelecionadas.length}`}
              size="small"
            />
            {visibleFilters.tipoVenda === 'FEIRA' &&
            visibleFilters.idFeira !== '' ? (
              <Chip
                label={`Feira: ${feiras.find((feira) => feira.id === visibleFilters.idFeira)?.nome ?? visibleFilters.idFeira}`}
                size="small"
              />
            ) : null}
          </Stack>

          <ResponsiveDataTable
            rows={result.itens}
            columns={productColumns}
            getRowId={(item) =>
              getProductRowKey(item, result.itens.indexOf(item), result.pagina)
            }
            ariaLabel="ranking de produtos mais vendidos"
            emptyMessage="Nenhum produto encontrado para os filtros informados."
            isLoading={isLoading}
            pagination={{
              count: result.totalItens,
              page: Math.max(0, result.pagina - 1),
              rowsPerPage: result.tamanhoPagina,
              onPageChange: (newPage) => {
                if (appliedFilters) {
                  void buscarRelatorio(
                    newPage + 1,
                    result.tamanhoPagina,
                    appliedFilters,
                  );
                }
              },
              onRowsPerPageChange: (newRowsPerPage) => {
                if (appliedFilters) {
                  void buscarRelatorio(1, newRowsPerPage, appliedFilters);
                }
              },
            }}
          />
        </Stack>
      ) : null}
    </Stack>
  );
}
