import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockMatchMedia } from '@/test/setup';
import type { Produto } from '@/shared';
import type { BudgetFormItem } from '@/features/budgets/types/budget-form';
import BudgetProductsSection from './budget-products-section';

const produtos = [
  { id: 1, nome: 'Chaveiro', codigo: 101, valor: 1000 },
  { id: 2, nome: 'Vaso', codigo: 102, valor: 2500 },
] as Produto[];

function Harness({
  initial = [],
  onChange,
}: {
  initial?: BudgetFormItem[];
  onChange?: (itens: BudgetFormItem[]) => void;
}) {
  const [itens, setItens] = useState(initial);

  return (
    <BudgetProductsSection
      itens={itens}
      produtos={produtos}
      isLoadingProdutos={false}
      onChange={(next) => {
        setItens(next);
        onChange?.(next);
      }}
    />
  );
}

describe('BudgetProductsSection', () => {
  it('adiciona uma linha vazia e escolhe o produto', async () => {
    mockMatchMedia(false);
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar produto' }),
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'Produto' }));
    await userEvent.click(
      await screen.findByRole('option', { name: /Chaveiro/ }),
    );

    expect(onChange).toHaveBeenLastCalledWith([
      { idProduto: 1, quantidade: 1 },
    ]);
    expect(screen.getByLabelText('Subtotal de Chaveiro')).toHaveTextContent(
      /10,00/,
    );
  });

  it('altera a quantidade e mostra a soma dos produtos', async () => {
    mockMatchMedia(false);
    render(
      <Harness
        initial={[
          { idProduto: 1, quantidade: 1 },
          { idProduto: 2, quantidade: 1 },
        ]}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Aumentar quantidade de Chaveiro' }),
    );

    expect(screen.getByLabelText('Quantidade de Chaveiro')).toHaveValue(2);
    expect(screen.getByText(/Soma dos produtos:/)).toHaveTextContent(/45,00/);
  });

  it('não deixa a quantidade ficar abaixo de 1', async () => {
    mockMatchMedia(false);
    render(<Harness initial={[{ idProduto: 1, quantidade: 1 }]} />);

    expect(
      screen.getByRole('button', { name: 'Diminuir quantidade de Chaveiro' }),
    ).toBeDisabled();
  });

  it('remove um produto', async () => {
    mockMatchMedia(false);
    const onChange = vi.fn();
    render(
      <Harness
        initial={[
          { idProduto: 1, quantidade: 1 },
          { idProduto: 2, quantidade: 3 },
        ]}
        onChange={onChange}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Remover Chaveiro do orçamento' }),
    );

    expect(onChange).toHaveBeenLastCalledWith([
      { idProduto: 2, quantidade: 3 },
    ]);
  });

  it('limita a 12 produtos', () => {
    mockMatchMedia(false);
    render(
      <Harness
        initial={Array.from({ length: 12 }, () => ({
          idProduto: null,
          quantidade: 1,
        }))}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Adicionar produto' }),
    ).toBeDisabled();
  });

  it('mostra erros de validação por linha', () => {
    mockMatchMedia(false);
    render(
      <BudgetProductsSection
        itens={[{ idProduto: null, quantidade: 1 }]}
        produtos={produtos}
        isLoadingProdutos={false}
        errors={{ rows: [{ idProduto: 'Selecione o produto.' }] }}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Selecione o produto.')).toBeInTheDocument();
  });

  it('bloqueia a edição quando desabilitada (orçamento finalizado)', () => {
    mockMatchMedia(false);
    render(
      <BudgetProductsSection
        itens={[{ idProduto: 1, quantidade: 2 }]}
        produtos={produtos}
        isLoadingProdutos={false}
        disabled
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Adicionar produto' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Remover Chaveiro do orçamento' }),
    ).toBeDisabled();
  });
});
