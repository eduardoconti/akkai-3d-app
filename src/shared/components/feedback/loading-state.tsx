import { Skeleton, Stack } from '@mui/material';

interface LoadingStateProps {
  /** Quantidade de linhas do esqueleto. */
  rows?: number;
}

/** Esqueleto de lista exibido enquanto os dados carregam. */
export default function LoadingState({ rows = 4 }: LoadingStateProps) {
  return (
    <Stack spacing={1.5} sx={{ p: 2 }} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton
          key={index}
          variant="rounded"
          height={index === 0 ? 20 : 44}
          width={index === 0 ? '35%' : '100%'}
        />
      ))}
    </Stack>
  );
}
