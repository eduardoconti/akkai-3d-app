import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode, SetStateAction } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import type { ProblemDetails } from '../lib/types/problem-details';

interface UseFormDialogOptions<T> {
  open: boolean;
  initialValues: T;
  onReset?: () => void;
}

interface UseFormDialogReturn<T, E extends object> {
  form: T;
  setForm: (value: SetStateAction<T>) => void;
  setInitialForm: (value: T) => void;
  problem: ProblemDetails | null;
  setProblem: (value: SetStateAction<ProblemDetails | null>) => void;
  localErrors: E;
  setLocalErrors: (value: SetStateAction<E>) => void;
  isSaving: boolean;
  setIsSaving: (value: SetStateAction<boolean>) => void;
  isDirty: boolean;
  requestClose: (close: () => void) => void;
  resetForm: () => void;
  discardChangesDialog: ReactNode;
}

function areEqualValues<T>(first: T, second: T): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

export function useFormDialog<
  T,
  E extends object = Record<string, string | undefined>,
>({
  open,
  initialValues,
  onReset,
}: UseFormDialogOptions<T>): UseFormDialogReturn<T, E> {
  const [form, setFormState] = useState<T>(initialValues);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<E>({} as E);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const initialValuesRef = useRef(initialValues);
  const cleanValuesRef = useRef(initialValues);
  const onResetRef = useRef(onReset);
  const closeRef = useRef<(() => void) | null>(null);
  initialValuesRef.current = initialValues;
  onResetRef.current = onReset;

  const setInitialForm = useCallback((value: T) => {
    cleanValuesRef.current = value;
    setFormState(value);
    setIsDirty(false);
  }, []);

  const setForm = useCallback((value: SetStateAction<T>) => {
    setFormState((current) => {
      const nextValue =
        typeof value === 'function'
          ? (value as (currentValue: T) => T)(current)
          : value;

      setIsDirty(!areEqualValues(nextValue, cleanValuesRef.current));
      return nextValue;
    });
  }, []);

  const resetForm = useCallback(() => {
    cleanValuesRef.current = initialValuesRef.current;
    setFormState(initialValuesRef.current);
    setProblem(null);
    setLocalErrors({} as E);
    setIsSaving(false);
    setIsDirty(false);
    setIsDiscardConfirmOpen(false);
    closeRef.current = null;
    onResetRef.current?.();
  }, []);

  const requestClose = useCallback(
    (close: () => void) => {
      if (!isDirty) {
        close();
        return;
      }

      closeRef.current = close;
      setIsDiscardConfirmOpen(true);
    },
    [isDirty],
  );

  useEffect(() => {
    if (!open) {
      setIsDiscardConfirmOpen(false);
    }
  }, [open]);

  return {
    form,
    setForm,
    problem,
    setProblem,
    localErrors,
    setLocalErrors,
    isSaving,
    setIsSaving,
    isDirty,
    setInitialForm,
    requestClose,
    resetForm,
    discardChangesDialog: createElement(
      Dialog,
      {
        open: isDiscardConfirmOpen,
        onClose: () => setIsDiscardConfirmOpen(false),
        fullWidth: true,
        maxWidth: 'xs',
      },
      createElement(DialogTitle, null, 'Descartar alterações?'),
      createElement(
        DialogContent,
        null,
        createElement(
          Typography,
          { color: 'text.secondary' },
          'As informações preenchidas serão descartadas.',
        ),
      ),
      createElement(
        DialogActions,
        { sx: { px: 3, pb: 2 } },
        createElement(
          Button,
          {
            color: 'inherit',
            onClick: () => setIsDiscardConfirmOpen(false),
          },
          'Continuar editando',
        ),
        createElement(
          Button,
          {
            color: 'error',
            onClick: () => {
              setIsDiscardConfirmOpen(false);
              closeRef.current?.();
              closeRef.current = null;
            },
          },
          'Descartar',
        ),
      ),
    ),
  };
}
