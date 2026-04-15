import { Box } from '@mui/material';

interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>{message}</Box>
  );
}
