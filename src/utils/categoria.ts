export interface Categoria {
  id: number;
  nome: string;
  idAscendente: number | null;
}

// Função para gerar o nome com o caminho completo (Recursiva)
const getCaminhoCategoria = (cat: Categoria, todas: Categoria[]): string => {
  if (!cat.idAscendente) return cat.nome;
  const pai = todas.find((c) => c.id === cat.idAscendente);
  if (!pai) return cat.nome;
  return `${getCaminhoCategoria(pai, todas)} > ${cat.nome}`;
};

// Organiza as categorias para o Select
const formatarCategorias = (lista: Categoria[]) => {
  return lista
    .map((cat) => ({
      id: cat.id,
      label: getCaminhoCategoria(cat, lista),
    }))
    .sort((a, b) => a.label.localeCompare(b.label)); // Ordena alfabeticamente pelo caminho
};

export { formatarCategorias, getCaminhoCategoria };
