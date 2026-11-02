import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePageTitle } from './use-page-title';

function Pagina({ titulo }: { titulo: string }) {
  usePageTitle(titulo);
  return null;
}

describe('usePageTitle', () => {
  it('define o título da aba com o nome do app', () => {
    render(<Pagina titulo="Vendas" />);

    expect(document.title).toBe('Vendas · AKKAI 3D');
  });

  it('atualiza quando o título muda', () => {
    const { rerender } = render(<Pagina titulo="Vendas" />);
    rerender(<Pagina titulo="Produtos" />);

    expect(document.title).toBe('Produtos · AKKAI 3D');
  });

  it('volta ao nome do app ao desmontar', () => {
    const { unmount } = render(<Pagina titulo="Vendas" />);
    unmount();

    expect(document.title).toBe('AKKAI 3D');
  });
});
