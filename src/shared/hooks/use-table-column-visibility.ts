import { useCallback, useEffect, useMemo, useState } from 'react';

export interface TableColumnOption<TColumnId extends string> {
  id: TColumnId;
  label: string;
  required?: boolean;
}

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function useTableColumnVisibility<TColumnId extends string>(
  storageKey: string,
  columns: readonly TableColumnOption<TColumnId>[],
  defaultVisibleColumnIds?: readonly TColumnId[],
) {
  const allColumnIds = useMemo(() => columns.map((column) => column.id), [
    columns,
  ]);
  const requiredColumnIds = useMemo(
    () => columns.filter((column) => column.required).map((column) => column.id),
    [columns],
  );
  const defaultColumnIds = useMemo(
    () => defaultVisibleColumnIds ?? allColumnIds,
    [allColumnIds, defaultVisibleColumnIds],
  );

  const normalizeColumnIds = useCallback(
    (columnIds: readonly TColumnId[]) => {
      const allowedColumnIds = new Set(allColumnIds);
      const normalizedColumnIds = columnIds.filter((columnId) =>
        allowedColumnIds.has(columnId),
      );
      const visibleColumnIds = new Set<TColumnId>([
        ...normalizedColumnIds,
        ...requiredColumnIds,
      ]);

      if (visibleColumnIds.size === 0) {
        return [...defaultColumnIds];
      }

      return [...visibleColumnIds];
    },
    [allColumnIds, defaultColumnIds, requiredColumnIds],
  );

  const [visibleColumnIds, setVisibleColumnIds] = useState<TColumnId[]>(() => {
    if (!hasLocalStorage()) {
      return normalizeColumnIds(defaultColumnIds);
    }

    const storedValue = window.localStorage.getItem(storageKey);

    if (!storedValue) {
      return normalizeColumnIds(defaultColumnIds);
    }

    try {
      const parsedValue = JSON.parse(storedValue) as unknown;

      if (Array.isArray(parsedValue)) {
        return normalizeColumnIds(parsedValue as TColumnId[]);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }

    return normalizeColumnIds(defaultColumnIds);
  });

  useEffect(() => {
    setVisibleColumnIds((current) => normalizeColumnIds(current));
  }, [normalizeColumnIds]);

  useEffect(() => {
    if (!hasLocalStorage()) {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(visibleColumnIds));
  }, [storageKey, visibleColumnIds]);

  const visibleColumnIdsSet = useMemo(
    () => new Set<TColumnId>(visibleColumnIds),
    [visibleColumnIds],
  );

  const isColumnVisible = useCallback(
    (columnId: TColumnId) => visibleColumnIdsSet.has(columnId),
    [visibleColumnIdsSet],
  );

  const toggleColumnVisibility = useCallback(
    (columnId: TColumnId) => {
      const column = columns.find((item) => item.id === columnId);

      if (!column || column.required) {
        return;
      }

      setVisibleColumnIds((current) => {
        const currentColumnIds = new Set(normalizeColumnIds(current));

        if (currentColumnIds.has(columnId)) {
          if (currentColumnIds.size <= requiredColumnIds.length) {
            return current;
          }

          currentColumnIds.delete(columnId);
          return [...currentColumnIds];
        }

        return normalizeColumnIds([...currentColumnIds, columnId]);
      });
    },
    [columns, normalizeColumnIds, requiredColumnIds.length],
  );

  const resetColumnVisibility = useCallback(() => {
    setVisibleColumnIds(normalizeColumnIds(defaultColumnIds));
  }, [defaultColumnIds, normalizeColumnIds]);

  return {
    visibleColumnIds,
    isColumnVisible,
    toggleColumnVisibility,
    resetColumnVisibility,
  };
}
