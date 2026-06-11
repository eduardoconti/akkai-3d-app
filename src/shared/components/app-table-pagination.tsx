import { TablePagination } from '@mui/material';
import { PAGINATED_SEARCH_PAGE_SIZE_OPTIONS } from '@/shared/lib/constants/pagination';

interface AppTablePaginationProps {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number,
  ) => void;
  onRowsPerPageChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
}

export default function AppTablePagination({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: AppTablePaginationProps) {
  return (
    <TablePagination
      component="div"
      count={count}
      page={page}
      onPageChange={onPageChange}
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={onRowsPerPageChange}
      rowsPerPageOptions={PAGINATED_SEARCH_PAGE_SIZE_OPTIONS}
      labelRowsPerPage="Itens por página"
      labelDisplayedRows={({ from, to, count: total }) =>
        `${from}-${to} de ${total !== -1 ? total : `mais de ${to}`}`
      }
      sx={{
        '.MuiTablePagination-toolbar': {
          flexWrap: 'wrap',
          justifyContent: { xs: 'center', sm: 'flex-end' },
          gap: 1,
          px: { xs: 1, sm: 2 },
        },
      }}
    />
  );
}
