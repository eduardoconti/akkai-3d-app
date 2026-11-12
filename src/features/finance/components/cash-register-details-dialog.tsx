import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close, Edit, PointOfSale, TaskAlt } from '@mui/icons-material';
import {
  closeCashRegister,
  getCashRegisterById,
} from '@/features/finance/api/finance-api';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  CurrencyField,
  FormFeedbackAlert,
  LoadingState,
  formatCurrency,
  useFeedbackStore,
  type Caixa,
  StatusChip,
} from '@/shared';
import CashRegisterOpeningDialog from './cash-register-opening-dialog';

interface CashRegisterDetailsDialogProps {
  caixaId: number | null;
  caixaResumo?: Caixa | null;
  open: boolean;
  onClose: () => void;
}

export default function CashRegisterDetailsDialog({
  caixaId,
  caixaResumo,
  open,
  onClose,
}: CashRegisterDetailsDialogProps) {
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [valores, setValores] = useState<Record<number, number>>({});
  const [carteirasInformadas, setCarteirasInformadas] = useState<Set<number>>(
    new Set(),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (!open || caixaId === null) return;
    setCaixa(caixaResumo ?? null);
    setCarregando(true);
    setErro(null);
    void getCashRegisterById(caixaId)
      .then((resultado) => {
        setCaixa({
          ...resultado,
          feira: resultado.feira ?? caixaResumo?.feira,
        });
        setValores(
          Object.fromEntries(
            resultado.conferencias.map((item) => [item.idCarteira, 0]),
          ),
        );
        setCarteirasInformadas(new Set());
      })
      .catch((error) => setErro(getProblemDetailsFromError(error).detail))
      .finally(() => setCarregando(false));
  }, [caixaId, caixaResumo, open]);

  const handleClose = () => {
    if (salvando) return;
    setEditando(false);
    setCaixa(null);
    setValores({});
    setCarteirasInformadas(new Set());
    setErro(null);
    onClose();
  };

  const handleFechar = async () => {
    if (!caixa) return;
    setSalvando(true);
    setErro(null);
    try {
      const resultado = await closeCashRegister(caixa.id, {
        carteiras: caixa.conferencias.map((item) => ({
          idCarteira: item.idCarteira,
          valorInformadoFechamento: Math.round(
            (valores[item.idCarteira] ?? 0) * 100,
          ),
        })),
      });
      setCaixa(resultado);
      window.dispatchEvent(new Event('caixas:atualizados'));
      showSuccess('Caixa fechado com sucesso.');
    } catch (error) {
      setErro(getProblemDetailsFromError(error).detail);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <Dialog
        open={open && !editando}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ px: 3, py: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <PointOfSale color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Detalhes do caixa
                </Typography>
              </Stack>
              {caixa ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {caixa.feira?.nome ?? `Feira ${caixa.idFeira}`}
                </Typography>
              ) : null}
            </Box>
            <IconButton
              onClick={handleClose}
              disabled={salvando}
              aria-label="Fechar"
            >
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <FormFeedbackAlert message={erro} />
            {carregando || !caixa ? (
              <LoadingState />
            ) : (
              <>
                <StatusChip
                  sx={{ alignSelf: 'flex-start' }}
                  tone={caixa.status === 'ABERTO' ? 'success' : 'default'}
                  label={caixa.status === 'ABERTO' ? 'Caixa aberto' : 'Fechado'}
                />
                <Grid container spacing={2}>
                  {caixa.conferencias.map((item) => {
                    const valorEsperado =
                      item.valorEsperadoFechamento ??
                      item.valorAbertura + (item.totalEntradas ?? 0);
                    const valorInformado = Math.round(
                      (valores[item.idCarteira] ?? 0) * 100,
                    );
                    const diferenca = valorInformado - valorEsperado;

                    return (
                      <Grid key={item.idCarteira} size={{ xs: 12, md: 6 }}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                          <Stack spacing={1.5}>
                            <Typography fontWeight={700}>
                              {item.carteira?.nome ??
                                `Carteira ${item.idCarteira}`}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Abertura: {formatCurrency(item.valorAbertura)}
                            </Typography>
                            <Divider />
                            {caixa.status === 'ABERTO' ? (
                              <Stack spacing={1.25}>
                                <Typography variant="body2">
                                  Entradas líquidas:{' '}
                                  {formatCurrency(item.totalEntradas ?? 0)}
                                </Typography>
                                <Typography fontWeight={700}>
                                  Esperado agora:{' '}
                                  {formatCurrency(valorEsperado)}
                                </Typography>
                                <CurrencyField
                                  fullWidth
                                  label="Valor contado"
                                  value={valores[item.idCarteira] ?? 0}
                                  onValueChange={(valor) => {
                                    setValores((atual) => ({
                                      ...atual,
                                      [item.idCarteira]: valor,
                                    }));
                                    setCarteirasInformadas((atuais) => {
                                      const atualizadas = new Set(atuais);
                                      atualizadas.add(item.idCarteira);
                                      return atualizadas;
                                    });
                                  }}
                                  disabled={salvando}
                                />
                                {carteirasInformadas.has(item.idCarteira) ? (
                                  <Typography
                                    fontWeight={700}
                                    color={
                                      diferenca === 0
                                        ? 'success.main'
                                        : diferenca < 0
                                          ? 'error.main'
                                          : 'warning.dark'
                                    }
                                  >
                                    Diferença: {formatCurrency(diferenca)}
                                  </Typography>
                                ) : null}
                              </Stack>
                            ) : (
                              <Stack spacing={0.5}>
                                <Typography variant="body2">
                                  Entradas:{' '}
                                  {formatCurrency(item.totalEntradas ?? 0)}
                                </Typography>
                                <Typography variant="body2">
                                  Esperado:{' '}
                                  {formatCurrency(
                                    item.valorEsperadoFechamento ?? 0,
                                  )}
                                </Typography>
                                <Typography variant="body2">
                                  Informado:{' '}
                                  {formatCurrency(
                                    item.valorInformadoFechamento ?? 0,
                                  )}
                                </Typography>
                                <Typography
                                  fontWeight={700}
                                  color={
                                    (item.diferenca ?? 0) === 0
                                      ? 'success.main'
                                      : 'warning.dark'
                                  }
                                >
                                  Diferença:{' '}
                                  {formatCurrency(item.diferenca ?? 0)}
                                </Typography>
                              </Stack>
                            )}
                          </Stack>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button color="inherit" onClick={handleClose} disabled={salvando}>
            Voltar
          </Button>
          {caixa?.status === 'ABERTO' ? (
            <>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => setEditando(true)}
                disabled={salvando}
              >
                Editar caixa
              </Button>
              <Button
                variant="contained"
                color="warning"
                startIcon={<TaskAlt />}
                onClick={() => void handleFechar()}
                disabled={salvando}
              >
                {salvando ? 'Fechando...' : 'Fechar caixa'}
              </Button>
            </>
          ) : null}
        </DialogActions>
      </Dialog>

      <CashRegisterOpeningDialog
        open={editando}
        caixaId={caixa?.id ?? null}
        onClose={() => setEditando(false)}
        onSaved={(caixaAtualizado) => setCaixa(caixaAtualizado)}
      />
    </>
  );
}
