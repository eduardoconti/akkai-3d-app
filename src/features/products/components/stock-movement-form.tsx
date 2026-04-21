import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Close, SwapHoriz } from '@mui/icons-material';
import { addProductStockEntry, addProductStockExit } from '../api/products-api';
import {
  getProblemDetailsFromError,
  useFeedbackStore,
  type EstoqueProduto,
  type OrigemEntradaEstoque,
  type OrigemSaidaEstoque,
} from '@/shared';

type MovementType = 'ENTRADA' | 'SAIDA';

type StockFormState = {
  tipo: MovementType;
  quantidade: number;
  origem: OrigemEntradaEstoque | OrigemSaidaEstoque;
};

const initialStockFormState: StockFormState = {
  tipo: 'ENTRADA',
  quantidade: 1,
  origem: 'PRODUCAO',
};

const entryOrigins: Array<{ value: OrigemEntradaEstoque; label: string }> = [
  { value: 'PRODUCAO', label: 'Producao' },
  { value: 'COMPRA', label: 'Compra' },
  { value: 'AJUSTE', label: 'Ajuste' },
];

const exitOrigins: Array<{ value: OrigemSaidaEstoque; label: string }> = [
  { value: 'AJUSTE', label: 'Ajuste' },
  { value: 'PERDA', label: 'Perda' },
];

interface StockMovementFormProps {
  produto: EstoqueProduto;
  onSaved: (delta: number) => Promise<void> | void;
}

export default function StockMovementForm({
  produto,
  onSaved,
}: StockMovementFormProps) {
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [form, setForm] = useState<StockFormState>(initialStockFormState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const movementOrigins = useMemo(
    () => (form.tipo === 'ENTRADA' ? entryOrigins : exitOrigins),
    [form.tipo],
  );
  const actionLabel =
    form.tipo === 'ENTRADA' ? 'Registrar entrada' : 'Registrar saida';
  const movementLabel = form.tipo === 'ENTRADA' ? 'entrada' : 'saida';

  const validate = () => {
    setQuantityError(null);
    setErrorMessage(null);

    if (form.quantidade < 1) {
      setQuantityError('Informe uma quantidade de pelo menos 1 unidade.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSaving(true);

    try {
      if (form.tipo === 'ENTRADA') {
        await addProductStockEntry(produto.id, {
          quantidade: form.quantidade,
          origem: form.origem as OrigemEntradaEstoque,
        });
        await onSaved(form.quantidade);
      } else {
        await addProductStockExit(produto.id, {
          quantidade: form.quantidade,
          origem: form.origem as OrigemSaidaEstoque,
        });
        await onSaved(-form.quantidade);
      }
      setForm(initialStockFormState);
      showSuccess('Estoque atualizado com sucesso.');
    } catch (error) {
      setErrorMessage(getProblemDetailsFromError(error).detail);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAskConfirmation = () => {
    if (!validate()) {
      return;
    }

    setConfirmOpen(true);
  };

  return (
    <>
      <Stack spacing={2}>
        <Stack spacing={1}>
          <Typography variant="subtitle2" fontWeight={700}>
            Registrar movimentacao
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lance entrada ou saida manual para este produto.
          </Typography>
        </Stack>

        {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Movimentacao"
              value={form.tipo}
              onChange={(event) => {
                const tipo = event.target.value as MovementType;
                setForm({
                  tipo,
                  quantidade: 1,
                  origem: tipo === 'ENTRADA' ? 'COMPRA' : 'AJUSTE',
                });
              }}
            >
              <MenuItem value="ENTRADA">Entrada</MenuItem>
              <MenuItem value="SAIDA">Saida</MenuItem>
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              select
              fullWidth
              label="Origem"
              value={form.origem}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  origem: event.target.value as
                    | OrigemEntradaEstoque
                    | OrigemSaidaEstoque,
                }));
              }}
            >
              {movementOrigins.map((origin) => (
                <MenuItem key={origin.value} value={origin.value}>
                  {origin.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Quantidade"
              value={form.quantidade}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  quantidade: Number(event.target.value),
                }));
              }}
              inputProps={{ min: 1, step: 1 }}
              error={Boolean(quantityError)}
              helperText={quantityError ?? ' '}
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={handleAskConfirmation}
            variant="contained"
            startIcon={<SwapHoriz />}
            disabled={isSaving}
          >
            {isSaving ? 'Registrando...' : actionLabel}
          </Button>
        </Box>
      </Stack>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
      >
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
              <Typography variant="h6" fontWeight={700}>
                Confirmar {movementLabel}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Revise os dados antes de registrar a movimentacao.
              </Typography>
            </Box>

            <Button
              onClick={() => setConfirmOpen(false)}
              color="inherit"
              sx={{ minWidth: 'auto', p: 1, lineHeight: 1 }}
            >
              <Close fontSize="small" />
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2">
              Produto: <strong>{produto.nome}</strong>
            </Typography>
            <Typography variant="body2">
              Movimentacao: <strong>{movementLabel}</strong>
            </Typography>
            <Typography variant="body2">
              Origem: <strong>{form.origem}</strong>
            </Typography>
            <Typography variant="body2">
              Quantidade: <strong>{form.quantidade}</strong>
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              void handleSubmit();
            }}
            variant="contained"
            disabled={isSaving}
          >
            {isSaving ? 'Registrando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
