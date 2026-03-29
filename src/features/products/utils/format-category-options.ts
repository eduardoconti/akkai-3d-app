import type { Categoria } from '@/shared/lib/types/domain';

export interface CategoryOption {
  id: number;
  label: string;
}

function getCategoryPath(category: Categoria, categories: Categoria[]): string {
  if (!category.idAscendente) {
    return category.nome;
  }

  const parent = categories.find((item) => item.id === category.idAscendente);

  if (!parent) {
    return category.nome;
  }

  return `${getCategoryPath(parent, categories)} > ${category.nome}`;
}

export function formatCategoryOptions(categories: Categoria[]): CategoryOption[] {
  return categories
    .map((category) => ({
      id: category.id,
      label: getCategoryPath(category, categories),
    }))
    .sort((first, second) => first.label.localeCompare(second.label));
}
