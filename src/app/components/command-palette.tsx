import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  Box,
  Dialog,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { Search } from '@mui/icons-material';

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  /** Termos extras que também encontram o item. */
  keywords?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  items: CommandItem[];
  onClose: () => void;
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Busca rápida: navega para telas e dispara ações pelo teclado (Ctrl+K). */
export default function CommandPalette({
  open,
  items,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const activeRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);

    if (terms.length === 0) {
      return items;
    }

    return items.filter((item) => {
      const haystack = normalize(
        `${item.label} ${item.group} ${item.keywords ?? ''}`,
      );

      return terms.every((term) => haystack.includes(term));
    });
  }, [items, query]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleClose = () => {
    setQuery('');
    setActiveIndex(0);
    onClose();
  };

  const handleSelect = (item: CommandItem) => {
    handleClose();
    item.onSelect();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      const item = results[activeIndex];

      if (item) {
        event.preventDefault();
        handleSelect(item);
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: { sx: { alignSelf: 'flex-start', mt: { xs: 0, sm: 10 } } },
      }}
    >
      <Box sx={{ p: 2, pb: 1 }} onKeyDown={handleKeyDown}>
        <TextField
          autoFocus
          fullWidth
          placeholder="Buscar tela ou ação…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            },
            htmlInput: { 'aria-label': 'Buscar tela ou ação' },
          }}
        />
      </Box>

      <List sx={{ maxHeight: 360, overflowY: 'auto', px: 1, pb: 1 }}>
        {results.length === 0 ? (
          <Typography color="text.secondary" sx={{ px: 2, py: 3 }}>
            Nada encontrado para “{query}”.
          </Typography>
        ) : (
          results.map((item, index) => (
            <ListItemButton
              key={item.id}
              ref={index === activeIndex ? activeRef : undefined}
              selected={index === activeIndex}
              onClick={() => handleSelect(item)}
              onMouseMove={() => setActiveIndex(index)}
            >
              <ListItemText
                primary={item.label}
                secondary={item.group}
                slotProps={{ secondary: { variant: 'caption' } }}
              />
            </ListItemButton>
          ))
        )}
      </List>

      <Box
        sx={{
          px: 2,
          py: 1,
          borderTop: 1,
          borderColor: 'divider',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Typography variant="caption" color="text.secondary">
          ↑ ↓ navegar · Enter abrir · Esc fechar
        </Typography>
      </Box>
    </Dialog>
  );
}
