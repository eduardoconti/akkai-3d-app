import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProblemDetails } from '../lib/types/problem-details';

interface UseFormDialogOptions<T> {
  open: boolean;
  initialValues: T;
  onReset?: () => void;
}

interface UseFormDialogReturn<T, E extends Record<string, string | undefined>> {
  form: T;
  setForm: React.Dispatch<React.SetStateAction<T>>;
  problem: ProblemDetails | null;
  setProblem: React.Dispatch<React.SetStateAction<ProblemDetails | null>>;
  localErrors: E;
  setLocalErrors: React.Dispatch<React.SetStateAction<E>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  resetForm: () => void;
}

export function useFormDialog<
  T,
  E extends Record<string, string | undefined> = Record<string, string | undefined>,
>({
  open,
  initialValues,
  onReset,
}: UseFormDialogOptions<T>): UseFormDialogReturn<T, E> {
  const [form, setForm] = useState<T>(initialValues);
  const [problem, setProblem] = useState<ProblemDetails | null>(null);
  const [localErrors, setLocalErrors] = useState<E>({} as E);
  const [isSaving, setIsSaving] = useState(false);

  const initialValuesRef = useRef(initialValues);
  const onResetRef = useRef(onReset);
  initialValuesRef.current = initialValues;
  onResetRef.current = onReset;

  const resetForm = useCallback(() => {
    setForm(initialValuesRef.current);
    setProblem(null);
    setLocalErrors({} as E);
    setIsSaving(false);
    onResetRef.current?.();
  }, []);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  return {
    form,
    setForm,
    problem,
    setProblem,
    localErrors,
    setLocalErrors,
    isSaving,
    setIsSaving,
    resetForm,
  };
}
