import { useEffect, useMemo, useState } from 'react';
import { Alert, MenuItem, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  getSalesSummary,
  type SalesSummary,
} from '@/features/reports/api/reports-api';
import { listFairs } from '@/features/sales/api/sales-api';
import {
  CurrencyValue,
  DateRangePickerField,
  FormFeedbackAlert,
  PageHeader,
  StatCard,
  SearchFilterPanel,
  getProblemDetailsFromError,
  getMonthRangeInput,
  type Feira,
  type ProblemDetails,
  type TipoVenda,
} from '@/shared';
import { getSaleTypeLabel } from '@/features/sales/utils/format-sale-labels';

function formatApiDateToDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return value;
  }

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

interface AppliedFilters {
  tipoVenda: 'TODOS' | TipoVenda;
  idFeira: number | '';
}

export default function ReportsSummaryPage() {
  const [dateRange, setDateRange] = useState(getMonthRangeInput);
  const [tipoVenda, setTipoVenda] = useState<'TODOS' | TipoVenda>('TODOS');
  const [idFeira, setIdFeira] = useState<number | ''>('');
  const [feiras, setFeiras] = useState<Feira[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters | null>(
    null,
  );
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  useEffect(() => {
    if (tipoVenda !== 'FEIRA' || feiras.length > 0) {
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
  }, [feiras.length, tipoVenda]);

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

    if (!appliedFilters) {
      return null;
    }

    if (appliedFilters.tipoVenda !== 'TODOS') {
      filtros.push(`Tipo: ${getSaleTypeLabel(appliedFilters.tipoVenda)}`);
    }

    if (appliedFilters.tipoVenda === 'FEIRA' && appliedFilters.idFeira !== '') {
      const feiraSelecionada = feiras.find(
        (feira) => feira.id === appliedFilters.idFeira,
      );

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
  }, [summary, appliedFilters, feiras]);

  const handleSubmit = async () => {
    setProblem(null);
    setLocalError(null);

    if (!dateRange.startValue || !dateRange.endValue) {
      setLocalError('Selecione as datas inicial e final.');
      setSummary(null);
      setAppliedFilters(null);
      return;
    }

    setIsLoading(true);

    try {
      const result = await getSalesSummary({
        dataInicio: dateRange.startValue,
        dataFim: dateRange.endValue,
        tipoVenda: tipoVenda === 'TODOS' ? undefined : tipoVenda,
        idFeira: tipoVenda === 'FEIRA' && idFeira !== '' ? idFeira : undefined,
      });
      setSummary(result);
      setAppliedFilters({ tipoVenda, idFeira });
    } catch (error) {
      setProblem(getProblemDetailsFromError(error));
      setSummary(null);
      setAppliedFilters(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setDateRange({ startValue: '', endValue: '' });
    setTipoVenda('TODOS');
    setIdFeira('');
    setProblem(null);
    setLocalError(null);
    setSummary(null);
    setAppliedFilters(null);
  };

  const summaryCards = summary
    ? [
        {
          id: 'quantidadeItens',
          label: 'Quantidade de itens',
          tone: 'default' as const,
          value: summary.quantidadeItens,
        },
        {
          id: 'descontoTotal',
          label: 'Desconto total',
          tone: 'warning' as const,
          value: <CurrencyValue value={summary.descontoTotal} />,
        },
        {
          id: 'valorTotal',
          label: 'Valor total',
          tone: 'primary' as const,
          value: <CurrencyValue value={summary.valorTotal} />,
        },
        {
          id: 'valorLiquido',
          label: 'Valor líquido',
          tone: 'success' as const,
          value: <CurrencyValue value={summary.valorLiquido} />,
        },
      ]
    : [];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Resumo de vendas"
        description="Consulte a quantidade de itens vendidos, o desconto total e o valor total em um período."
      />

      <SearchFilterPanel
        onSearch={() => {
          void handleSubmit();
        }}
        onClear={handleClearFilters}
        isLoading={isLoading}
      >
        <Grid size={{ xs: 12, md: 6, lg: tipoVenda === 'FEIRA' ? 8 : 10 }}>
          <DateRangePickerField
            label="Período"
            startValue={dateRange.startValue}
            endValue={dateRange.endValue}
            onValueChange={setDateRange}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: tipoVenda === 'FEIRA' ? 6 : 10 }}>
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
          <Grid size={{ xs: 12, md: 6, lg: 6 }}>
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
      </SearchFilterPanel>

      <FormFeedbackAlert message={localError ?? problem?.detail} />

      {summary ? (
        <Stack spacing={2}>
          {periodoLabel ? <Alert severity="info">{periodoLabel}</Alert> : null}

          <Grid container spacing={2}>
            {summaryCards.map((card) => (
              <Grid key={card.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                <StatCard
                  label={card.label}
                  value={card.value}
                  tone={card.tone}
                />
              </Grid>
            ))}
          </Grid>
        </Stack>
      ) : null}
    </Stack>
  );
}
