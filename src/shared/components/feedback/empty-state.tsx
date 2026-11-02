import type { ReactNode } from 'react';
import { Stack, Typography } from '@mui/material';
import { InboxOutlined } from '@mui/icons-material';

interface EmptyStateProps {
  message: string;
  /** Ação sugerida (ex.: botão para cadastrar o primeiro registro). */
  action?: ReactNode;
}

export default function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <Stack
      alignItems="center"
      spacing={1.5}
      sx={{ py: 6, px: 2, textAlign: 'center' }}
    >
      <InboxOutlined sx={{ fontSize: 40, color: 'text.disabled' }} />
      <Typography color="text.secondary">{message}</Typography>
      {action}
    </Stack>
  );
}
