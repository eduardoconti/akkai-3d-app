import type { ReactNode } from 'react';
import { Paper, Typography, type PaperProps } from '@mui/material';

export type StatCardTone =
  | 'default'
  | 'primary'
  | 'success'
  | 'error'
  | 'warning';

interface StatCardProps extends Omit<PaperProps, 'children' | 'color'> {
  label: string;
  value: ReactNode;
  tone?: StatCardTone;
  hint?: ReactNode;
}

const toneColor: Record<StatCardTone, string> = {
  default: 'text.primary',
  primary: 'primary.main',
  success: 'success.main',
  error: 'error.main',
  warning: 'warning.dark',
};

/** Indicador numérico em destaque, usado nos totalizadores e resumos. */
export default function StatCard({
  label,
  value,
  tone = 'default',
  hint,
  sx,
  ...paperProps
}: StatCardProps) {
  return (
    <Paper
      {...paperProps}
      sx={[
        {
          p: { xs: 1.75, sm: 2.25 },
          height: '100%',
          minWidth: 0,
          position: 'relative',
          overflow: 'hidden',
          // Filete lateral na cor do indicador: dá leitura rápida sem poluir.
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            bgcolor: tone === 'default' ? 'text.disabled' : toneColor[tone],
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 500 }}
      >
        {label}
      </Typography>
      <Typography
        variant="h5"
        component="div"
        sx={{
          mt: 0.5,
          color: toneColor[tone],
          fontVariantNumeric: 'tabular-nums',
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      ) : null}
    </Paper>
  );
}
