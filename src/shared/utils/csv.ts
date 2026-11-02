export type CsvValue = string | number | null | undefined;

export interface CsvColumn<TRow> {
  header: string;
  /** Colunas sem `exportValue` não entram no CSV. */
  exportValue?: (row: TRow) => CsvValue;
}

const CSV_SEPARATOR = ';';
const CSV_LINE_BREAK = '\r\n';
const CSV_BOM = '﻿';
const NUMERIC_TEXT_PATTERN = /^-?\d+([.,]\d+)?$/;
const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

/**
 * Converte um valor monetário em centavos (inteiro, como o app armazena) para
 * texto em reais com 2 casas e vírgula decimal (ex.: `12345` -> `"123,45"`).
 */
export function formatCentsForCsv(
  cents: number | null | undefined,
): string | null {
  if (cents == null || !Number.isFinite(cents)) {
    return null;
  }

  return (cents / 100).toFixed(2).replace('.', ',');
}

function serializeValue(value: CsvValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value).replace('.', ',') : '';
  }

  // Evita que o Excel interprete texto como fórmula (CSV injection).
  const text =
    FORMULA_PREFIX_PATTERN.test(value) && !NUMERIC_TEXT_PATTERN.test(value)
      ? `'${value}`
      : value;

  if (/[;"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function serializeLine(values: readonly CsvValue[]): string {
  return values.map(serializeValue).join(CSV_SEPARATOR);
}

/**
 * Gera o conteúdo CSV (separador `;`, BOM UTF-8, quebras CRLF) com as colunas
 * que possuem `exportValue`, usando `header` como cabeçalho.
 */
export function buildCsv<TRow>(
  rows: readonly TRow[],
  columns: readonly CsvColumn<TRow>[],
): string {
  const exportColumns = columns.filter((column) => column.exportValue);

  const lines = [
    serializeLine(exportColumns.map((column) => column.header)),
    ...rows.map((row) =>
      serializeLine(exportColumns.map((column) => column.exportValue!(row))),
    ),
  ];

  return `${CSV_BOM}${lines.join(CSV_LINE_BREAK)}${CSV_LINE_BREAK}`;
}

export function downloadCsv(fileName: string, content: string): void {
  const normalizedFileName = fileName.toLowerCase().endsWith('.csv')
    ? fileName
    : `${fileName}.csv`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = normalizedFileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
