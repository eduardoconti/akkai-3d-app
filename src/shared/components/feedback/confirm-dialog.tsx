import type { ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** O que será afetado; evite frases genéricas como "tem certeza?". */
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Ações destrutivas usam o botão vermelho. */
  destructive?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Janela de confirmação padrão do app (exclusões, descartes, fechamentos). */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  isLoading = false,
  loadingLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={destructive ? 'error' : 'primary'}
          onClick={onConfirm}
          disabled={isLoading}
          autoFocus
        >
          {isLoading ? (loadingLabel ?? 'Aguarde...') : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
