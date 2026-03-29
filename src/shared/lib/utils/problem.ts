import type { ProblemDetails } from '../types/problem-details';

export function getFieldMessages(
  problem: ProblemDetails | null,
  field: string,
): string[] {
  if (!problem?.errors) {
    return [];
  }

  return problem.errors
    .filter((item) => item.campo === field)
    .flatMap((item) => item.mensagens);
}

export function getFieldMessage(
  problem: ProblemDetails | null,
  field: string,
): string | undefined {
  return getFieldMessages(problem, field)[0];
}
