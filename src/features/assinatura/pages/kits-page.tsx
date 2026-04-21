import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { AutoAwesome } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { EditKitDialog, NewKitDialog } from '@/features/assinatura';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import { MESES_LABEL } from '@/features/assinatura/types/assinatura-form';
import {
  AppTablePagination,
  EmptyState,
  LoadingState,
  PageHeader,
  useFeedbackStore,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

export default function KitsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    fetchErrorMessage,
    fetchKits,
    fetchPlanos,
    gerarCiclosMensais,
    isFetching,
    isSubmitting,
    kits,
    paginacaoKits,
    planos,
    submitErrorMessage,
    totalKits,
  } = useAssinaturaStore(
    useShallow((state) => ({
      fetchErrorMessage: assinaturaStoreSelectors.fetchErrorMessage(state),
      fetchKits: assinaturaStoreSelectors.fetchKits(state),
      fetchPlanos: assinaturaStoreSelectors.fetchPlanos(state),
      gerarCiclosMensais: assinaturaStoreSelectors.gerarCiclosMensais(state),
      isFetching: assinaturaStoreSelectors.isFetching(state),
      isSubmitting: assinaturaStoreSelectors.isSubmitting(state),
      kits: assinaturaStoreSelectors.kits(state),
      paginacaoKits: assinaturaStoreSelectors.paginacaoKits(state),
      planos: assinaturaStoreSelectors.planos(state),
      submitErrorMessage: assinaturaStoreSelectors.submitErrorMessage(state),
      totalKits: assinaturaStoreSelectors.totalKits(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editingKitId, setEditingKitId] = useState<number | null>(null);
  const [idPlanoFiltro, setIdPlanoFiltro] = useState<number | ''>('');
  const [mesFiltro, setMesFiltro] = useState<number | ''>('');
  const [anoFiltro, setAnoFiltro] = useState<number | ''>('');

  useEffect(() => {
    void fetchPlanos();
  }, [fetchPlanos]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchKits({
        pagina: 1,
        idPlano: idPlanoFiltro || undefined,
        mes: mesFiltro || undefined,
        ano: anoFiltro || undefined,
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [fetchKits, idPlanoFiltro, mesFiltro, anoFiltro]);

  const handleUpdated = async () => {
    await fetchKits({ pagina: 1 });
  };

  const handleGerarCiclos = async (idKit: number) => {
    const result = await gerarCiclosMensais(idKit);

    if (!result.success) {
      return;
    }

    const { criados, ignorados } = result.data;
    if (criados > 0) {
      showSuccess(
        `${criados} ${criados === 1 ? 'ciclo criado' : 'ciclos criados'}${ignorados > 0 ? ` e ${ignorados} ${ignorados === 1 ? 'assinante ignorado' : 'assinantes ignorados'}` : ''}.`,
      );
      return;
    }

    showSuccess('Nenhum ciclo criado. Todos os assinantes já possuem ciclo para este período.');
  };

  const currentYear = new Date().getFullYear();
  const ANOS = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i);

  return (
    <Stack spacing={3}>
      <PageHeader
        title="Kits mensais"
        description="Defina o kit de produtos de cada plano por mês e gere os ciclos de envio."
        actionLabel="Novo kit"
        onAction={() => setNewDialogOpen(true)}
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            select
            fullWidth
            label="Plano"
            value={idPlanoFiltro}
            onChange={(e) =>
              setIdPlanoFiltro(e.target.value === '' ? '' : Number(e.target.value))
            }
          >
            <MenuItem value="">Todos</MenuItem>
            {planos.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            select
            fullWidth
            label="Mês"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(MESES_LABEL).map(([mes, label]) => (
              <MenuItem key={mes} value={Number(mes)}>
                {label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <TextField
            select
            fullWidth
            label="Ano"
            value={anoFiltro}
            onChange={(e) => setAnoFiltro(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <MenuItem value="">Todos</MenuItem>
            {ANOS.map((ano) => (
              <MenuItem key={ano} value={ano}>
                {ano}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {fetchErrorMessage ? <Alert severity="error">{fetchErrorMessage}</Alert> : null}
      {submitErrorMessage ? <Alert severity="error">{submitErrorMessage}</Alert> : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de kits mensais">
            {isFetching ? (
              <LoadingState />
            ) : kits.length > 0 ? (
              kits.map((kit) => (
                <Box
                  key={kit.id}
                  sx={{ px: 2, py: 2, cursor: 'pointer' }}
                  onClick={() => setEditingKitId(kit.id)}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700} noWrap>
                        {kit.plano?.nome ?? `Plano #${kit.idPlano}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {MESES_LABEL[kit.mesReferencia]} / {kit.anoReferencia}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {kit.itens?.length ?? 0} {kit.itens?.length === 1 ? 'item' : 'itens'}
                      </Typography>
                    </Box>
                    <Stack alignItems="flex-end" spacing={1}>
                      <Chip
                        size="small"
                        label={`${kit.itens?.length ?? 0} itens`}
                        variant="outlined"
                        sx={{ flexShrink: 0 }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AutoAwesome />}
                        disabled={isSubmitting}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleGerarCiclos(kit.id);
                        }}
                      >
                        Gerar ciclos
                      </Button>
                    </Stack>
                  </Stack>
                </Box>
              ))
            ) : (
              <EmptyState message="Nenhum kit encontrado para os filtros informados." />
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de kits mensais">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Plano</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Referência</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Itens</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Ações</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ p: 0 }}>
                      <LoadingState />
                    </TableCell>
                  </TableRow>
                ) : kits.length > 0 ? (
                  kits.map((kit) => (
                    <TableRow
                      key={kit.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setEditingKitId(kit.id)}
                    >
                      <TableCell>
                        {kit.plano?.nome ?? `Plano #${kit.idPlano}`}
                      </TableCell>
                      <TableCell>
                        {MESES_LABEL[kit.mesReferencia]} / {kit.anoReferencia}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>
                        {kit.itens?.length ?? 0} {kit.itens?.length === 1 ? 'item' : 'itens'}
                      </TableCell>
                      <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AutoAwesome />}
                          disabled={isSubmitting}
                          onClick={() => {
                            void handleGerarCiclos(kit.id);
                          }}
                        >
                          Gerar ciclos
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ p: 0 }}>
                      <EmptyState message="Nenhum kit encontrado para os filtros informados." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <AppTablePagination
          count={totalKits}
          page={Math.max(0, (paginacaoKits.pagina ?? 1) - 1)}
          rowsPerPage={paginacaoKits.tamanhoPagina ?? 10}
          onPageChange={(_event, newPage) => {
            void fetchKits({ pagina: newPage + 1 });
          }}
          onRowsPerPageChange={(event) => {
            void fetchKits({ pagina: 1, tamanhoPagina: Number(event.target.value) });
          }}
        />
      </Paper>

      <NewKitDialog open={newDialogOpen} onClose={() => setNewDialogOpen(false)} />
      <EditKitDialog
        open={editingKitId !== null}
        kitId={editingKitId}
        onClose={() => setEditingKitId(null)}
        onUpdated={handleUpdated}
      />
    </Stack>
  );
}
