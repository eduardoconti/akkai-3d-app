import { alpha, type Theme } from '@mui/material/styles';
import type { HorizontalOverflow } from '../hooks/use-horizontal-overflow';

/**
 * Sombras nas bordas de um contêiner com rolagem horizontal, visíveis só do
 * lado em que há conteúdo escondido. Aplicar no elemento que envolve a área
 * rolável (precisa de `position: relative`, já incluído).
 */
export function getOverflowFadeSx(overflow: HorizontalOverflow) {
  const shadow = (theme: Theme, direction: 'right' | 'left') =>
    `linear-gradient(to ${direction}, ${alpha(theme.palette.text.primary, 0.12)}, transparent)`;

  return {
    position: 'relative',
    '&::before, &::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 24,
      pointerEvents: 'none',
      zIndex: 2,
      transition: 'opacity 0.15s ease',
    },
    '&::before': {
      left: 0,
      opacity: overflow.start ? 1 : 0,
      background: (theme: Theme) => shadow(theme, 'right'),
    },
    '&::after': {
      right: 0,
      opacity: overflow.end ? 1 : 0,
      background: (theme: Theme) => shadow(theme, 'left'),
    },
  } as const;
}
