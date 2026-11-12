import {
  Box,
  Button,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Close, Minimize } from '@mui/icons-material';

interface SaleDialogHeaderProps {
  configSummary: string;
  isBusy: boolean;
  isEditMode: boolean;
  saleId?: number;
  onAskCancel: () => void;
  onMinimize?: () => void;
  onToggleConfig: () => void;
}

export default function SaleDialogHeader({
  configSummary,
  isBusy,
  isEditMode,
  saleId,
  onAskCancel,
  onMinimize,
  onToggleConfig,
}: SaleDialogHeaderProps) {
  return (
    <DialogTitle sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h5" fontWeight={800}>
            {isEditMode ? `Alterar venda #${saleId}` : 'Nova venda rápida'}
          </Typography>
          <Button
            color="inherit"
            size="small"
            onClick={onToggleConfig}
            sx={{
              justifyContent: 'flex-start',
              minWidth: 0,
              px: 0,
              mt: 0.25,
              color: 'text.secondary',
              textTransform: 'none',
            }}
          >
            <Typography variant="body2" noWrap>
              {configSummary}
            </Typography>
          </Button>
        </Box>

        {onMinimize && !isEditMode ? (
          <Tooltip title="Minimizar venda">
            <span>
              <IconButton
                onClick={onMinimize}
                aria-label="Minimizar venda"
                disabled={isBusy}
              >
                <Minimize />
              </IconButton>
            </span>
          </Tooltip>
        ) : null}

        <IconButton
          onClick={onAskCancel}
          aria-label="Fechar modal de venda"
          disabled={isBusy}
        >
          <Close />
        </IconButton>
      </Stack>
    </DialogTitle>
  );
}
