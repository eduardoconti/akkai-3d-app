import { describe, expect, it } from 'vitest';
import { parseProductListParams } from './product-search-params';

describe('parseProductListParams', () => {
  it('lê ordenação, direção e termo da URL', () => {
    expect(
      parseProductListParams(
        new URLSearchParams('ordenarPor=nivelEstoque&direcao=asc&termo=Dragão'),
      ),
    ).toEqual({ ordenarPor: 'nivelEstoque', direcao: 'asc', termo: 'Dragão' });
  });

  it('usa direção crescente e termo vazio por padrão', () => {
    expect(
      parseProductListParams(
        new URLSearchParams('ordenarPor=nome&direcao=lado'),
      ),
    ).toEqual({ ordenarPor: 'nome', direcao: 'asc', termo: '' });
  });

  it('devolve null sem ordenação válida', () => {
    expect(parseProductListParams(new URLSearchParams())).toBeNull();
    expect(
      parseProductListParams(new URLSearchParams('ordenarPor=preco')),
    ).toBeNull();
  });
});
