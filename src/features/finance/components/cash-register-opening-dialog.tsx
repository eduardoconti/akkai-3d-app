import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close, LockOpen, PointOfSale, Save } from '@mui/icons-material';
import {
  getCashRegisterById,
  listWallets,
  openCashRegister,
  updateCashRegister,
} from '@/features/finance/api/finance-api';
import { listFairs } from '@/features/sales/api/sales-api';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import {
  CurrencyField,
  FormFeedbackAlert,
  LoadingState,
  useFeedbackStore,
  type Caixa,
  type Carteira,
  type Feira,
} from '@/shared';

interface CashRegisterOpeningDialogProps {
  open: boolean;
  caixaId?: number | null;
  onClose: () => void;
  onSaved?: (caixa: Caixa) => void;
}

function criarCarteiraFallback(idCarteira: number): Carteira {
  return {
    id: idCarteira,
    nome: `Carteira ${idCarteira}`,
    ativa: false,
    saldoAtual: 0,
    meiosPagamento: [],
  };
}

export default function CashRegisterOpeningDialog({
  open,
  caixaId = null,
  onClose,
  onSaved,
}: CashRegisterOpeningDialogProps) {
  const editando = caixaId !== null;
  const [feiras, setFeiras] = useState<Feira[]>([]);
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [idFeira, setIdFeira] = useState<number | ''>('');
  const [valores, setValores] = useState<Record<number, number>>({});
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const showSuccess = useFeedbackStore((state) => state.showSuccess);

  useEffect(() => {
    if (!open) return;

    let ativo = true;
    setCarregando(true);
    setErro(null);
    setConfirmacaoAberta(false);

    void Promise.all([
      listFairs(),
      listWallets(),
      caixaId === null ? Promise.resolve(null) : getCashRegisterById(caixaId),
    ])
      .then(([listaFeiras, listaCarteiras, caixa]) => {
        if (!ativo) return;

        const feirasDisponiveis = listaFeiras.filter(
          (item) => item.ativa || item.id === caixa?.idFeira,
        );
        setFeiras(feirasDisponiveis);

        if (caixa) {
          const carteirasPorId = new Map(
            listaCarteiras.map((carteira) => [carteira.id, carteira]),
          );
          const carteirasDoCaixa = caixa.conferencias.map(
            (item) =>
              item.carteira ??
              carteirasPorId.get(item.idCarteira) ??
              criarCarteiraFallback(item.idCarteira),
          );
          setCarteiras(carteirasDoCaixa);
          setIdFeira(caixa.idFeira);
          setValores(
            Object.fromEntries(
              caixa.conferencias.map((item) => [
                item.idCarteira,
                item.valorAbertura / 100,
              ]),
            ),
          );
          setObservacao(caixa.observacao ?? '');
          return;
        }

        const carteirasAtivas = listaCarteiras.filter((item) => item.ativa);
        setCarteiras(carteirasAtivas);
        setIdFeira(
          feirasDisponiveis.length === 1 ? feirasDisponiveis[0]!.id : '',
        );
        setValores(
          Object.fromEntries(
            carteirasAtivas.map((carteira) => [carteira.id, 0]),
          ),
        );
        setObservacao('');
      })
      .catch((error) => {
        if (ativo) setErro(getProblemDetailsFromError(error).detail);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [caixaId, open]);

  const limparFormulario = () => {
    setIdFeira('');
    setValores({});
    setObservacao('');
    setErro(null);
    setConfirmacaoAberta(false);
  };

  const handleClose = () => {
    if (salvando) return;
    limparFormulario();
    onClose();
  };

  const handleSolicitarConfirmacao = () => {
    if (idFeira === '') {
      setErro('Selecione a feira do caixa.');
      return;
    }

    setErro(null);
    setConfirmacaoAberta(true);
  };

  const handleSubmit = async () => {
    if (idFeira === '') return;

    setSalvando(true);
    setErro(null);
    const input = {
      idFeira,
      carteiras: carteiras.map((carteira) => ({
        idCarteira: carteira.id,
        valorAbertura: Math.round((valores[carteira.id] ?? 0) * 100),
      })),
      observacao: observacao.trim() || undefined,
    };

    try {
      const caixa =
        caixaId === null
          ? await openCashRegister(input)
          : await updateCashRegister(caixaId, input);
      window.dispatchEvent(new Event('caixas:atualizados'));
      showSuccess(
        editando ? 'Caixa alterado com sucesso.' : 'Caixa aberto com sucesso.',
      );
      onSaved?.({ ...caixa, feira: feiraSelecionada });
      limparFormulario();
      onClose();
    } catch (error) {
      setConfirmacaoAberta(false);
      setErro(getProblemDetailsFromError(error).detail);
    } finally {
      setSalvando(false);
    }
  };

  const feiraSelecionada = feiras.find((feira) => feira.id === idFeira);
  const titulo = editando ? 'Editar caixa' : 'Abertura de caixa';
  const textoAcao = editando ? 'Salvar alterações' : 'Abrir caixa';

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ px: 3, py: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <PointOfSale color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  {titulo}
                </Typography>
              </Stack>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {editando
                  ? 'Corrija a feira, os valores de abertura ou a observação.'
                  : 'Informe os valores disponíveis no início da feira. Em dinheiro, registre somente o troco levado.'}
              </Typography>
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
          <Stack spacing={2.5}>
            <FormFeedbackAlert message={erro} />
            {carregando ? (
              <LoadingState />
            ) : (
              <>
                <TextField
                  select
                  fullWidth
                  required
                  label="Feira"
                  value={idFeira}
                  onChange={(event) => setIdFeira(Number(event.target.value))}
                  disabled={salvando}
                >
                  {feiras.map((feira) => (
                    <MenuItem key={feira.id} value={feira.id}>
                      {feira.nome}
                    </MenuItem>
                  ))}
                </TextField>

                <Grid container spacing={2}>
                  {carteiras.map((carteira) => (
                    <Grid key={carteira.id} size={{ xs: 12, md: 6 }}>
                      <CurrencyField
                        fullWidth
                        label={carteira.nome}
                        helperText="Valor levado ou disponível na abertura"
                        value={valores[carteira.id] ?? 0}
                        onValueChange={(valor) =>
                          setValores((atual) => ({
                            ...atual,
                            [carteira.id]: valor,
                          }))
                        }
                        disabled={salvando}
                      />
                    </Grid>
                  ))}
                </Grid>

                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Observação"
                  value={observacao}
                  onChange={(event) => setObservacao(event.target.value)}
                  inputProps={{ maxLength: 500 }}
                  disabled={salvando}
                />
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button color="inherit" onClick={handleClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={editando ? <Save /> : <LockOpen />}
            onClick={handleSolicitarConfirmacao}
            disabled={carregando || salvando || carteiras.length === 0}
          >
            {textoAcao}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmacaoAberta}
        onClose={() => {
          if (!salvando) setConfirmacaoAberta(false);
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ px: 3, py: 2.5 }}>
          <Typography variant="h6" fontWeight={700}>
            {editando ? 'Confirmar edição do caixa' : 'Confirmar abertura'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Revise a feira antes de confirmar esta operação.
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2">
              Feira: <strong>{feiraSelecionada?.nome}</strong>
            </Typography>
            <Typography variant="body2">
              Carteiras conferidas: <strong>{carteiras.length}</strong>
            </Typography>
            {editando ? (
              <Typography variant="body2" color="warning.dark">
                Os novos valores substituirão os dados atuais da abertura.
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            color="inherit"
            onClick={() => setConfirmacaoAberta(false)}
            disabled={salvando}
          >
            Voltar
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={salvando}
          >
            {salvando
              ? editando
                ? 'Salvando...'
                : 'Abrindo...'
              : editando
                ? 'Confirmar edição'
                : 'Confirmar abertura'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
