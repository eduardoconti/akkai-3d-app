import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  FormHelperText,
  IconButton,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { AccountBalanceWallet, Close, Save } from '@mui/icons-material';
import { getProblemDetailsFromError } from '@/shared/lib/api/http-client';
import { useFinanceStore } from '@/features/finance/store/use-finance-store';
import {
  ALL_MEIOS_PAGAMENTO,
  MEIO_PAGAMENTO_LABEL,
  initialWalletFormState,
  type WalletFormErrors,
  type WalletFormState,
} from '@/features/finance/types/finance-form';
import type { MeioPagamento } from '@/shared';
import {
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  type ProblemDetails,
} from '@/shared';

interface EditWalletDialogProps {
  open: boolean;
  walletId: number | null;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}

export default function EditWalletDialog({
  open,
  walletId,
  onClose,
  onUpdated,
}: EditWalletDialogProps) {
  const {
    atualizarCarteira,
    clearSubmitError,
    isSubmitting,
    obterCarteiraPorId,
    submitErrorMessage,
  } = useFinanceStore();
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const [form, setForm] = useState<WalletFormState>(initialWalletFormState);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<WalletFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || walletId === null) {
      setForm(initialWalletFormState);
      setProblem(null);
      setLocalErrors({});
      clearSubmitError();
      return;
    }

    let active = true;

    const loadWallet = async () => {
      setIsLoading(true);
      setProblem(null);
      setLocalErrors({});

      try {
        const carteira = await obterCarteiraPorId(walletId);

        if (!active) {
          return;
        }

        setForm({
          nome: carteira.nome,
          ativa: carteira.ativa,
          meiosPagamento: carteira.meiosPagamento ?? [],
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setProblem(getProblemDetailsFromError(error));
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadWallet();

    return () => {
      active = false;
    };
  }, [clearSubmitError, obterCarteiraPorId, open, walletId]);

  const handleClose = () => {
    setForm(initialWalletFormState);
    setProblem(null);
    setLocalErrors({});
    clearSubmitError();
    onClose();
  };

  const handleSubmit = async () => {
    if (walletId === null) {
      return;
    }

    const errors: WalletFormErrors = {};

    if (form.nome.trim().length < 2) {
      errors.nome = 'Informe um nome com pelo menos 2 caracteres.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    const result = await atualizarCarteira(walletId, {
      nome: form.nome.trim(),
      ativa: form.ativa,
      meiosPagamento: form.meiosPagamento,
    });

    if (!result.success) {
      setProblem(result.problem);
      return;
    }

    await onUpdated();
    showSuccess('Carteira alterada com sucesso.');
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <AccountBalanceWallet color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Alterar carteira
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Atualize os dados da carteira selecionada.
            </Typography>
          </Box>

          <IconButton onClick={handleClose} aria-label="Fechar modal de carteira">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 7 }}>
            <TextField
              fullWidth
              disabled={isLoading}
              label="Nome da carteira"
              placeholder="Ex: Nubank PIX"
              value={form.nome}
              onChange={(event) =>
                setForm((current) => ({ ...current, nome: event.target.value }))
              }
              error={Boolean(localErrors.nome || getFieldMessage(problem, 'nome'))}
              helperText={localErrors.nome ?? getFieldMessage(problem, 'nome')}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Meios de pagamento aceitos{' '}
              <Typography component="span" variant="caption" color="text.disabled">
                (vazio = aceita todos)
              </Typography>
            </Typography>
            <ToggleButtonGroup
              value={form.meiosPagamento}
              onChange={(_event, value: MeioPagamento[]) =>
                setForm((current) => ({ ...current, meiosPagamento: value }))
              }
              size="small"
              disabled={isLoading}
            >
              {ALL_MEIOS_PAGAMENTO.map((meio) => (
                <ToggleButton key={meio} value={meio}>
                  {MEIO_PAGAMENTO_LABEL[meio]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <FormHelperText>
              Selecione quais meios serão aceitos nesta carteira.
            </FormHelperText>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.ativa}
                  disabled={isLoading}
                  onChange={(_event, checked) =>
                    setForm((current) => ({ ...current, ativa: checked }))
                  }
                />
              }
              label="Carteira ativa"
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit" disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<Save />}
          size="large"
          disabled={isSubmitting || isLoading}
        >
          {isSubmitting ? 'Salvando...' : 'Salvar carteira'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
