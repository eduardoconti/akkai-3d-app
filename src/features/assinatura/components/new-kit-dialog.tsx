import { useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add, Close, Delete, Inventory2, Save } from '@mui/icons-material';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  initialItemCicloFormState,
  initialKitFormState,
  MESES_LABEL,
  type ItemCicloFormState,
  type KitFormErrors,
  type KitFormState,
} from '@/features/assinatura/types/assinatura-form';
import {
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface NewKitDialogProps {
  open: boolean;
  onClose: () => void;
}

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 11 }, (_, i) => currentYear - 2 + i);

export default function NewKitDialog({ open, onClose }: NewKitDialogProps) {
  const { clearSubmitError, criarKit, fetchKits, fetchPlanos, isSubmitting, planos, submitErrorMessage } =
    useAssinaturaStore(
      useShallow((state) => ({
        clearSubmitError: assinaturaStoreSelectors.clearSubmitError(state),
        criarKit: assinaturaStoreSelectors.criarKit(state),
        fetchKits: assinaturaStoreSelectors.fetchKits(state),
        fetchPlanos: assinaturaStoreSelectors.fetchPlanos(state),
        isSubmitting: assinaturaStoreSelectors.isSubmitting(state),
        planos: assinaturaStoreSelectors.planos(state),
        submitErrorMessage: assinaturaStoreSelectors.submitErrorMessage(state),
      })),
    );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const { form, setForm, problem, setProblem, localErrors, setLocalErrors, isSaving, setIsSaving, resetForm } =
    useFormDialog<KitFormState, KitFormErrors>({
      open,
      initialValues: initialKitFormState,
      onReset: clearSubmitError,
    });

  useEffect(() => {
    if (!open) return;
    void fetchPlanos();
  }, [open, fetchPlanos]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isBusy = isSubmitting || isSaving;

  const handleDialogClose = () => {
    if (isBusy) return;
    handleClose();
  };

  const setItem = (index: number, patch: Partial<ItemCicloFormState>) => {
    setForm((c) => ({
      ...c,
      itens: c.itens.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const addItem = () => {
    setForm((c) => ({
      ...c,
      itens: [...c.itens, { ...initialItemCicloFormState }],
    }));
  };

  const removeItem = (index: number) => {
    setForm((c) => ({
      ...c,
      itens: c.itens.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    const errors: KitFormErrors = {};

    if (form.idPlano === '') {
      errors.idPlano = 'Selecione um plano.';
    }

    const itensInvalidos = form.itens.some(
      (item) => item.nomeProduto.trim().length === 0 || item.quantidade === '' || Number(item.quantidade) <= 0,
    );

    if (itensInvalidos) {
      errors.itens = 'Todos os itens devem ter nome e quantidade maior que zero.';
    }

    setLocalErrors(errors);
    setProblem(null);

    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);

    try {
      const result = await criarKit({
        idPlano: form.idPlano as number,
        mesReferencia: form.mesReferencia,
        anoReferencia: form.anoReferencia,
        itens: form.itens.map((item) => ({
          nomeProduto: item.nomeProduto.trim(),
          quantidade: item.quantidade as number,
          observacao: item.observacao.trim() || undefined,
        })),
      });

      if (!result.success) {
        setProblem(result.problem);
        return;
      }

      await fetchKits({ pagina: 1 });
      showSuccess('Kit mensal cadastrado com sucesso.');
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="md">
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
              <Inventory2 color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Novo kit mensal
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Defina o kit de produtos que será enviado para os assinantes de um plano.
            </Typography>
          </Box>
          <IconButton onClick={handleDialogClose} disabled={isBusy} aria-label="Fechar">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <FormFeedbackAlert message={problem?.detail ?? submitErrorMessage} />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              fullWidth
              label="Plano"
              value={form.idPlano}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  idPlano: e.target.value === '' ? '' : Number(e.target.value),
                }))
              }
              error={Boolean(localErrors.idPlano ?? getFieldMessage(problem, 'idPlano'))}
              helperText={localErrors.idPlano ?? getFieldMessage(problem, 'idPlano')}
            >
              <MenuItem value="">Selecione um plano</MenuItem>
              {planos.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.nome}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              select
              fullWidth
              label="Mês"
              value={form.mesReferencia}
              onChange={(e) => setForm((c) => ({ ...c, mesReferencia: Number(e.target.value) }))}
            >
              {Object.entries(MESES_LABEL).map(([mes, label]) => (
                <MenuItem key={mes} value={Number(mes)}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              select
              fullWidth
              label="Ano"
              value={form.anoReferencia}
              onChange={(e) => setForm((c) => ({ ...c, anoReferencia: Number(e.target.value) }))}
            >
              {ANOS.map((ano) => (
                <MenuItem key={ano} value={ano}>
                  {ano}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Itens do kit
            </Typography>
            <Button size="small" startIcon={<Add />} onClick={addItem} disabled={isBusy}>
              Adicionar item
            </Button>
          </Stack>

          {localErrors.itens ? (
            <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>
              {localErrors.itens}
            </Typography>
          ) : null}

          <Stack spacing={2} divider={<Divider flexItem />}>
            {form.itens.map((item, index) => (
              <Grid container spacing={2} key={index} alignItems="flex-start">
                <Grid size={{ xs: 12, sm: 5 }}>
                  <TextField
                    fullWidth
                    label="Nome do produto"
                    placeholder="Ex: Porta-copo dragão"
                    value={item.nomeProduto}
                    onChange={(e) => setItem(index, { nomeProduto: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 6, sm: 2 }}>
                  <TextField
                    fullWidth
                    label="Qtd."
                    type="number"
                    slotProps={{ htmlInput: { min: 1 } }}
                    value={item.quantidade}
                    onChange={(e) =>
                      setItem(index, {
                        quantidade: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Observação"
                    placeholder="Opcional"
                    value={item.observacao}
                    onChange={(e) => setItem(index, { observacao: e.target.value })}
                  />
                </Grid>

                <Grid size={{ xs: 6, sm: 1 }} sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    color="error"
                    onClick={() => removeItem(index)}
                    disabled={isBusy || form.itens.length === 1}
                    aria-label="Remover item"
                  >
                    <Delete />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleDialogClose} color="inherit" disabled={isBusy}>
          Cancelar
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          variant="contained"
          startIcon={<Save />}
          size="large"
          disabled={isBusy}
        >
          {isBusy ? 'Salvando...' : 'Salvar kit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
