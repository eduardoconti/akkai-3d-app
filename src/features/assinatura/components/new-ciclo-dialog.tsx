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
import { Add, AllInbox, Close, Delete, Save } from '@mui/icons-material';
import {
  assinaturaStoreSelectors,
  useAssinaturaStore,
} from '@/features/assinatura/store/use-assinatura-store';
import {
  initialCicloFormState,
  initialItemCicloFormState,
  MESES_LABEL,
  STATUS_CICLO_LABEL,
  type CicloFormErrors,
  type CicloFormState,
  type ItemCicloFormState,
} from '@/features/assinatura/types/assinatura-form';
import {
  FormFeedbackAlert,
  getFieldMessage,
  useFeedbackStore,
  useFormDialog,
  type StatusCiclo,
} from '@/shared';
import { useShallow } from 'zustand/react/shallow';

interface NewCicloDialogProps {
  open: boolean;
  onClose: () => void;
}

const currentYear = new Date().getFullYear();
const ANOS = Array.from({ length: 11 }, (_, i) => currentYear - 2 + i);

export default function NewCicloDialog({ open, onClose }: NewCicloDialogProps) {
  const { assinantes, clearSubmitError, criarCiclo, fetchAssinantes, fetchCiclos, isSubmitting, submitErrorMessage } =
    useAssinaturaStore(
      useShallow((state) => ({
        assinantes: assinaturaStoreSelectors.assinantes(state),
        clearSubmitError: assinaturaStoreSelectors.clearSubmitError(state),
        criarCiclo: assinaturaStoreSelectors.criarCiclo(state),
        fetchAssinantes: assinaturaStoreSelectors.fetchAssinantes(state),
        fetchCiclos: assinaturaStoreSelectors.fetchCiclos(state),
        isSubmitting: assinaturaStoreSelectors.isSubmitting(state),
        submitErrorMessage: assinaturaStoreSelectors.submitErrorMessage(state),
      })),
    );
  const showSuccess = useFeedbackStore((state) => state.showSuccess);
  const { form, setForm, problem, setProblem, localErrors, setLocalErrors, isSaving, setIsSaving, resetForm } =
    useFormDialog<CicloFormState, CicloFormErrors>({
      open,
      initialValues: initialCicloFormState,
      onReset: clearSubmitError,
    });

  useEffect(() => {
    if (!open) return;
    void fetchAssinantes({ tamanhoPagina: 50 });
  }, [open, fetchAssinantes]);

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
    const errors: CicloFormErrors = {};

    if (form.idAssinante === '') {
      errors.idAssinante = 'Selecione um assinante.';
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
      const result = await criarCiclo({
        idAssinante: form.idAssinante as number,
        mesReferencia: form.mesReferencia,
        anoReferencia: form.anoReferencia,
        status: form.status,
        codigoRastreio: form.codigoRastreio.trim() || undefined,
        observacao: form.observacao.trim() || undefined,
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

      await fetchCiclos({ pagina: 1 });
      showSuccess('Ciclo cadastrado com sucesso.');
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
              <AllInbox color="primary" />
              <Typography variant="h5" fontWeight={700}>
                Novo ciclo
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Registre um ciclo de kit mensal para um assinante.
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
              label="Assinante"
              value={form.idAssinante}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  idAssinante: e.target.value === '' ? '' : Number(e.target.value),
                }))
              }
              error={Boolean(localErrors.idAssinante ?? getFieldMessage(problem, 'idAssinante'))}
              helperText={localErrors.idAssinante ?? getFieldMessage(problem, 'idAssinante')}
            >
              <MenuItem value="">Selecione um assinante</MenuItem>
              {assinantes.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.nome}
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

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              label="Status"
              value={form.status}
              onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as StatusCiclo }))}
            >
              {(Object.keys(STATUS_CICLO_LABEL) as StatusCiclo[]).map((s) => (
                <MenuItem key={s} value={s}>
                  {STATUS_CICLO_LABEL[s]}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Código de rastreio"
              placeholder="Ex: BR123456789BR"
              value={form.codigoRastreio}
              onChange={(e) => setForm((c) => ({ ...c, codigoRastreio: e.target.value }))}
              helperText="Opcional"
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              label="Observação"
              placeholder="Ex: Substituir peça X pelo modelo Y"
              value={form.observacao}
              onChange={(e) => setForm((c) => ({ ...c, observacao: e.target.value }))}
              helperText="Opcional"
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Itens do ciclo
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
                    placeholder="Ex: Porta-copo"
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
          {isBusy ? 'Salvando...' : 'Salvar ciclo'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
