import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useHorizontalOverflow } from './use-horizontal-overflow';

function Harness() {
  const { ref, overflow } = useHorizontalOverflow<HTMLDivElement>();

  return (
    <div ref={ref} data-testid="area">
      {overflow.start ? 'inicio' : ''}|{overflow.end ? 'fim' : ''}
    </div>
  );
}

/** jsdom não calcula layout: definimos as medidas de rolagem à mão. */
function setScrollMetrics(
  element: HTMLElement,
  metrics: { scrollWidth: number; clientWidth: number; scrollLeft: number },
) {
  Object.defineProperty(element, 'scrollWidth', {
    configurable: true,
    value: metrics.scrollWidth,
  });
  Object.defineProperty(element, 'clientWidth', {
    configurable: true,
    value: metrics.clientWidth,
  });
  element.scrollLeft = metrics.scrollLeft;
}

describe('useHorizontalOverflow', () => {
  it('indica conteúdo escondido à direita e, após rolar, também à esquerda', () => {
    render(<Harness />);
    const area = screen.getByTestId('area');

    setScrollMetrics(area, {
      scrollWidth: 800,
      clientWidth: 300,
      scrollLeft: 0,
    });
    act(() => {
      fireEvent.scroll(area);
    });
    expect(area).toHaveTextContent('|fim');

    setScrollMetrics(area, {
      scrollWidth: 800,
      clientWidth: 300,
      scrollLeft: 200,
    });
    act(() => {
      fireEvent.scroll(area);
    });
    expect(area).toHaveTextContent('inicio|fim');

    setScrollMetrics(area, {
      scrollWidth: 800,
      clientWidth: 300,
      scrollLeft: 500,
    });
    act(() => {
      fireEvent.scroll(area);
    });
    expect(area).toHaveTextContent('inicio|');
  });

  it('não indica nada quando o conteúdo cabe', () => {
    render(<Harness />);
    const area = screen.getByTestId('area');

    setScrollMetrics(area, {
      scrollWidth: 300,
      clientWidth: 300,
      scrollLeft: 0,
    });
    act(() => {
      fireEvent.scroll(area);
    });

    expect(area).toHaveTextContent(/^\|$/);
  });
});
