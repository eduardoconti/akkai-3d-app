import {
  useCallback,
  useEffect,
  useId,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

export interface FloatingTooltipLine {
  label: string;
  value: string;
  /** Cor do marcador exibido antes do rótulo (ex.: série de um gráfico). */
  color?: string;
}

export interface FloatingTooltipContent {
  title?: string;
  /** Cor do marcador exibido antes do título. */
  color?: string;
  lines: readonly FloatingTooltipLine[];
  caption?: string;
}

export interface FloatingTooltipState extends FloatingTooltipContent {
  id: string;
  targetKey: string;
  x: number;
  y: number;
  /** Lado do ponto de referência em que o tooltip abre (evita sair da tela). */
  placement: 'right' | 'left';
}

/** Espaço mínimo à direita do ponteiro para abrir o tooltip desse lado. */
const RIGHT_PLACEMENT_MIN_SPACE = 240;

/**
 * Tooltip que acompanha o ponteiro e também funciona sem mouse: abre ao tocar
 * no alvo (fecha ao tocar fora ou rolar a página) e ao focar pelo teclado
 * (fecha ao perder o foco ou com Esc).
 */
export function useFloatingTooltip() {
  const id = useId();
  const [tooltip, setTooltip] = useState<FloatingTooltipState | null>(null);
  const hide = useCallback(() => setTooltip(null), []);
  const isOpen = tooltip !== null;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    // `pointerdown` dispara antes do clique no próprio alvo, que reabre o tooltip.
    window.addEventListener('pointerdown', hide, true);
    window.addEventListener('scroll', hide, true);

    return () => {
      window.removeEventListener('pointerdown', hide, true);
      window.removeEventListener('scroll', hide, true);
    };
  }, [hide, isOpen]);

  const show = useCallback(
    (
      targetKey: string,
      content: FloatingTooltipContent,
      x: number,
      y: number,
    ) => {
      setTooltip({
        ...content,
        id,
        targetKey,
        x,
        y,
        placement:
          x > window.innerWidth - RIGHT_PLACEMENT_MIN_SPACE ? 'left' : 'right',
      });
    },
    [id],
  );

  const getTargetProps = useCallback(
    (targetKey: string, content: FloatingTooltipContent) => {
      const showAtPointer = (event: MouseEvent<Element>) =>
        show(targetKey, content, event.clientX, event.clientY);

      return {
        tabIndex: 0,
        'aria-describedby':
          tooltip?.targetKey === targetKey ? tooltip.id : undefined,
        onMouseMove: showAtPointer,
        onClick: showAtPointer,
        onMouseLeave: hide,
        onFocus: (event: FocusEvent<Element>) => {
          const rect = event.currentTarget.getBoundingClientRect();
          show(targetKey, content, rect.left + rect.width / 2, rect.top);
        },
        onBlur: hide,
        onKeyDown: (event: KeyboardEvent<Element>) => {
          if (event.key === 'Escape') {
            hide();
          }
        },
      };
    },
    [hide, show, tooltip?.id, tooltip?.targetKey],
  );

  return { tooltip, hide, getTargetProps };
}
