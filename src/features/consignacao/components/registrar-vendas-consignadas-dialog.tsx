import { useEffect, useMemo, useState } from 'react';
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
import { Close, PointOfSale, Save } from '@mui/icons-material';
import { listWallets } from '@/features/finance/api/finance-api';
import { getPaymentMethodLabel } from '@/features/sales/utils/format-sale-labels';
import {
  consignacaoStoreSelectors,
  useConsignacaoStore,
} from '@/features/consignacao/store/use-consignacao-store';
import type {
  Carteira,
  Consignacao,
  ItemConsignacao,
  MeioPagamento,
} from '@/shared';
import { FormFeedbackAlert, formatCurrency, useFeedbackStore } from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface RegistrarVendasConsignadasDialogProps {
  open: boolean;
  consignacao: Consignacao | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

function obterNomeProduto(item: ItemConsignacao): string {
  return `${item.nomeProduto} (${item.codigoProduto})`;
}

const todosMeiosPagamento: MeioPagamento[] = ['DIN', 'DEB', 'CRE', 'PIX'];

export default function RegistrarVendasConsignadasDialog({
  open,
  consignacao,
  onClose,
  onSaved,
}: RegistrarVendasConsignadasDialogProps) {
  const { isSubmitting, registrarVendas, submitErrorMessage } =
    useConsignacaoStore(
      useShallow((state) => ({
        isSubmitting: consignacaoStoreSelectors.isSubmitting(state),
        registrarVendas: consignacaoStoreSelectors.registrarVendas(state),
        submitErrorMessage: consignacaoStoreSelectors.submitErrorMessage(state),
      })),
    );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [quantidades, setQuantidades] = useState<Record<number, string>>({});
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [idCarteira, setIdCarteira] = useState<number | ''>('');
  const [meioPagamento, setMeioPagamento] = useState<MeioPagamento | ''>('');
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCarteiras, setIsLoadingCarteiras] = useState(false);

  const itensDisponiveis = useMemo(
    () =>
      (consignacao?.itens ?? []).filter(
        (item) => item.quantidadeDisponivel > 0,
      ),
    [consignacao?.itens],
  );

  const carteiraSelecionada = useMemo(
    () => carteiras.find((carteira) => carteira.id === idCarteira) ?? null,
    [carteiras, idCarteira],
  );
  const meiosPagamentoDisponiveis = useMemo(() => {
    if (
      !carteiraSelecionada ||
      carteiraSelecionada.meiosPagamento.length === 0
    ) {
      return todosMeiosPagamento;
    }

    return carteiraSelecionada.meiosPagamento;
  }, [carteiraSelecionada]);
  const isBusy = isSubmitting || isSaving;

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setIsLoadingCarteiras(true);

    listWallets()
      .then((response) => {
        if (active) {
          setCarteiras(response.filter((carteira) => carteira.ativa));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingCarteiras(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open]);

  const handleClose = () => {
    if (isBusy) {
      return;
    }

    setQuantidades({});
    setIdCarteira('');
    setMeioPagamento('');
    setErroLocal(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!consignacao) {
      return;
    }

    if (idCarteira === '') {
      setErroLocal('Selecione a carteira que receberá o pagamento.');
      return;
    }

    if (meioPagamento === '') {
      setErroLocal('Selecione o meio de pagamento.');
      return;
    }

    const itens = itensDisponiveis
      .map((item) => ({
        idProduto: item.idProduto,
        quantidade: Number(quantidades[item.id] ?? 0),
        disponivel: item.quantidadeDisponivel,
      }))
      .filter((item) => item.quantidade > 0);

    if (itens.length === 0) {
      setErroLocal('Informe pelo menos um item vendido.');
      return;
    }

    const itemInvalido = itens.find(
      (item) =>
        !Number.isInteger(item.quantidade) || item.quantidade > item.disponivel,
    );

    if (itemInvalido) {
      setErroLocal(
        'As quantidades devem ser inteiras e não podem exceder o disponível.',
      );
      return;
    }

    setErroLocal(null);
    setIsSaving(true);

    try {
      const result = await registrarVendas(consignacao.id, {
        idCarteira,
        meioPagamento,
        itens: itens.map(({ idProduto, quantidade }) => ({
          idProduto,
          quantidade,
        })),
      });

      if (!result.success) {
        return;
      }

      await onSaved?.();
      showSuccess('Vendas consignadas registradas com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const totalVendido = itensDisponiveis.reduce((total, item) => {
    const quantidade = Number(quantidades[item.id] ?? 0);
    return (
      total +
      (Number.isFinite(quantidade) ? quantidade * item.valorUnitario : 0)
    );
  }, 0);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
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
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}
            >
              <PointOfSale color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Registrar vendas
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Lance a lista semanal de peças vendidas pelo revendedor.
            </Typography>
          </Box>

          <IconButton
            onClick={handleClose}
            aria-label="Fechar modal de vendas consignadas"
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={erroLocal ?? submitErrorMessage} />

        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                label="Carteira"
                value={idCarteira}
                onChange={(event) => {
                  setIdCarteira(Number(event.target.value));
                  setMeioPagamento('');
                }}
                disabled={isBusy || isLoadingCarteiras}
              >
                {carteiras.map((carteira) => (
                  <MenuItem key={carteira.id} value={carteira.id}>
                    {carteira.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                select
                fullWidth
                label="Meio de pagamento"
                value={meioPagamento}
                onChange={(event) =>
                  setMeioPagamento(event.target.value as MeioPagamento)
                }
                disabled={isBusy || idCarteira === ''}
              >
                {meiosPagamentoDisponiveis.map((meio) => (
                  <MenuItem key={meio} value={meio}>
                    {getPaymentMethodLabel(meio)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {itensDisponiveis.map((item) => (
            <Grid container spacing={1.5} key={item.id} alignItems="center">
              <Grid size={{ xs: 12, md: 5 }}>
                <Typography fontWeight={700}>
                  {obterNomeProduto(item)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Disponível: {item.quantidadeDisponivel} · Enviado:{' '}
                  {item.quantidadeEnviada} · Vendido: {item.quantidadeVendida} ·
                  Unitário: {formatCurrency(item.valorUnitario)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Quantidade vendida"
                  type="number"
                  value={quantidades[item.id] ?? ''}
                  onChange={(event) =>
                    setQuantidades((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  disabled={isBusy}
                  inputProps={{
                    min: 0,
                    max: item.quantidadeDisponivel,
                    step: 1,
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <Typography color="text.secondary">
                  Subtotal:{' '}
                  <strong>
                    {formatCurrency(
                      Number(quantidades[item.id] ?? 0) * item.valorUnitario,
                    )}
                  </strong>
                </Typography>
              </Grid>
            </Grid>
          ))}

          {itensDisponiveis.length === 0 ? (
            <Typography color="text.secondary">
              Não há itens disponíveis para venda nesta consignação.
            </Typography>
          ) : null}

          <Typography variant="body2" color="text.secondary" textAlign="right">
            Total vendido: <strong>{formatCurrency(totalVendido)}</strong>
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isBusy}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSubmit}
          disabled={isBusy || itensDisponiveis.length === 0}
        >
          Registrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
