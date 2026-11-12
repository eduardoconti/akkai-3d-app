import { Chip, type ChipProps } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';

export type StatusChipTone = NonNullable<ChipProps['color']>;

type StatusChipProps = Omit<ChipProps, 'color' | 'variant'> & {
  /** Tom semântico do status; `default` é neutro (ex.: inativo, fechado). */
  tone?: StatusChipTone;
};

function getToneColors(theme: Theme, tone: StatusChipTone) {
  if (tone === 'default') {
    return {
      main: theme.palette.text.secondary,
      text: theme.palette.text.secondary,
    };
  }

  const palette = theme.palette[tone];
  const isDark = theme.palette.mode === 'dark';

  return {
    main: palette.main,
    // No claro, o tom escuro garante contraste do texto sobre o fundo tingido.
    text: isDark ? palette.light : palette.dark,
  };
}

/**
 * Chip de status com um único visual em todo o app: fundo tingido, texto e
 * borda na cor do tom. Use no lugar de `Chip` para status de registros.
 */
export default function StatusChip({
  tone = 'default',
  size = 'small',
  sx,
  ...chipProps
}: StatusChipProps) {
  return (
    <Chip
      {...chipProps}
      size={size}
      variant="outlined"
      sx={[
        (theme) => {
          const colors = getToneColors(theme, tone);

          return {
            fontWeight: 600,
            color: colors.text,
            borderColor: alpha(colors.main, 0.35),
            backgroundColor: alpha(colors.main, 0.1),
            '&.MuiChip-clickable:hover': {
              backgroundColor: alpha(colors.main, 0.18),
            },
          };
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
