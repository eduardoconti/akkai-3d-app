import { useCallback, useEffect, useState } from 'react';
import { Alert, MenuItem, Stack, TextField } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useMainLayoutActions } from '@/app/layouts/main-layout-actions';
import CashRegisterDetailsDialog from '@/features/finance/components/cash-register-details-dialog';
import { listCashRegisters } from '@/features/finance/api/finance-api';
import { listFairs } from '@/features/sales/api/sales-api';
import { convertDateToApiDateFormat } from '@/features/finance/types/finance-form';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import { DEFAULT_PAGE_SIZE } from '@/shared/lib/constants/pagination';
import { getMonthRangeInput } from '@/shared/utils/date-range';
import {
  DateRangePickerField,
  PageHeader,
  ResponsiveDataTable,
  SearchFilterPanel,
  type Caixa,
  type DataTableColumn,
  type Feira,
  type PesquisaPaginadaCaixas,
  StatusChip,
} from '@/shared';

const periodoInicial = getMonthRangeInput();

const pesquisaInicial: PesquisaPaginadaCaixas = {
  pagina: 1,
  tamanhoPagina: DEFAULT_PAGE_SIZE,
  dataInicio: periodoInicial.startValue,
  dataFim: periodoInicial.endValue,
  idFeira: undefined,
};

export default function FinanceCashRegistersPage() {
  const { openCashRegisterDialog } = useMainLayoutActions();
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [feiras, setFeiras] = useState<Feira[]>([]);
  const [pesquisa, setPesquisa] =
    useState<PesquisaPaginadaCaixas>(pesquisaInicial);
  const [dateRange, setDateRange] = useState({
    startValue: pesquisaInicial.dataInicio ?? '',
    endValue: pesquisaInicial.dataFim ?? '',
  });
  const [idFeira, setIdFeira] = useState<number | ''>('');
  const [totalItens, setTotalItens] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [caixaSelecionadoId, setCaixaSelecionadoId] = useState<number | null>(
    null,
  );

  const carregarCaixas = useCallback(
    async (alteracoes?: Partial<PesquisaPaginadaCaixas>) => {
      const proximaPesquisa = { ...pesquisa, ...alteracoes };
      setCarregando(true);
      setErro(null);
      try {
        const resultado = await listCashRegisters(proximaPesquisa);
        setCaixas(resultado.itens);
        setTotalItens(resultado.totalItens);
        setPesquisa({
          ...proximaPesquisa,
          pagina: resultado.pagina,
          tamanhoPagina: resultado.tamanhoPagina,
        });
      } catch (error) {
        setErro(getProblemDetailsFromError(error).detail);
      } finally {
        setCarregando(false);
      }
    },
    [pesquisa],
  );

  useEffect(() => {
    void listFairs()
      .then(setFeiras)
      .catch(() => setErro('Não foi possível carregar as feiras.'));
    void carregarCaixas();
    // A carga inicial deve usar apenas os valores iniciais do filtro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const atualizar = () => void carregarCaixas();
    window.addEventListener('caixas:atualizados', atualizar);
    return () => window.removeEventListener('caixas:atualizados', atualizar);
  }, [carregarCaixas]);

  const handleSearch = () => {
    void carregarCaixas({
      pagina: 1,
      dataInicio: convertDateToApiDateFormat(dateRange.startValue) ?? '',
      dataFim: convertDateToApiDateFormat(dateRange.endValue) ?? '',
      idFeira: idFeira === '' ? undefined : idFeira,
    });
  };

  const handleClear = () => {
    setDateRange({ startValue: '', endValue: '' });
    setIdFeira('');
    void carregarCaixas({
      pagina: 1,
      dataInicio: '',
      dataFim: '',
      idFeira: undefined,
    });
  };

  const formatarDataHora = (valor?: string | null) =>
    valor ? new Date(valor).toLocaleString('pt-BR') : '-';

  const colunasCaixas: DataTableColumn<Caixa>[] = [
    {
      id: 'abertura',
      header: 'Abertura',
      cell: (caixa) => formatarDataHora(caixa.dataAbertura),
    },
    {
      id: 'feira',
      header: 'Feira',
      mobile: 'title',
      cell: (caixa) => caixa.feira?.nome ?? `Feira ${caixa.idFeira}`,
    },
    {
      id: 'status',
      header: 'Status',
      mobile: 'badge',
      cell: (caixa) => (
        <StatusChip
          tone={caixa.status === 'ABERTO' ? 'success' : 'default'}
          label={caixa.status === 'ABERTO' ? 'Aberto' : 'Fechado'}
        />
      ),
    },
    {
      id: 'fechamento',
      header: 'Fechamento',
      cell: (caixa) => formatarDataHora(caixa.dataFechamento),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Caixas"
        description="Pesquise as aberturas e acompanhe as conferências realizadas por feira."
        actionLabel="Abertura de caixa"
        onAction={openCashRegisterDialog}
      />

      <SearchFilterPanel
        defaultCollapsedOnMobile
        onSearch={handleSearch}
        onClear={handleClear}
        isLoading={carregando}
        columns={{ xs: 12, md: 12, lg: 12 }}
      >
        <Grid size={{ xs: 12, md: 6 }}>
          <DateRangePickerField
            label="Período de abertura"
            startValue={dateRange.startValue}
            endValue={dateRange.endValue}
            onValueChange={setDateRange}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
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
          >
            <MenuItem value="">Todas</MenuItem>
            {feiras.map((feira) => (
              <MenuItem key={feira.id} value={feira.id}>
                {feira.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </SearchFilterPanel>

      {erro ? <Alert severity="error">{erro}</Alert> : null}

      <ResponsiveDataTable
        rows={caixas}
        columns={colunasCaixas}
        getRowId={(caixa) => caixa.id}
        ariaLabel="tabela de caixas"
        emptyMessage="Nenhum caixa encontrado para os filtros informados."
        isLoading={carregando}
        onRowClick={(caixa) => setCaixaSelecionadoId(caixa.id)}
        pagination={{
          count: totalItens,
          page: Math.max(0, pesquisa.pagina - 1),
          rowsPerPage: pesquisa.tamanhoPagina,
          onPageChange: (novaPagina) =>
            void carregarCaixas({ pagina: novaPagina + 1 }),
          onRowsPerPageChange: (novoTamanho) =>
            void carregarCaixas({ pagina: 1, tamanhoPagina: novoTamanho }),
        }}
      />

      <CashRegisterDetailsDialog
        open={caixaSelecionadoId !== null}
        caixaId={caixaSelecionadoId}
        caixaResumo={
          caixas.find((caixa) => caixa.id === caixaSelecionadoId) ?? null
        }
        onClose={() => setCaixaSelecionadoId(null)}
      />
    </Stack>
  );
}
