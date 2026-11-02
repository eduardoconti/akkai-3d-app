import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface BrandMarkProps {
  size?: number;
}

/** Símbolo da marca: cubo isométrico (referência à impressão 3D). */
export function BrandMark({ size = 36 }: BrandMarkProps) {
  return (
    <Box
      component="svg"
      viewBox="0 0 64 64"
      role="img"
      aria-label="AKKAI 3D"
      sx={{ width: size, height: size, flexShrink: 0, display: 'block' }}
    >
      <rect width="64" height="64" rx="16" fill="#0B7FC0" />
      <polygon points="32,12 49.3,22 32,32 14.7,22" fill="#F5B800" />
      <polygon points="14.7,22 32,32 32,52 14.7,42" fill="#CFE9F7" />
      <polygon points="49.3,22 49.3,42 32,52 32,32" fill="#8FCBEA" />
    </Box>
  );
}

interface BrandLogoProps {
  size?: number;
  /** Texto de apoio exibido sob o nome (ex.: status de conexão). */
  caption?: ReactNode;
}

export function BrandLogo({ size = 36, caption }: BrandLogoProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <BrandMark size={size} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="span"
          sx={{
            display: 'block',
            fontWeight: 700,
            fontSize: '1.125rem',
            letterSpacing: '-0.01em',
            lineHeight: 1.1,
            color: 'text.primary',
          }}
        >
          AKKAI{' '}
          <Box component="span" sx={{ color: 'primary.main' }}>
            3D
          </Box>
        </Typography>
        {caption ? <Box sx={{ mt: 0.25 }}>{caption}</Box> : null}
      </Box>
    </Box>
  );
}
