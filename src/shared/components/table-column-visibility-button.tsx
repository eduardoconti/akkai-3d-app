import { useState } from 'react';
import {
  Button,
  Checkbox,
  Divider,
  ListItemText,
  Menu,
  MenuItem,
} from '@mui/material';
import { RestartAlt, ViewColumn } from '@mui/icons-material';
import type { TableColumnOption } from '../hooks/use-table-column-visibility';

interface TableColumnVisibilityButtonProps<TColumnId extends string> {
  columns: readonly TableColumnOption<TColumnId>[];
  visibleColumnIds: readonly TColumnId[];
  onToggleColumn: (columnId: TColumnId) => void;
  onResetColumns: () => void;
}

export default function TableColumnVisibilityButton<TColumnId extends string>({
  columns,
  visibleColumnIds,
  onToggleColumn,
  onResetColumns,
}: TableColumnVisibilityButtonProps<TColumnId>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const visibleColumnIdsSet = new Set(visibleColumnIds);

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<ViewColumn fontSize="small" />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        Colunas
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {columns.map((column) => (
          <MenuItem
            key={column.id}
            dense
            disabled={column.required}
            onClick={() => onToggleColumn(column.id)}
          >
            <Checkbox
              edge="start"
              size="small"
              checked={visibleColumnIdsSet.has(column.id)}
              tabIndex={-1}
              disableRipple
            />
            <ListItemText primary={column.label} />
          </MenuItem>
        ))}

        <Divider />

        <MenuItem dense onClick={onResetColumns}>
          <RestartAlt fontSize="small" />
          <ListItemText primary="Redefinir" sx={{ ml: 1.5 }} />
        </MenuItem>
      </Menu>
    </>
  );
}
