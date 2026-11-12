import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { ExpandMore, Search } from '@mui/icons-material';
import type { AvailablePermission } from '@/features/auth/api/permissions-admin-api';
import {
  groupPermissions,
  type PermissionArea,
} from '@/features/auth/utils/permission-model';

export type PermissionBadge = 'granted' | 'revoked';

interface PermissionChecklistProps {
  permissions: AvailablePermission[];
  isActive: (name: string) => boolean;
  onToggle: (names: string[], active: boolean) => void;
  /** Destaca ajustes em relação ao papel (usado na edição de usuários). */
  getBadge?: (name: string) => PermissionBadge | null;
  /** Permissões que não podem ser alteradas, com o motivo exibido em dica. */
  getLockedReason?: (name: string) => string | null;
}

function filterAreas(areas: PermissionArea[], term: string): PermissionArea[] {
  const normalized = term.trim().toLowerCase();

  if (!normalized) {
    return areas;
  }

  return areas
    .map((area) => ({
      ...area,
      modules: area.modules
        .map((module) => ({
          ...module,
          actions: module.actions.filter((action) =>
            [module.label, action.label, action.name, action.description ?? '']
              .join(' ')
              .toLowerCase()
              .includes(normalized),
          ),
        }))
        .filter((module) => module.actions.length > 0),
    }))
    .filter((area) => area.modules.length > 0);
}

/** Lista de permissões por área e módulo, com busca e marcação em lote. */
export default function PermissionChecklist({
  permissions,
  isActive,
  onToggle,
  getBadge,
  getLockedReason,
}: PermissionChecklistProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const areas = useMemo(() => groupPermissions(permissions), [permissions]);
  const isSearching = searchTerm.trim().length > 0;
  const visibleAreas = filterAreas(areas, searchTerm);

  return (
    <Stack spacing={2}>
      <TextField
        size="small"
        placeholder="Buscar permissão"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
        slotProps={{
          htmlInput: { 'aria-label': 'Buscar permissão' },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {visibleAreas.length === 0 ? (
        <Typography color="text.secondary">
          Nenhuma permissão encontrada para a busca.
        </Typography>
      ) : null}

      <Box>
        {visibleAreas.map((area) => {
          const areaNames = area.modules.flatMap((module) =>
            module.actions.map((action) => action.name),
          );
          const activeCount = areaNames.filter(isActive).length;
          const toggleableNames = areaNames.filter(
            (name) => !getLockedReason?.(name),
          );

          return (
            <Accordion
              // Recria ao iniciar/limpar a busca para abrir os resultados.
              key={`${area.id}-${isSearching}`}
              defaultExpanded={isSearching}
              disableGutters
              variant="outlined"
              sx={{ '&:not(:last-child)': { borderBottom: 0 } }}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                aria-controls={`area-${area.id}-content`}
                id={`area-${area.id}-header`}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ width: '100%', pr: 1 }}
                >
                  <Typography fontWeight={700} sx={{ flexGrow: 1 }}>
                    {area.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ flexShrink: 0 }}
                  >
                    {activeCount}/{areaNames.length}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      disabled={activeCount === areaNames.length}
                      onClick={() => onToggle(toggleableNames, true)}
                      aria-label={`Marcar todas as permissões de ${area.label}`}
                    >
                      Marcar todas
                    </Button>
                    <Button
                      size="small"
                      color="inherit"
                      disabled={!toggleableNames.some(isActive)}
                      onClick={() => onToggle(toggleableNames, false)}
                      aria-label={`Desmarcar todas as permissões de ${area.label}`}
                    >
                      Desmarcar todas
                    </Button>
                  </Stack>

                  {area.modules.map((module) => (
                    <Box key={module.id}>
                      <Typography
                        variant="subtitle2"
                        component="p"
                        color="text.secondary"
                      >
                        {module.label}
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" columnGap={2}>
                        {module.actions.map((action) => {
                          const badge = getBadge?.(action.name) ?? null;
                          const lockedReason =
                            getLockedReason?.(action.name) ?? null;

                          return (
                            <Tooltip
                              key={action.name}
                              title={
                                lockedReason ??
                                action.description ??
                                action.name
                              }
                            >
                              <FormControlLabel
                                disabled={lockedReason !== null}
                                control={
                                  <Checkbox
                                    size="small"
                                    checked={isActive(action.name)}
                                    onChange={(event) =>
                                      onToggle(
                                        [action.name],
                                        event.target.checked,
                                      )
                                    }
                                    slotProps={{
                                      input: {
                                        'aria-label': `${module.label}: ${action.label}`,
                                      },
                                    }}
                                  />
                                }
                                label={
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    alignItems="center"
                                  >
                                    <Typography
                                      variant="body2"
                                      color={
                                        badge === 'granted'
                                          ? 'success.main'
                                          : badge === 'revoked'
                                            ? 'error.main'
                                            : 'text.primary'
                                      }
                                      fontWeight={badge ? 700 : 400}
                                    >
                                      {action.label}
                                    </Typography>
                                    {badge ? (
                                      <Chip
                                        size="small"
                                        color={
                                          badge === 'granted'
                                            ? 'success'
                                            : 'error'
                                        }
                                        variant="outlined"
                                        label={
                                          badge === 'granted'
                                            ? 'Concedida'
                                            : 'Revogada'
                                        }
                                      />
                                    ) : null}
                                  </Stack>
                                }
                              />
                            </Tooltip>
                          );
                        })}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Stack>
  );
}
