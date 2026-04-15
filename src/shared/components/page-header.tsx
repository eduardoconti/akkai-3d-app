import { Box, Button, Stack, Typography } from '@mui/material';
import { AddCircleOutline } from '@mui/icons-material';

interface PageHeaderProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  breakpoint?: 'md' | 'lg';
}

export default function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  breakpoint = 'md',
}: PageHeaderProps) {
  const titleBlock = (
    <Box>
      <Typography variant="h5" fontWeight={700}>
        {title}
      </Typography>
      <Typography color="text.secondary">{description}</Typography>
    </Box>
  );

  if (!actionLabel) {
    return titleBlock;
  }

  return (
    <Stack
      direction={
        breakpoint === 'lg'
          ? { xs: 'column', lg: 'row' }
          : { xs: 'column', md: 'row' }
      }
      justifyContent="space-between"
      spacing={2}
    >
      {titleBlock}
      <Button
        variant="contained"
        startIcon={<AddCircleOutline />}
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </Stack>
  );
}
