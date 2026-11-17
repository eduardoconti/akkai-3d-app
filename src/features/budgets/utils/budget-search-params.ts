import { ALL_STATUSES_ORCAMENTO } from '@/features/budgets/types/budget-form';
import type { StatusOrcamento } from '@/shared/lib/types/domain';

/**
 * Lê `?status=PENDENTE,APROVADO` (links das notificações). Ignora valores
 * desconhecidos; devolve `null` quando não sobra nenhum status válido.
 */
export function parseBudgetStatusParam(
  value: string | null,
): StatusOrcamento[] | null {
  if (!value) {
    return null;
  }

  const status = value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is StatusOrcamento =>
      ALL_STATUSES_ORCAMENTO.includes(item as StatusOrcamento),
    );

  return status.length > 0 ? Array.from(new Set(status)) : null;
}
