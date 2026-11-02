import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGlobalShortcuts } from './use-global-shortcuts';

function Atalhos(props: { onSearch: () => void; onNewSale: () => void }) {
  useGlobalShortcuts(props);
  return <input aria-label="campo" />;
}

function montar() {
  const onSearch = vi.fn();
  const onNewSale = vi.fn();
  const utils = render(<Atalhos onSearch={onSearch} onNewSale={onNewSale} />);

  return { onSearch, onNewSale, ...utils };
}

describe('useGlobalShortcuts', () => {
  it('Ctrl+K abre a busca', () => {
    const { onSearch } = montar();

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('"/" abre a busca e "n" inicia uma venda', () => {
    const { onSearch, onNewSale } = montar();

    fireEvent.keyDown(window, { key: '/' });
    fireEvent.keyDown(window, { key: 'n' });

    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onNewSale).toHaveBeenCalledTimes(1);
  });

  it('ignora teclas simples enquanto se digita em um campo', () => {
    const { onSearch, onNewSale, getByLabelText } = montar();

    fireEvent.keyDown(getByLabelText('campo'), { key: 'n' });
    fireEvent.keyDown(getByLabelText('campo'), { key: '/' });

    expect(onNewSale).not.toHaveBeenCalled();
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('ignora teclas simples com uma janela aberta, mas mantém Ctrl+K', () => {
    const { onSearch, onNewSale } = montar();
    const janela = document.createElement('div');
    janela.className = 'MuiDialog-root';
    document.body.appendChild(janela);

    fireEvent.keyDown(window, { key: 'n' });
    expect(onNewSale).not.toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(onSearch).toHaveBeenCalledTimes(1);

    janela.remove();
  });

  it('não reage a combinações com Alt ou Ctrl nas teclas simples', () => {
    const { onNewSale } = montar();

    fireEvent.keyDown(window, { key: 'n', altKey: true });
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });

    expect(onNewSale).not.toHaveBeenCalled();
  });
});
