import { Fragment, type KeyboardEvent, type ReactNode, useMemo } from 'react';
import {
  Box,
  Button,
  Collapse,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { FileDownloadOutlined } from '@mui/icons-material';
import { useTheme, type Breakpoint } from '@mui/material/styles';
import { useHorizontalOverflow } from '../../hooks/use-horizontal-overflow';
import { getOverflowFadeSx } from '../../styles/overflow-fade';
import { buildCsv, downloadCsv } from '../../utils/csv';
import AppTablePagination from '../app-table-pagination';
import EmptyState from '../feedback/empty-state';

const SKELETON_ROWS = 6;

/** Oculta visualmente, mas mantém o texto disponível para leitores de tela. */
const visuallyHidden = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: '-1px',
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px',
} as const;

/**
 * Papel da coluna na visão mobile (cartão):
 * - `eyebrow`: texto pequeno acima do título (ex.: código);
 * - `title`: destaque principal do cartão (padrão: primeira coluna);
 * - `badge`: chips de status exibidos abaixo do título;
 * - `aside`: destaque à direita do título (ex.: valor);
 * - `field`: par "rótulo: valor" (padrão); é omitido quando a célula
 *   retorna `null`, `undefined`, `false` ou string vazia;
 * - `actions`: rodapé do cartão com botões de ação;
 * - `hidden`: não aparece no cartão.
 */
export type DataTableMobileRole =
  | 'eyebrow'
  | 'title'
  | 'badge'
  | 'aside'
  | 'field'
  | 'actions'
  | 'hidden';

export interface DataTableColumn<TRow> {
  id: string;
  header: string;
  cell: (row: TRow) => ReactNode;
  align?: 'left' | 'center' | 'right';
  mobile?: DataTableMobileRole;
  /** Evita quebra de linha no desktop (ex.: datas e identificadores). */
  nowrap?: boolean;
  /**
   * Valor em texto simples usado na exportação CSV. Colunas sem `exportValue`
   * (ex.: ações) não entram no arquivo. Números são exportados com vírgula
   * decimal; valores monetários devem ser convertidos para reais antes.
   */
  exportValue?: (row: TRow) => string | number | null | undefined;
}

export interface DataTablePagination {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

interface ResponsiveDataTableProps<TRow> {
  rows: readonly TRow[];
  columns: readonly DataTableColumn<TRow>[];
  getRowId: (row: TRow) => string | number;
  ariaLabel: string;
  emptyMessage: string;
  isLoading?: boolean;
  onRowClick?: (row: TRow) => void;
  /** Quando informado, exibe somente as colunas com esses ids. */
  visibleColumnIds?: readonly string[];
  pagination?: DataTablePagination;
  /** Conteúdo exibido acima da tabela apenas no desktop (ex.: seletor de colunas). */
  toolbar?: ReactNode;
  /**
   * Nome do arquivo CSV. Quando informado e houver ao menos uma coluna com
   * `exportValue`, exibe o botão "Exportar CSV" (linhas da página atual).
   */
  exportFileName?: string;
  /** Largura mínima da tabela antes de ativar a rolagem horizontal. */
  minTableWidth?: number;
  /**
   * Detalhe expansível por linha. O controle que alterna `isExpanded` fica a
   * cargo da página (normalmente um botão em uma coluna); o componente apenas
   * exibe `render` abaixo da linha/cartão enquanto `isExpanded` for verdadeiro.
   */
  expandedRow?: {
    isExpanded: (row: TRow) => boolean;
    render: (row: TRow) => ReactNode;
  };
  /** Abaixo deste breakpoint a tabela vira lista de cartões. */
  cardsBelow?: Extract<Breakpoint, 'sm' | 'md' | 'lg'>;
}

function activateOnKeyboard(onActivate: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  };
}

export default function ResponsiveDataTable<TRow>({
  rows,
  columns,
  getRowId,
  ariaLabel,
  emptyMessage,
  isLoading = false,
  onRowClick,
  visibleColumnIds,
  pagination,
  toolbar,
  exportFileName,
  minTableWidth,
  expandedRow,
  cardsBelow = 'md',
}: ResponsiveDataTableProps<TRow>) {
  const theme = useTheme();
  const isCardLayout = useMediaQuery(theme.breakpoints.down(cardsBelow));
  const { ref: scrollRef, overflow } = useHorizontalOverflow<HTMLDivElement>();

  const visibleColumns = useMemo(
    () =>
      visibleColumnIds
        ? columns.filter((column) => visibleColumnIds.includes(column.id))
        : columns,
    [columns, visibleColumnIds],
  );

  const canExport =
    Boolean(exportFileName) && columns.some((column) => column.exportValue);

  const handleExport = () => {
    if (!exportFileName) {
      return;
    }

    downloadCsv(
      exportFileName,
      buildCsv(rows, isCardLayout ? columns : visibleColumns),
    );
  };

  const exportButton = canExport ? (
    <Button
      size="small"
      variant="text"
      startIcon={<FileDownloadOutlined fontSize="small" />}
      onClick={handleExport}
      disabled={isLoading || rows.length === 0}
    >
      Exportar CSV
    </Button>
  ) : null;

  const content = isCardLayout ? (
    <>
      {exportButton ? (
        <Stack
          direction="row"
          justifyContent="flex-end"
          sx={{ px: 2, py: 0.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {exportButton}
        </Stack>
      ) : null}
      <CardList
        rows={rows}
        columns={columns}
        getRowId={getRowId}
        ariaLabel={ariaLabel}
        emptyMessage={emptyMessage}
        isLoading={isLoading}
        onRowClick={onRowClick}
        expandedRow={expandedRow}
      />
    </>
  ) : (
    <>
      {toolbar || exportButton ? (
        <Stack
          direction="row"
          justifyContent="flex-end"
          alignItems="center"
          spacing={1}
          sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}
        >
          {exportButton}
          {toolbar}
        </Stack>
      ) : null}
      {/* Sombras nas bordas indicam colunas escondidas além da área visível. */}
      <Box sx={getOverflowFadeSx(overflow)}>
        <TableContainer ref={scrollRef}>
          <Table
            aria-label={ariaLabel}
            sx={minTableWidth ? { minWidth: minTableWidth } : undefined}
          >
            <TableHead>
              <TableRow>
                {visibleColumns.map((column) => (
                  <TableCell key={column.id} align={column.align}>
                    {column.header || (
                      <Box component="span" sx={visuallyHidden}>
                        Detalhes
                      </Box>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`} aria-busy="true">
                    {visibleColumns.map((column) => (
                      <TableCell key={column.id} align={column.align}>
                        <Skeleton
                          variant="text"
                          width={column.align === 'right' ? '60%' : '80%'}
                          sx={{
                            ml: column.align === 'right' ? 'auto' : 0,
                            fontSize: '1rem',
                          }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length > 0 ? (
                rows.map((row) => (
                  <Fragment key={getRowId(row)}>
                    <TableRow
                      hover={Boolean(onRowClick)}
                      tabIndex={onRowClick ? 0 : undefined}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                      onKeyDown={
                        onRowClick
                          ? activateOnKeyboard(() => onRowClick(row))
                          : undefined
                      }
                      sx={{
                        cursor: onRowClick ? 'pointer' : 'default',
                        '&:last-child td, &:last-child th': { border: 0 },
                      }}
                    >
                      {visibleColumns.map((column) => (
                        <TableCell
                          key={column.id}
                          align={column.align}
                          sx={
                            column.nowrap ? { whiteSpace: 'nowrap' } : undefined
                          }
                        >
                          {column.cell(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expandedRow ? (
                      <TableRow>
                        <TableCell
                          colSpan={visibleColumns.length}
                          sx={{ p: 0, borderBottom: 0 }}
                        >
                          <Collapse
                            in={expandedRow.isExpanded(row)}
                            timeout="auto"
                            unmountOnExit
                          >
                            {expandedRow.render(row)}
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length} sx={{ p: 0 }}>
                    <EmptyState message={emptyMessage} />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      {content}
      {pagination ? (
        <AppTablePagination
          count={pagination.count}
          page={pagination.page}
          rowsPerPage={pagination.rowsPerPage}
          onPageChange={(_event, newPage) => pagination.onPageChange(newPage)}
          onRowsPerPageChange={(event) =>
            pagination.onRowsPerPageChange(Number(event.target.value))
          }
        />
      ) : null}
    </Paper>
  );
}

type CardListProps<TRow> = Pick<
  ResponsiveDataTableProps<TRow>,
  | 'rows'
  | 'columns'
  | 'getRowId'
  | 'ariaLabel'
  | 'emptyMessage'
  | 'isLoading'
  | 'onRowClick'
  | 'expandedRow'
>;

function CardList<TRow>({
  rows,
  columns,
  getRowId,
  ariaLabel,
  emptyMessage,
  isLoading,
  onRowClick,
  expandedRow,
}: CardListProps<TRow>) {
  if (isLoading) {
    return (
      <Stack divider={<Divider flexItem />} aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => (
          <Stack key={index} spacing={1} sx={{ px: 2, py: 2 }}>
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="60%" sx={{ fontSize: '1.25rem' }} />
            <Skeleton variant="rounded" height={56} />
          </Stack>
        ))}
      </Stack>
    );
  }

  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const explicitTitle = columns.find((column) => column.mobile === 'title');
  const titleColumn =
    explicitTitle ??
    columns.find((column) => (column.mobile ?? 'field') === 'field');
  const roleOf = (column: DataTableColumn<TRow>): DataTableMobileRole =>
    column === titleColumn ? 'title' : (column.mobile ?? 'field');
  const byRole = (role: DataTableMobileRole) =>
    columns.filter((column) => roleOf(column) === role);

  const eyebrowColumns = byRole('eyebrow');
  const badgeColumns = byRole('badge');
  const asideColumns = byRole('aside');
  const fieldColumns = byRole('field');
  const actionColumns = byRole('actions');
  // Traços usados como "sem valor" na tabela também somem do cartão.
  const isEmptyNode = (node: ReactNode) =>
    node === null ||
    node === undefined ||
    node === false ||
    node === '' ||
    node === '-' ||
    node === '—';

  return (
    <Stack divider={<Divider flexItem />} role="list" aria-label={ariaLabel}>
      {rows.map((row) => (
        <Box
          key={getRowId(row)}
          role="listitem"
          tabIndex={onRowClick ? 0 : undefined}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          onKeyDown={
            onRowClick ? activateOnKeyboard(() => onRowClick(row)) : undefined
          }
          sx={{
            px: 2,
            py: 2,
            cursor: onRowClick ? 'pointer' : 'default',
            '&:active': onRowClick ? { bgcolor: 'action.selected' } : undefined,
          }}
        >
          <Stack spacing={1.25}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={1.5}
            >
              <Box sx={{ minWidth: 0 }}>
                {eyebrowColumns.map((column) => (
                  <Typography
                    key={column.id}
                    variant="caption"
                    color="text.secondary"
                    component="div"
                  >
                    {column.cell(row)}
                  </Typography>
                ))}
                {titleColumn ? (
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    component="div"
                    sx={{ overflowWrap: 'anywhere' }}
                  >
                    {titleColumn.cell(row)}
                  </Typography>
                ) : null}
                {badgeColumns.length > 0 ? (
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    flexWrap="wrap"
                    sx={{ mt: 0.75 }}
                  >
                    {badgeColumns.map((column) => (
                      <Fragment key={column.id}>{column.cell(row)}</Fragment>
                    ))}
                  </Stack>
                ) : null}
              </Box>
              {asideColumns.length > 0 ? (
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  {asideColumns.map((column) => (
                    <Box key={column.id}>{column.cell(row)}</Box>
                  ))}
                </Box>
              ) : null}
            </Stack>

            {fieldColumns.length > 0 ? (
              <Stack spacing={0.75}>
                {fieldColumns.map((column) => {
                  const value = column.cell(row);

                  if (isEmptyNode(value)) {
                    return null;
                  }

                  return (
                    <Stack
                      key={column.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={2}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {column.header}
                      </Typography>
                      <Typography
                        variant="body2"
                        component="div"
                        sx={{ textAlign: 'right', overflowWrap: 'anywhere' }}
                      >
                        {value}
                      </Typography>
                    </Stack>
                  );
                })}
              </Stack>
            ) : null}

            {actionColumns.length > 0 ? (
              <Stack
                direction="row"
                justifyContent="flex-end"
                alignItems="center"
                spacing={1}
                useFlexGap
                flexWrap="wrap"
              >
                {actionColumns.map((column) => (
                  <Fragment key={column.id}>{column.cell(row)}</Fragment>
                ))}
              </Stack>
            ) : null}
            {expandedRow ? (
              <Collapse
                in={expandedRow.isExpanded(row)}
                timeout="auto"
                unmountOnExit
              >
                {expandedRow.render(row)}
              </Collapse>
            ) : null}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
