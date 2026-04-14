import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import FairDialog from '../components/fair-dialog';
import { saleStoreSelectors, useSaleStore } from '../store/use-sale-store';
import { useShallow } from 'zustand/react/shallow';

export default function FairsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    feirasPaginadas,
    fetchErrorMessage,
    fetchFeirasPaginadas,
    isFetching,
    paginacaoFeiras,
    totalFeiras,
  } = useSaleStore(
    useShallow((state) => ({
      feirasPaginadas: saleStoreSelectors.feirasPaginadas(state),
      fetchErrorMessage: saleStoreSelectors.fetchErrorMessage(state),
      fetchFeirasPaginadas: saleStoreSelectors.fetchFeirasPaginadas(state),
      isFetching: saleStoreSelectors.isFetching(state),
      paginacaoFeiras: saleStoreSelectors.paginacaoFeiras(state),
      totalFeiras: saleStoreSelectors.totalFeiras(state),
    })),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFairId, setEditingFairId] = useState<number | null>(null);

  useEffect(() => {
    void fetchFeirasPaginadas();
  }, [fetchFeirasPaginadas]);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Feiras
          </Typography>
          <Typography color="text.secondary">
            Gerencie as feiras disponíveis para vendas presenciais e relatórios.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={() => setDialogOpen(true)}
        >
          Nova feira
        </Button>
      </Stack>

      {fetchErrorMessage ? <Alert severity="error">{fetchErrorMessage}</Alert> : null}

      <Paper sx={{ overflow: 'hidden' }}>
        {isMobile ? (
          <Stack divider={<Divider flexItem />} aria-label="lista de feiras">
            {isFetching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : feirasPaginadas.length > 0 ? (
              feirasPaginadas.map((feira) => (
                <Box
                  key={feira.id}
                  sx={{ px: 2, py: 2, cursor: 'pointer' }}
                  onClick={() => setEditingFairId(feira.id)}
                >
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {feira.nome}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Local: {feira.local ?? '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {feira.descricao?.trim() ? feira.descricao : 'Sem descrição'}
                    </Typography>
                    <Box>
                      <Chip
                        size="small"
                        color={feira.ativa ? 'success' : 'default'}
                        variant="outlined"
                        label={feira.ativa ? 'Ativa' : 'Inativa'}
                      />
                    </Box>
                  </Stack>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
                Nenhuma feira cadastrada até o momento.
              </Box>
            )}
          </Stack>
        ) : (
          <TableContainer>
            <Table aria-label="tabela de feiras">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <strong>Nome</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Local</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Descrição</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isFetching ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : feirasPaginadas.length > 0 ? (
                  feirasPaginadas.map((feira) => (
                    <TableRow
                      key={feira.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setEditingFairId(feira.id)}
                    >
                      <TableCell>{feira.nome}</TableCell>
                      <TableCell>{feira.local ?? '-'}</TableCell>
                      <TableCell>{feira.descricao ?? '-'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={feira.ativa ? 'success' : 'default'}
                          variant="outlined"
                          label={feira.ativa ? 'Ativa' : 'Inativa'}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                      Nenhuma feira cadastrada até o momento.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <TablePagination
          component="div"
          count={totalFeiras}
          page={Math.max(0, paginacaoFeiras.pagina - 1)}
          onPageChange={(_event, newPage) => {
            void fetchFeirasPaginadas({ pagina: newPage + 1 });
          }}
          rowsPerPage={paginacaoFeiras.tamanhoPagina}
          onRowsPerPageChange={(event) => {
            void fetchFeirasPaginadas({
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

      <FairDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      <FairDialog
        open={editingFairId !== null}
        fairId={editingFairId}
        onClose={() => setEditingFairId(null)}
      />
    </Stack>
  );
}
