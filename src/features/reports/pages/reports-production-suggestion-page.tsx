import { useState } from 'react';
import { Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  getProductionSuggestionReport,
  type ProductionSuggestionReportItem,
  type ProductionSuggestionReportResponse,
} from '@/features/reports/api/reports-api';
import {
  DEFAULT_PAGE_SIZE,
  FormFeedbackAlert,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  getProblemDetailsFromError,
  type DataTableColumn,
  type ProblemDetails,
} from '@/shared';

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCoverage(value: number | null): string {
  return value === null ? 'Sem venda' : `${formatQuantity(value)} feira(s)`;
}

type SuggestionOrderBy =
  | 'codigo'
  | 'nome'
  | 'estoqueAtual'
  | 'quantidadeVendida'
  | 'mediaVendaPorFeira'
  | 'feirasCobertura'
  | 'sugestaoProducao';
type SortDirection = 'asc' | 'desc';

interface AppliedFilters {
  feirasHistorico: number;
  feirasPlanejamento: number;
  feirasEstoqueSeguranca: number;
  ordenarPor: SuggestionOrderBy;
  direcao: SortDirection;
}

export default function ReportsProductionSuggestionPage() {
  const [feirasHistorico, setFeirasHistorico] = useState(8);
  const [feirasPlanejamento, setFeirasPlanejamento] = useState(2);
  const [feirasEstoqueSeguranca, setFeirasEstoqueSeguranca] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_PAGE_SIZE);
  const [ordenarPor, setOrdenarPor] =
    useState<SuggestionOrderBy>('sugestaoProducao');
  const [direcao, setDirecao] = useState<SortDirection>('desc');
  const [result, setResult] =
    useState<ProductionSuggestionReportResponse | null>(null);
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
      const response = await getProductionSuggestionReport({
        feirasHistorico: filters.feirasHistorico,
        feirasPlanejamento: filters.feirasPlanejamento,
        feirasEstoqueSeguranca: filters.feirasEstoqueSeguranca,
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

    await fetchReport(1, tamanhoPagina, {
      feirasHistorico,
      feirasPlanejamento,
      feirasEstoqueSeguranca,
      ordenarPor,
      direcao,
    });
  };

  const handleClearFilters = () => {
    setFeirasHistorico(8);
    setFeirasPlanejamento(2);
    setFeirasEstoqueSeguranca(1);
    setOrdenarPor('sugestaoProducao');
    setDirecao('desc');
    setProblem(null);
    setResult(null);
    setAppliedFilters(null);
  };

  const renderPriorityChip = (
    priority: ProductionSuggestionReportItem['prioridade'],
  ) => (
    <Chip
      label={priority === 'CRITICO' ? 'Crítico' : 'Produzir'}
      color={priority === 'CRITICO' ? 'error' : 'warning'}
      size="small"
      variant={priority === 'CRITICO' ? 'filled' : 'outlined'}
    />
  );

  const suggestionColumns: DataTableColumn<ProductionSuggestionReportItem>[] = [
    {
      id: 'codigo',
      header: 'Código',
      mobile: 'eyebrow',
      cell: (item) => item.codigo,
    },
    {
      id: 'produto',
      header: 'Produto',
      mobile: 'title',
      cell: (item) => item.nome,
    },
    {
      id: 'prioridade',
      header: 'Prioridade',
      mobile: 'badge',
      cell: (item) => renderPriorityChip(item.prioridade),
    },
    {
      id: 'estoque',
      header: 'Estoque',
      align: 'right',
      cell: (item) => formatQuantity(item.estoqueAtual),
    },
    {
      id: 'vendido',
      header: 'Vendido',
      align: 'right',
      cell: (item) => formatQuantity(item.quantidadeVendida),
    },
    {
      id: 'mediaFeira',
      header: 'Média/feira',
      align: 'right',
      cell: (item) => formatQuantity(item.mediaVendaPorFeira),
    },
    {
      id: 'cobertura',
      header: 'Cobertura',
      align: 'right',
      cell: (item) => formatCoverage(item.feirasCobertura),
    },
    {
      id: 'alvo',
      header: 'Alvo',
      align: 'right',
      cell: (item) => formatQuantity(item.estoqueAlvo),
    },
    {
      id: 'sugestao',
      header: 'Sugestão',
      align: 'right',
      mobile: 'aside',
      cell: (item) => (
        <Typography component="span" variant="inherit" fontWeight={700}>
          {formatQuantity(item.sugestaoProducao)}
        </Typography>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Sugestão de produção"
        description="Compare as últimas vendas de feira, estoque atual e estoque mínimo para decidir o que produzir para os próximos eventos."
      />

      <SearchFilterPanel
        onSearch={() => {
          void handleSubmit();
        }}
        onClear={handleClearFilters}
        isLoading={isLoading}
      >
        <Grid size={{ xs: 12, sm: 6, md: 2.4, lg: 4 }}>
          <TextField
            fullWidth
            label="Últimas feiras"
            type="number"
            value={feirasHistorico}
            slotProps={{
              htmlInput: { min: 1, max: 365 },
            }}
            onChange={(event) =>
              setFeirasHistorico(Math.max(1, Number(event.target.value) || 1))
            }
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4, lg: 4 }}>
          <TextField
            fullWidth
            label="Feiras planejamento"
            type="number"
            value={feirasPlanejamento}
            slotProps={{
              htmlInput: { min: 1, max: 90 },
            }}
            onChange={(event) =>
              setFeirasPlanejamento(
                Math.max(1, Number(event.target.value) || 1),
              )
            }
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4, lg: 4 }}>
          <TextField
            fullWidth
            label="Feiras segurança"
            type="number"
            value={feirasEstoqueSeguranca}
            slotProps={{
              htmlInput: { min: 0, max: 30 },
            }}
            onChange={(event) =>
              setFeirasEstoqueSeguranca(Math.max(0, Number(event.target.value)))
            }
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4, lg: 4 }}>
          <TextField
            select
            fullWidth
            label="Ordenar por"
            value={ordenarPor}
            onChange={(event) =>
              setOrdenarPor(event.target.value as SuggestionOrderBy)
            }
          >
            <MenuItem value="sugestaoProducao">Sugestão</MenuItem>
            <MenuItem value="feirasCobertura">Cobertura</MenuItem>
            <MenuItem value="quantidadeVendida">Quantidade vendida</MenuItem>
            <MenuItem value="mediaVendaPorFeira">Média por feira</MenuItem>
            <MenuItem value="estoqueAtual">Estoque atual</MenuItem>
            <MenuItem value="codigo">Código</MenuItem>
            <MenuItem value="nome">Nome</MenuItem>
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 2.4, lg: 4 }}>
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

      <FormFeedbackAlert message={problem?.detail} />

      {result ? (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`Produtos: ${result.totalItens}`} size="small" />
            <Chip
              label={`Produção sugerida: ${formatQuantity(result.totalQuantidadeSugerida)} un`}
              color="primary"
              size="small"
            />
            <Chip
              label={`Histórico: ${result.feirasConsideradas}/${result.feirasHistorico} feira(s)`}
              size="small"
            />
            <Chip
              label={`Planejamento: ${result.feirasPlanejamento} feira(s)`}
              size="small"
            />
            <Chip
              label={`Segurança: ${result.feirasEstoqueSeguranca} feira(s)`}
              size="small"
            />
          </Stack>

          <ResponsiveDataTable
            rows={result.itens}
            columns={suggestionColumns}
            getRowId={(item) => item.idProduto}
            ariaLabel="sugestão de produção"
            emptyMessage="Nenhuma produção foi sugerida para o período selecionado."
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
