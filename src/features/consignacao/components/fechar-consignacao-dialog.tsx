import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { Close, Lock } from '@mui/icons-material';
import { listWallets } from '@/features/finance/api/finance-api';
import {
  consignacaoStoreSelectors,
  useConsignacaoStore,
} from '@/features/consignacao/store/use-consignacao-store';
import { getPaymentMethodLabel } from '@/features/sales/utils/format-sale-labels';
import {
  CurrencyValue,
  FormFeedbackAlert,
  useFeedbackStore,
  type Carteira,
  type Consignacao,
  type MeioPagamento,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface FecharConsignacaoDialogProps {
  open: boolean;
  consignacao: Consignacao | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

interface QuantidadeVendida {
  idItem: number;
  quantidade: string;
}

const meiosPagamento: MeioPagamento[] = ['DIN', 'DEB', 'CRE', 'PIX'];

export default function FecharConsignacaoDialog({
  open,
  consignacao,
  onClose,
  onSaved,
}: FecharConsignacaoDialogProps) {
  const {
    clearSubmitError,
    fecharConsignacao,
    isSubmitting,
    submitErrorMessage,
  } = useConsignacaoStore(
    useShallow((state) => ({
      clearSubmitError: consignacaoStoreSelectors.clearSubmitError(state),
      fecharConsignacao: consignacaoStoreSelectors.fecharConsignacao(state),
      isSubmitting: consignacaoStoreSelectors.isSubmitting(state),
      submitErrorMessage: consignacaoStoreSelectors.submitErrorMessage(state),
    })),
  );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [quantidades, setQuantidades] = useState<QuantidadeVendida[]>([]);
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [idCarteira, setIdCarteira] = useState<number | ''>('');
  const [meioPagamento, setMeioPagamento] = useState<MeioPagamento | ''>('');
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const itensComSaldo = useMemo(
    () =>
      (consignacao?.itens ?? []).filter(
        (item) => item.quantidadeDisponivel > 0,
      ),
    [consignacao],
  );

  useEffect(() => {
    if (!open || !consignacao) {
      return;
    }

    clearSubmitError();
    setErroLocal(null);
    setConfirmando(false);
    setQuantidades(
      (consignacao.itens ?? [])
        .filter((item) => item.quantidadeDisponivel > 0)
        .map((item) => ({
          idItem: item.id,
          quantidade: String(item.quantidadeDisponivel),
        })),
    );
    setIdCarteira('');
    setMeioPagamento('');
    setIsLoading(true);
    void listWallets()
      .then((resposta) => {
        const ativas = resposta.filter((carteira) => carteira.ativa);
        setCarteiras(ativas);
        if (ativas.length === 1) {
          setIdCarteira(ativas[0]?.id ?? '');
          setMeioPagamento(ativas[0]?.meiosPagamento[0] ?? '');
        }
      })
      .finally(() => setIsLoading(false));
  }, [clearSubmitError, consignacao, open]);

  const carteiraSelecionada = useMemo(
    () => carteiras.find((carteira) => carteira.id === idCarteira) ?? null,
    [carteiras, idCarteira],
  );
  const meiosDisponiveis =
    carteiraSelecionada?.meiosPagamento.length
      ? carteiraSelecionada.meiosPagamento
      : meiosPagamento;
  const resumo = useMemo(
    () =>
      itensComSaldo.reduce(
        (total, item) => {
          const quantidade = quantidades.find(
            (atual) => atual.idItem === item.id,
          );
          const vendida = Number(quantidade?.quantidade ?? 0);
          const vendidaValida = Number.isFinite(vendida) ? vendida : 0;
          return {
            vendida: total.vendida + vendidaValida,
            devolvida:
              total.devolvida + item.quantidadeDisponivel - vendidaValida,
            valor:
              total.valor +
              vendidaValida *
                Math.max(
                  0,
                  Math.round(
                    item.valorUnitario *
                      (1 - (consignacao?.percentualDesconto ?? 0) / 100),
                  ),
                ),
          };
        },
        { vendida: 0, devolvida: 0, valor: 0 },
      ),
    [consignacao?.percentualDesconto, itensComSaldo, quantidades],
  );

  const atualizarQuantidade = (idItem: number, quantidade: string) => {
    setConfirmando(false);
    setQuantidades((atuais) =>
      atuais.map((item) =>
        item.idItem === idItem ? { ...item, quantidade } : item,
      ),
    );
  };

  const validar = (): string | null => {
    for (const item of itensComSaldo) {
      const quantidade = Number(
        quantidades.find((atual) => atual.idItem === item.id)?.quantidade,
      );
      if (
        !Number.isInteger(quantidade) ||
        quantidade < 0 ||
        quantidade > item.quantidadeDisponivel
      ) {
        return `A quantidade vendida de ${item.nomeProduto} deve estar entre 0 e ${item.quantidadeDisponivel}.`;
      }
    }

    if (resumo.vendida > 0 && (idCarteira === '' || meioPagamento === '')) {
      return 'Selecione a carteira e o meio de pagamento.';
    }

    return null;
  };

  const handleSubmit = async () => {
    const erro = validar();
    if (erro) {
      setErroLocal(erro);
      setConfirmando(false);
      return;
    }
    if (!confirmando) {
      setErroLocal(null);
      setConfirmando(true);
      return;
    }
    if (!consignacao) {
      return;
    }

    const result = await fecharConsignacao(consignacao.id, {
      itens: quantidades.map((item) => ({
        idItem: item.idItem,
        quantidadeVendida: Number(item.quantidade),
      })),
      ...(resumo.vendida > 0 && idCarteira !== '' && meioPagamento !== ''
        ? { idCarteira, meioPagamento }
        : {}),
    });
    if (!result.success) {
      setConfirmando(false);
      return;
    }

    await onSaved?.();
    showSuccess('Consignação fechada com sucesso.');
    onClose();
  };

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Lock color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={800}>
              Fechar consignação #{consignacao?.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              O saldo começa integralmente vendido; reduza para devolver peças.
            </Typography>
          </Box>
          <IconButton onClick={onClose} disabled={isSubmitting} aria-label="Fechar">
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <FormFeedbackAlert message={erroLocal ?? submitErrorMessage} />

          {itensComSaldo.map((item) => {
            const quantidade =
              quantidades.find((atual) => atual.idItem === item.id)
                ?.quantidade ?? '';
            const vendida = Number(quantidade);
            const devolvida =
              item.quantidadeDisponivel -
              (Number.isFinite(vendida) ? vendida : 0);
            return (
              <Stack
                key={item.id}
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                spacing={2}
                sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography fontWeight={700}>
                    {item.nomeProduto} ({item.codigoProduto})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Saldo {item.quantidadeDisponivel} · Unitário{' '}
                    <CurrencyValue value={item.valorUnitario} />
                  </Typography>
                </Box>
                <TextField
                  type="number"
                  label="Vendido"
                  value={quantidade}
                  onChange={(event) =>
                    atualizarQuantidade(item.id, event.target.value)
                  }
                  slotProps={{
                    htmlInput: {
                      min: 0,
                      max: item.quantidadeDisponivel,
                      step: 1,
                    },
                  }}
                  sx={{ width: { sm: 130 } }}
                />
                <Typography sx={{ minWidth: 105 }}>
                  Devolvido: <strong>{Math.max(0, devolvida)}</strong>
                </Typography>
              </Stack>
            );
          })}

          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Typography>Vendido: <strong>{resumo.vendida}</strong></Typography>
            <Typography>Devolvido: <strong>{resumo.devolvida}</strong></Typography>
            <Typography>
              Total da venda: <strong><CurrencyValue value={resumo.valor} /></strong>
            </Typography>
          </Stack>

          {resumo.vendida > 0 ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                fullWidth
                label="Carteira"
                value={idCarteira}
                onChange={(event) => {
                  const proximoId = Number(event.target.value);
                  const carteira = carteiras.find(
                    (atual) => atual.id === proximoId,
                  );
                  setIdCarteira(proximoId);
                  setMeioPagamento(carteira?.meiosPagamento[0] ?? '');
                  setConfirmando(false);
                }}
                disabled={isLoading}
              >
                {carteiras.map((carteira) => (
                  <MenuItem key={carteira.id} value={carteira.id}>
                    {carteira.nome}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                fullWidth
                label="Meio de pagamento"
                value={meioPagamento}
                onChange={(event) => {
                  setMeioPagamento(event.target.value as MeioPagamento);
                  setConfirmando(false);
                }}
                disabled={idCarteira === ''}
              >
                {meiosDisponiveis.map((meio) => (
                  <MenuItem key={meio} value={meio}>
                    {getPaymentMethodLabel(meio)}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          ) : null}

          {confirmando ? (
            <Alert severity="warning">
              Confirme o fechamento definitivo. A consignação não aceitará novos
              movimentos depois desta operação.
            </Alert>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
        <Button
          variant="contained"
          color={confirmando ? 'warning' : 'primary'}
          onClick={() => void handleSubmit()}
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting
            ? 'Fechando...'
            : confirmando
              ? 'Confirmar fechamento'
              : 'Revisar fechamento'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
