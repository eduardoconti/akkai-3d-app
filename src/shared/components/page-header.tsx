import type { ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';
import { usePageTitle } from '../hooks/use-page-title';

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Ações extras (botões) exibidas ao lado da ação principal. */
  actions?: ReactNode;
  breakpoint?: 'md' | 'lg';
}

export default function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  actions,
  breakpoint = 'md',
}: PageHeaderProps) {
  usePageTitle(title);

  const titleBlock = (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h5" component="h1">
        {title}
      </Typography>
      {description ? (
        <Typography color="text.secondary">{description}</Typography>
      ) : null}
    </Box>
  );

  if (!actionLabel && !actions) {
    return titleBlock;
  }

  return (
    <Stack
      direction={{ xs: 'column', [breakpoint]: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', [breakpoint]: 'center' }}
      spacing={2}
    >
      {titleBlock}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        sx={{ flexShrink: 0 }}
      >
        {actions}
        {actionLabel ? (
          <Button
            variant="contained"
            startIcon={<AddCircleOutline />}
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
