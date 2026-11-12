export interface FilterOption<TValue extends string> {
  value: TValue;
  label: string;
}

function joinLabels(labels: readonly string[]): string {
  if (labels.length <= 1) {
    return labels.join('');
  }

  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}

/** Quantas opções excluídas ainda cabem no resumo "Todas, exceto …". */
const MAX_EXCLUDED_IN_SUMMARY = 2;
/** Quantas opções selecionadas ainda são listadas pelo nome. */
const MAX_NAMED_IN_SUMMARY = 2;

/**
 * Resume em texto curto uma seleção múltipla, para caber numa linha do filtro
 * em vez de uma fileira de chips (ex.: "Todas, exceto venda", "Compra e
 * Ajuste", "4 origens").
 */
export function summarizeSelection<TValue extends string>(
  selected: readonly TValue[],
  options: readonly FilterOption<TValue>[],
  pluralNoun: string,
  /** "Todas" ou "Todos", conforme o gênero do que está sendo filtrado. */
  allLabel: 'Todas' | 'Todos' = 'Todas',
): string {
  if (selected.length === 0) {
    return '';
  }

  if (selected.length === options.length) {
    return allLabel;
  }

  const labelOf = (value: TValue) =>
    options.find((option) => option.value === value)?.label ?? value;
  const excluded = options.filter((option) => !selected.includes(option.value));

  if (excluded.length <= MAX_EXCLUDED_IN_SUMMARY) {
    return `${allLabel}, exceto ${joinLabels(
      excluded.map((option) => option.label.toLowerCase()),
    )}`;
  }

  if (selected.length <= MAX_NAMED_IN_SUMMARY) {
    return joinLabels(selected.map(labelOf));
  }

  return `${selected.length} ${pluralNoun}`;
}
