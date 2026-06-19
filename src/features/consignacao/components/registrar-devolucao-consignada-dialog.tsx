import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { AssignmentReturn, Close, Save } from '@mui/icons-material';
import {
  consignacaoStoreSelectors,
  useConsignacaoStore,
} from '@/features/consignacao/store/use-consignacao-store';
import type { Consignacao, ItemConsignacao } from '@/shared';
import { FormFeedbackAlert, useFeedbackStore } from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface RegistrarDevolucaoConsignadaDialogProps {
  open: boolean;
  consignacao: Consignacao | null;
  item: ItemConsignacao | null;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

function obterNomeProduto(item: ItemConsignacao | null): string {
  if (!item) {
    return '';
  }

  return `${item.nomeProduto} (${item.codigoProduto})`;
}

export default function RegistrarDevolucaoConsignadaDialog({
  open,
  consignacao,
  item,
  onClose,
  onSaved,
}: RegistrarDevolucaoConsignadaDialogProps) {
  const { isSubmitting, registrarDevolucao, submitErrorMessage } =
    useConsignacaoStore(
      useShallow((state) => ({
        isSubmitting: consignacaoStoreSelectors.isSubmitting(state),
        registrarDevolucao: consignacaoStoreSelectors.registrarDevolucao(state),
        submitErrorMessage: consignacaoStoreSelectors.submitErrorMessage(state),
      })),
    );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [quantidade, setQuantidade] = useState('');
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isBusy = isSubmitting || isSaving;

  const handleClose = () => {
    if (isBusy) {
      return;
    }

    setQuantidade('');
    setErroLocal(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!consignacao || !item) {
      return;
    }

    const quantidadeNumerica = Number(quantidade);

    if (
      !Number.isInteger(quantidadeNumerica) ||
      quantidadeNumerica <= 0 ||
      quantidadeNumerica > item.quantidadeDisponivel
    ) {
      setErroLocal(
        'Informe uma quantidade inteira maior que zero e menor ou igual ao disponível.',
      );
      return;
    }

    setErroLocal(null);
    setIsSaving(true);

    try {
      const result = await registrarDevolucao(consignacao.id, item.id, {
        quantidade: quantidadeNumerica,
      });

      if (!result.success) {
        return;
      }

      await onSaved?.();
      showSuccess('Devolução registrada com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
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
              <AssignmentReturn color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Registrar devolução
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {obterNomeProduto(item)}
            </Typography>
          </Box>

          <IconButton
            onClick={handleClose}
            aria-label="Fechar modal de devolução consignada"
            disabled={isBusy}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={erroLocal ?? submitErrorMessage} />

        <TextField
          fullWidth
          label="Quantidade devolvida"
          required
          type="number"
          value={quantidade}
          onChange={(event) => setQuantidade(event.target.value)}
          disabled={isBusy}
          helperText={
            item
              ? `Disponível para devolução: ${item.quantidadeDisponivel}`
              : ''
          }
          inputProps={{ min: 1, max: item?.quantidadeDisponivel ?? 1, step: 1 }}
          sx={{ mt: 1 }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={isBusy}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSubmit}
          disabled={isBusy || !item}
        >
          Registrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
