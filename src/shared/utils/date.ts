export type LocalDateFormat = 'input' | 'api-date-time' | 'display-date';

const APP_TIMEZONE_OFFSET = '-03:00';

function getDateParts(value?: Date | string | null): {
  year: string;
  month: string;
  day: string;
} {
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

    if (match) {
      return {
        year: match[1]!,
        month: match[2]!,
        day: match[3]!,
      };
    }
  }

  const date = value instanceof Date ? value : new Date();

  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
  };
}

export function formatLocalDate(
  value?: Date | string | null,
  format: LocalDateFormat = 'input',
): string {
  const { year, month, day } = getDateParts(value);

  if (format === 'api-date-time') {
    return `${year}-${month}-${day}T00:00:00${APP_TIMEZONE_OFFSET}`;
  }

  if (format === 'display-date') {
    return `${day}/${month}/${year}`;
  }

  return `${year}-${month}-${day}`;
}
