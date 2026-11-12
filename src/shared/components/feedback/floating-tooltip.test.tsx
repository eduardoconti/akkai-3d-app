import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFloatingTooltip } from '../../hooks/use-floating-tooltip';
import FloatingTooltip from './floating-tooltip';

function TooltipHarness() {
  const { tooltip, getTargetProps } = useFloatingTooltip();

  return (
    <>
      <div
        data-testid="alvo"
        {...getTargetProps('itens', {
          title: 'Itens vendidos',
          color: '#0B7FC0',
          lines: [
            { label: 'Catálogo', value: '12' },
            { label: 'Brindes', value: '3' },
          ],
          caption: '15 no total',
        })}
      >
        Itens
      </div>
      <button type="button">Fora</button>
      <FloatingTooltip tooltip={tooltip} />
    </>
  );
}

describe('FloatingTooltip', () => {
  it('abre ao passar o mouse e fecha ao sair', () => {
    render(<TooltipHarness />);
    const alvo = screen.getByTestId('alvo');

    fireEvent.mouseMove(alvo, { clientX: 100, clientY: 80 });

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Itens vendidos');
    expect(tooltip).toHaveTextContent('Catálogo12');
    expect(tooltip).toHaveTextContent('Brindes3');
    expect(tooltip).toHaveTextContent('15 no total');

    fireEvent.mouseLeave(alvo);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('abre ao tocar no alvo e fecha ao tocar fora', () => {
    render(<TooltipHarness />);

    fireEvent.click(screen.getByTestId('alvo'), { clientX: 40, clientY: 40 });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('fecha ao rolar a página', () => {
    render(<TooltipHarness />);

    fireEvent.click(screen.getByTestId('alvo'));
    fireEvent.scroll(window);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('abre pelo foco do teclado, descreve o alvo e fecha com Esc', () => {
    render(<TooltipHarness />);
    const alvo = screen.getByTestId('alvo');

    expect(alvo).toHaveAttribute('tabindex', '0');

    fireEvent.focus(alvo);

    const tooltip = screen.getByRole('tooltip');
    expect(alvo).toHaveAttribute('aria-describedby', tooltip.id);

    fireEvent.keyDown(alvo, { key: 'Escape' });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(alvo).not.toHaveAttribute('aria-describedby');
  });

  it('fecha ao perder o foco', () => {
    render(<TooltipHarness />);
    const alvo = screen.getByTestId('alvo');

    fireEvent.focus(alvo);
    fireEvent.blur(alvo);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('abre à esquerda do ponteiro perto da borda direita da tela', () => {
    render(<TooltipHarness />);

    fireEvent.mouseMove(screen.getByTestId('alvo'), {
      clientX: window.innerWidth - 10,
      clientY: 50,
    });

    expect(getComputedStyle(screen.getByRole('tooltip')).transform).toContain(
      'calc(-100% - 12px)',
    );
  });
});
