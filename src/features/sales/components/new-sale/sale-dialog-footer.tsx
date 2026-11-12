import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { formatCurrency } from '@/shared';

interface SaleDialogFooterProps {
  discount: number;
  isBusy: boolean;
  isEditMode: boolean;
  isFetching: boolean;
  isOnline: boolean;
  subtotal: number;
  total: number;
  totalItems: number;
  onSubmit: () => void;
}

export default function SaleDialogFooter({
  discount,
  isBusy,
  isEditMode,
  isFetching,
  isOnline,
  subtotal,
  total,
  totalItems,
  onSubmit,
}: SaleDialogFooterProps) {
  return (
    <>
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.default',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary">
            Total • {totalItems} {totalItems === 1 ? 'item' : 'itens'}
            {discount > 0 ? (
              <>
                {' '}
                <Typography
                  component="span"
                  variant="body2"
                  color="text.secondary"
                  sx={{ textDecoration: 'line-through' }}
                >
                  {formatCurrency(subtotal)}
                </Typography>
              </>
            ) : null}
          </Typography>
          <Typography variant="h4" fontWeight={900} color="success.main">
            {formatCurrency(total)}
          </Typography>
        </Box>

        <Button
          onClick={onSubmit}
          variant="contained"
          size="large"
          endIcon={<ArrowForward />}
          disabled={isBusy || (isEditMode && !isOnline)}
          sx={{ minWidth: { xs: 132, sm: 160 }, height: 56 }}
        >
          {isBusy
            ? 'Salvando...'
            : isEditMode
              ? 'Salvar'
              : isOnline
                ? 'Finalizar'
                : 'Salvar offline'}
        </Button>
      </Box>

      {isFetching ? (
        <Box sx={{ position: 'absolute', top: 22, right: 64 }}>
          <CircularProgress size={20} />
        </Box>
      ) : null}
    </>
  );
}
