import { useEffect } from 'react';

interface GlobalShortcuts {
  onSearch: () => void;
  onNewSale: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

/**
 * Atalhos globais: Ctrl/Cmd+K ou "/" abre a busca rápida; "N" inicia uma nova
 * venda. As teclas simples só valem fora de campos de texto e de janelas abertas.
 * (O menu lateral do MUI também usa role=dialog, por isso a checagem é por classe.)
 */
export function useGlobalShortcuts({ onSearch, onNewSale }: GlobalShortcuts) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onSearch();
        return;
      }

      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        isTypingTarget(event.target) ||
        document.querySelector('.MuiDialog-root, .MuiPopover-root')
      ) {
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        onSearch();
      } else if (event.key.toLowerCase() === 'n') {
        event.preventDefault();
        onNewSale();
      }
    };

    window.addEventListener('keydown', handler);

    return () => window.removeEventListener('keydown', handler);
  }, [onSearch, onNewSale]);
}
