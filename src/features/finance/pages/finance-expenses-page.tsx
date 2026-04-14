import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AddCircleOutline,
  Close,
  MoreVert,
  Search,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { NewExpenseDialog } from '@/features/finance';
import { useFinanceStore } from '@/features/finance/store/use-finance-store';
import {
  convertDateToApiDateFormat,
  formatApiDateToDisplay,
} from '@/features/finance/types/finance-form';
import {
  DateRangePickerField,
  formatCurrency,
  useFeedbackStore,
  type Despesa,
} from '@/shared';

function getPaymentMethodLabel(meioPagamento: string): string {
  switch (meioPagamento) {
    case 'DIN':
      return 'Dinheiro';
    case 'DEB':
      return 'Cartão débito';
    case 'CRE':
      return 'Cartão crédito';

    case 'PIX':
      return 'Pix';
    default:
      return 'Cartão débito';
  }
}

function getCurrentDateInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function FinanceExpensesPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    categoriasDespesa,
    despesas,
    excluirDespesa,
    fetchCategoriasDespesa,
    fetchDespesas,
    fetchFeiras,
    fetchErrorMessage,
    feiras,
    isFetching,
    isSubmitting,
    paginacao,
    totalItens,
  } = useFinanceStore();
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDespesa, setEditingDespesa] = useState<Despesa | null>(null);
  const [selectedDespesa, setSelectedDespesa] = useState<Despesa | null>(null);
  const [despesaToDelete, setDespesaToDelete] = useState<Despesa | null>(null);
  const [isDeletingDespesa, setIsDeletingDespesa] = useState(false);
  const [actionsAnchorEl, setActionsAnchorEl] = useState<HTMLElement | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [dataInicio, setDataInicio] = useState(getCurrentDateInput());
  const [dataFim, setDataFim] = useState(getCurrentDateInput());
  const [idFeira, setIdFeira] = useState<number | ''>('');
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<
    typeof categoriasDespesa
  >([]);

  const handleSearch = () => {
    void fetchDespesas({
      pagina: 1,
      termo: searchInput.trim(),
      dataInicio: convertDateToApiDateFormat(dataInicio) ?? '',
      dataFim: convertDateToApiDateFormat(dataFim) ?? '',
      idsCategorias: categoriasSelecionadas.map((categoria) => categoria.id),
      idFeira: idFeira === '' ? undefined : idFeira,
    });
  };

  const isDeleteBusy = isSubmitting || isDeletingDespesa;

  const handleOpenActions = (event: React.MouseEvent<HTMLButtonElement>, despesa: Despesa) => {
    event.stopPropagation();
    setSelectedDespesa(despesa);
    setActionsAnchorEl(event.currentTarget);
  };

  const handleCloseActions = () => {
    setActionsAnchorEl(null);
    setSelectedDespesa(null);
  };

  const handleStartEdit = () => {
    if (!selectedDespesa) return;
    setEditingDespesa(selectedDespesa);
    handleCloseActions();
  };

  const handleAskDelete = () => {
    if (!selectedDespesa) return;
    setDespesaToDelete(selectedDespesa);
    handleCloseActions();
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleteBusy) return;
    setDespesaToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!despesaToDelete) return;

    setIsDeletingDespesa(true);
    try {
      const result = await excluirDespesa(despesaToDelete.id);
      if (!result.success) return;

      await fetchDespesas();
      showSuccess('Despesa excluída com sucesso.');
      setDespesaToDelete(null);
    } finally {
      setIsDeletingDespesa(false);
    }
  };

  useEffect(() => {
    void fetchCategoriasDespesa();
    void fetchFeiras();
  }, [fetchCategoriasDespesa, fetchFeiras]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchDespesas({
        pagina: 1,
        termo: searchInput.trim(),
        dataInicio: convertDateToApiDateFormat(dataInicio) ?? '',
        dataFim: convertDateToApiDateFormat(dataFim) ?? '',
        idsCategorias: categoriasSelecionadas.map((categoria) => categoria.id),
        idFeira: idFeira === '' ? undefined : idFeira,
      });
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [categoriasSelecionadas, dataFim, dataInicio, fetchDespesas, idFeira, searchInput]);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Despesas
          </Typography>
          <Typography color="text.secondary">
            Registre saídas com categoria, pagamento e carteira para acompanhar
            os custos do negócio.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={() => setDialogOpen(true)}
        >
          Nova despesa
        </Button>
      </Stack>

      <Grid container spacing={2} columns={{ xs: 12, md: 12, lg: 20 }}>
        <Grid size={{ xs: 12, md: 6, lg: 5 }}>
          <DateRangePickerField
            label="Período"
            startValue={dataInicio}
            endValue={dataFim}
            onValueChange={({ startValue, endValue }) => {
              setDataInicio(startValue);
              setDataFim(endValue);
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 5 }}>
          <Autocomplete
            multiple
            options={categoriasDespesa}
            value={categoriasSelecionadas}
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

        <Grid size={{ xs: 12, md: 6, lg: 3 }}>
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
            helperText="Opcional"
          >
            <MenuItem value="">Todas</MenuItem>
            {feiras.map((feira) => (
              <MenuItem key={feira.id} value={feira.id}>
                {feira.nome}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <TextField
            fullWidth
            label="Pesquisar despesa"
            placeholder="Descrição, categoria, observação, carteira ou feira"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </Grid>

        <Grid
          size={{ xs: 12, md: 6, lg: 3 }}
          sx={{ display: 'flex', alignItems: 'flex-start' }}
        >
          <Button
            fullWidth
            variant="outlined"
            startIcon={<Search />}
            onClick={handleSearch}
            sx={{ height: 56 }}
          >
            Pesquisar
          </Button>
        </Grid>
      </Grid>

      {fetchErrorMessage ? (
        <Alert severity="error">{fetchErrorMessage}</Alert>
      ) : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de despesas">
            {isFetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : despesas.length > 0 ? (
              despesas.map((despesa) => (
                <Box key={despesa.id} sx={{ px: 2, py: 2 }}>
                  <Stack spacing={1.25}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatApiDateToDisplay(despesa.dataLancamento)}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {despesa.descricao}
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography
                          variant="subtitle1"
                          fontWeight={700}
                          color="error.main"
                        >
                          {formatCurrency(despesa.valor)}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(event) => handleOpenActions(event, despesa)}
                          aria-label="Ações da despesa"
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Typography variant="body2" color="text.secondary">
                      Categoria: {despesa.categoria?.nome ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pagamento: {getPaymentMethodLabel(despesa.meioPagamento)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Carteira: {despesa.carteira?.nome ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Feira: {despesa.feira?.nome ?? '-'}
                    </Typography>
                  </Stack>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhuma despesa encontrada para os filtros informados.
              </Box>
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de despesas">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Data</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Descrição</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Categoria</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Pagamento</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Carteira</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Feira</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong>Valor</strong>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : despesas.length > 0 ? (
                  despesas.map((despesa) => (
                    <TableRow key={despesa.id}>
                      <TableCell>
                        {formatApiDateToDisplay(despesa.dataLancamento)}
                      </TableCell>
                      <TableCell>{despesa.descricao}</TableCell>
                      <TableCell>
                        {despesa.categoria?.nome ?? '-'}
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodLabel(despesa.meioPagamento)}
                      </TableCell>
                      <TableCell>{despesa.carteira?.nome ?? '-'}</TableCell>
                      <TableCell>{despesa.feira?.nome ?? '-'}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: 'error.main', fontWeight: 700 }}
                      >
                        {formatCurrency(despesa.valor)}
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={(event) => handleOpenActions(event, despesa)}
                          aria-label="Ações da despesa"
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      Nenhuma despesa encontrada para os filtros informados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={totalItens}
          page={Math.max(0, paginacao.pagina - 1)}
          onPageChange={(_event, newPage) => {
            void fetchDespesas({ pagina: newPage + 1 });
          }}
          rowsPerPage={paginacao.tamanhoPagina}
          onRowsPerPageChange={(event) => {
            void fetchDespesas({
              pagina: 1,
              tamanhoPagina: Number(event.target.value),
            });
          }}
          rowsPerPageOptions={[10, 25, 50]}
          labelRowsPerPage="Itens por página"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
          sx={{
            '.MuiTablePagination-toolbar': {
              flexWrap: 'wrap',
              justifyContent: { xs: 'center', sm: 'flex-end' },
              gap: 1,
              px: { xs: 1, sm: 2 },
            },
          }}
        />
      </Paper>

      <Menu
        anchorEl={actionsAnchorEl}
        open={Boolean(actionsAnchorEl)}
        onClose={handleCloseActions}
      >
        <MenuItem onClick={handleStartEdit} disabled={isDeleteBusy}>
          Alterar
        </MenuItem>
        <MenuItem onClick={handleAskDelete} disabled={isDeleteBusy}>
          Excluir
        </MenuItem>
      </Menu>

      <Dialog open={Boolean(despesaToDelete)} onClose={handleCloseDeleteDialog}>
        <DialogTitle sx={{ px: 3, py: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h5" fontWeight={700}>
                Excluir despesa
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Confirme a remoção da despesa selecionada.
              </Typography>
            </Box>
            <IconButton
              onClick={handleCloseDeleteDialog}
              aria-label="Fechar modal de exclusão de despesa"
              disabled={isDeleteBusy}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            Tem certeza que deseja excluir a despesa &quot;{despesaToDelete?.descricao}&quot;? Essa ação
            não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleteBusy}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => { void handleConfirmDelete(); }}
            disabled={isDeleteBusy}
          >
            {isDeleteBusy ? 'Excluindo...' : 'Confirmar exclusão'}
          </Button>
        </DialogActions>
      </Dialog>

      <NewExpenseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />

      <NewExpenseDialog
        open={Boolean(editingDespesa)}
        onClose={() => setEditingDespesa(null)}
        despesa={editingDespesa}
      />
    </Stack>
  );
}
