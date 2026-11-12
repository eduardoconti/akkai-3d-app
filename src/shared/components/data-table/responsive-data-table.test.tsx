import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockMatchMedia } from '@/test/setup';
import { downloadCsv } from '../../utils/csv';
import ResponsiveDataTable, {
  type DataTableColumn,
} from './responsive-data-table';

vi.mock('../../utils/csv', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/csv')>()),
  downloadCsv: vi.fn(),
}));

interface Produto {
  id: number;
  nome: string;
  codigo: number;
  valor: number;
}

const produtos: Produto[] = [
  { id: 1, nome: 'Caneca', codigo: 101, valor: 2500 },
  { id: 2, nome: 'Vaso', codigo: 102, valor: 4000 },
];

const colunas: DataTableColumn<Produto>[] = [
  {
    id: 'nome',
    header: 'Nome',
    mobile: 'title',
    cell: (produto) => produto.nome,
    exportValue: (produto) => produto.nome,
  },
  {
    id: 'codigo',
    header: 'Código',
    mobile: 'eyebrow',
    cell: (produto) => produto.codigo,
    exportValue: (produto) => produto.codigo,
  },
  {
    id: 'valor',
    header: 'Valor',
    align: 'right',
    cell: (produto) => `R$ ${produto.valor / 100}`,
  },
];

function renderizar(
  props: Partial<
    React.ComponentProps<typeof ResponsiveDataTable<Produto>>
  > = {},
) {
  return render(
    <ResponsiveDataTable
      rows={produtos}
      columns={colunas}
      getRowId={(produto) => produto.id}
      ariaLabel="produtos"
      emptyMessage="Nenhum produto."
      {...props}
    />,
  );
}

describe('ResponsiveDataTable', () => {
  describe('no desktop', () => {
    it('mostra uma tabela com cabeçalhos e linhas', () => {
      mockMatchMedia(false);
      renderizar();

      const tabela = screen.getByRole('table', { name: 'produtos' });

      expect(within(tabela).getByText('Nome')).toBeInTheDocument();
      expect(within(tabela).getByText('Caneca')).toBeInTheDocument();
      expect(within(tabela).getAllByRole('row')).toHaveLength(3);
    });

    it('mostra apenas as colunas visíveis', () => {
      mockMatchMedia(false);
      renderizar({ visibleColumnIds: ['nome'] });

      expect(screen.queryByText('Valor')).not.toBeInTheDocument();
      expect(screen.getByText('Nome')).toBeInTheDocument();
    });

    it('mostra a mensagem de lista vazia', () => {
      mockMatchMedia(false);
      renderizar({ rows: [] });

      expect(screen.getByText('Nenhum produto.')).toBeInTheDocument();
    });

    it('mostra esqueletos enquanto carrega, sem as linhas reais', () => {
      mockMatchMedia(false);
      renderizar({ isLoading: true });

      expect(screen.queryByText('Caneca')).not.toBeInTheDocument();
      expect(screen.queryByText('Nenhum produto.')).not.toBeInTheDocument();
    });

    it('abre a linha ao clicar e também pelo teclado', () => {
      mockMatchMedia(false);
      const aoClicar = vi.fn();
      renderizar({ onRowClick: aoClicar });

      const linha = screen.getByText('Caneca').closest('tr')!;
      fireEvent.click(linha);
      fireEvent.keyDown(linha, { key: 'Enter' });

      expect(aoClicar).toHaveBeenCalledTimes(2);
      expect(aoClicar).toHaveBeenCalledWith(produtos[0]);
    });
  });

  describe('no celular', () => {
    it('mostra cartões em vez de tabela', () => {
      mockMatchMedia(true);
      renderizar();

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getByText('Caneca')).toBeInTheDocument();
    });

    it('trata traços ("-" e "—") como vazio no cartão', () => {
      mockMatchMedia(true);
      renderizar({
        columns: [
          ...colunas,
          {
            id: 'desconto',
            header: 'Desconto',
            cell: (produto) => (produto.id === 1 ? 'R$ 5' : '-'),
          },
          {
            id: 'feira',
            header: 'Feira',
            cell: () => '—',
          },
        ],
      });

      expect(screen.getAllByText('Desconto')).toHaveLength(1);
      expect(screen.queryByText('Feira')).not.toBeInTheDocument();
    });

    it('omite campos vazios do cartão', () => {
      mockMatchMedia(true);
      renderizar({
        columns: [
          ...colunas,
          {
            id: 'obs',
            header: 'Observação',
            cell: (produto) => (produto.id === 1 ? 'Frágil' : null),
          },
        ],
      });

      expect(screen.getAllByText('Observação')).toHaveLength(1);
      expect(screen.getByText('Frágil')).toBeInTheDocument();
    });
  });

  describe('linha expansível', () => {
    it('mostra o detalhe somente da linha expandida', () => {
      mockMatchMedia(false);
      renderizar({
        expandedRow: {
          isExpanded: (produto) => produto.id === 2,
          render: (produto) => <span>Detalhe de {produto.nome}</span>,
        },
      });

      expect(screen.getByText('Detalhe de Vaso')).toBeInTheDocument();
      expect(screen.queryByText('Detalhe de Caneca')).not.toBeInTheDocument();
    });
  });

  describe('paginação', () => {
    it('avisa a página escolhida (0-based)', () => {
      mockMatchMedia(false);
      const aoMudarPagina = vi.fn();
      renderizar({
        pagination: {
          count: 100,
          page: 0,
          rowsPerPage: 25,
          onPageChange: aoMudarPagina,
          onRowsPerPageChange: vi.fn(),
        },
      });

      fireEvent.click(
        screen.getByRole('button', { name: /próxima página|next page/i }),
      );

      expect(aoMudarPagina).toHaveBeenCalledWith(1);
    });
  });

  describe('exportação', () => {
    it('só mostra o botão quando há nome de arquivo e colunas exportáveis', () => {
      mockMatchMedia(false);
      const { unmount } = renderizar();
      expect(
        screen.queryByRole('button', { name: /exportar csv/i }),
      ).not.toBeInTheDocument();
      unmount();

      renderizar({ exportFileName: 'produtos' });
      expect(
        screen.getByRole('button', { name: /exportar csv/i }),
      ).toBeEnabled();
    });

    it('baixa um CSV com as linhas e colunas exportáveis', () => {
      mockMatchMedia(false);
      renderizar({ exportFileName: 'produtos' });

      fireEvent.click(screen.getByRole('button', { name: /exportar csv/i }));

      expect(downloadCsv).toHaveBeenCalledTimes(1);
      const [nomeArquivo, conteudo] = vi.mocked(downloadCsv).mock.calls[0]!;
      expect(nomeArquivo).toBe('produtos');
      expect(conteudo).toContain('Nome;Código');
      expect(conteudo).toContain('Caneca;101');
      expect(conteudo).not.toContain('Valor');
    });

    it('desabilita a exportação sem linhas', () => {
      mockMatchMedia(false);
      renderizar({ exportFileName: 'produtos', rows: [] });

      expect(
        screen.getByRole('button', { name: /exportar csv/i }),
      ).toBeDisabled();
    });
  });
});
