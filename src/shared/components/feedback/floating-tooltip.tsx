import { Box, Paper, Portal, Stack, Typography } from '@mui/material';
import type { FloatingTooltipState } from '../../hooks/use-floating-tooltip';

interface FloatingTooltipProps {
  tooltip: FloatingTooltipState | null;
}

const POINTER_OFFSET = 12;

function ColorMarker({ color }: { color: string }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: 10,
        height: 10,
        borderRadius: 0.5,
        bgcolor: color,
        flexShrink: 0,
      }}
    />
  );
}

/** Renderiza o tooltip controlado por `useFloatingTooltip`. */
export default function FloatingTooltip({ tooltip }: FloatingTooltipProps) {
  if (!tooltip) {
    return null;
  }

  const translateX =
    tooltip.placement === 'left'
      ? `calc(-100% - ${POINTER_OFFSET}px)`
      : `${POINTER_OFFSET}px`;

  // Portal: `position: fixed` não pode ficar preso a um ancestral com transform.
  return (
    <Portal>
      <Paper
        id={tooltip.id}
        role="tooltip"
        elevation={3}
        sx={{
          position: 'fixed',
          left: tooltip.x,
          top: tooltip.y,
          transform: `translate(${translateX}, -${POINTER_OFFSET}px)`,
          px: 1.5,
          py: 1,
          maxWidth: 280,
          pointerEvents: 'none',
          zIndex: (theme) => theme.zIndex.tooltip,
          borderRadius: 2,
        }}
      >
        <Stack spacing={0.5}>
          {tooltip.title ? (
            <Stack direction="row" spacing={1} alignItems="center">
              {tooltip.color ? <ColorMarker color={tooltip.color} /> : null}
              <Typography variant="caption" fontWeight={700}>
                {tooltip.title}
              </Typography>
            </Stack>
          ) : null}
          {tooltip.lines.map((line) => (
            <Stack
              key={line.label}
              direction="row"
              spacing={1.5}
              justifyContent="space-between"
              alignItems="center"
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                {line.color ? <ColorMarker color={line.color} /> : null}
                <Typography variant="caption" color="text.secondary">
                  {line.label}
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {line.value}
              </Typography>
            </Stack>
          ))}
          {tooltip.caption ? (
            <Typography variant="caption" color="text.secondary">
              {tooltip.caption}
            </Typography>
          ) : null}
        </Stack>
      </Paper>
    </Portal>
  );
}
