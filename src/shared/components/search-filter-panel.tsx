import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Button,
  CircularProgress,
  Collapse,
  Paper,
  Stack,
  useMediaQuery,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { ExpandMore, FilterList, Search } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';

interface SearchFilterPanelProps {
  children: ReactNode;
  onSearch: () => void;
  onClear: () => void;
  isLoading?: boolean;
  searchLabel?: string;
  clearLabel?: string;
  loadingLabel?: string;
  searchDisabled?: boolean;
  clearDisabled?: boolean;
  columns?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  /** No celular, inicia com os filtros recolhidos para a lista aparecer antes. */
  defaultCollapsedOnMobile?: boolean;
}

export default function SearchFilterPanel({
  children,
  onSearch,
  onClear,
  isLoading = false,
  searchLabel = 'Pesquisar',
  clearLabel = 'Limpar filtros',
  loadingLabel = 'Consultando...',
  searchDisabled = false,
  clearDisabled = false,
  columns = { xs: 12, md: 12, lg: 20 },
  defaultCollapsedOnMobile = false,
}: SearchFilterPanelProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isCollapsible = defaultCollapsedOnMobile && isMobile;
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(
    null,
  );
  const isExpanded = !isCollapsible || (expandedOverride ?? false);
  const resolvedSearchLabel = isLoading ? loadingLabel : searchLabel;
  const isSearchDisabled = searchDisabled || isLoading;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSearchDisabled) {
      return;
    }

    onSearch();
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{ p: { xs: 1.5, sm: 2.5 } }}
    >
      {isCollapsible ? (
        <Button
          type="button"
          variant="outlined"
          color="inherit"
          fullWidth
          startIcon={<FilterList />}
          endIcon={
            <ExpandMore
              sx={{
                transform: isExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }}
            />
          }
          aria-expanded={isExpanded}
          onClick={() => setExpandedOverride(!isExpanded)}
          sx={{ justifyContent: 'space-between' }}
        >
          Filtros
        </Button>
      ) : null}
      <Collapse in={isExpanded} unmountOnExit={false}>
        <Stack spacing={2} sx={{ pt: isCollapsible ? 2 : 0 }}>
          <Grid container spacing={2} columns={columns}>
            {children}
          </Grid>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            justifyContent={{ xs: 'stretch', sm: 'flex-end' }}
            alignItems={{ xs: 'stretch', sm: 'center' }}
          >
            <Button
              type="button"
              variant="text"
              onClick={onClear}
              disabled={clearDisabled || isLoading}
              sx={{
                height: { xs: 40, sm: 44 },
                minWidth: { sm: 140 },
                order: { xs: 2, sm: 1 },
              }}
            >
              {clearLabel}
            </Button>

            <Button
              type="submit"
              variant="contained"
              startIcon={
                isLoading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : isMobile ? undefined : (
                  <Search />
                )
              }
              disabled={isSearchDisabled}
              sx={{
                height: { xs: 44, sm: 44 },
                minWidth: { sm: 140 },
                order: { xs: 1, sm: 2 },
              }}
            >
              {resolvedSearchLabel}
            </Button>
          </Stack>
        </Stack>
      </Collapse>
    </Paper>
  );
}
