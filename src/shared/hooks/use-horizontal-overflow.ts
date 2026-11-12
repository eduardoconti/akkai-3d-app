import { useCallback, useEffect, useState } from 'react';

export interface HorizontalOverflow {
  /** Há conteúdo escondido à esquerda (o usuário já rolou). */
  start: boolean;
  /** Há conteúdo escondido à direita. */
  end: boolean;
}

const NO_OVERFLOW: HorizontalOverflow = { start: false, end: false };
/** Folga para arredondamentos de subpixel no cálculo da rolagem. */
const TOLERANCE_PX = 1;

/**
 * Indica se um contêiner com rolagem horizontal esconde conteúdo à esquerda ou
 * à direita, para a interface sinalizar que existe mais coisa além da borda.
 * Também informa a largura visível do contêiner (`width`).
 */
export function useHorizontalOverflow<TElement extends HTMLElement>() {
  // Callback ref: o elemento pode surgir depois (ex.: troca de cartões para tabela).
  const [element, setElement] = useState<TElement | null>(null);
  const [overflow, setOverflow] = useState<HorizontalOverflow>(NO_OVERFLOW);
  const [width, setWidth] = useState(0);

  const measure = useCallback(() => {
    if (!element) {
      return;
    }

    setWidth(element.clientWidth);
    const maxScrollLeft = element.scrollWidth - element.clientWidth;
    const next = {
      start: element.scrollLeft > TOLERANCE_PX,
      end: maxScrollLeft - element.scrollLeft > TOLERANCE_PX,
    };

    setOverflow((current) =>
      current.start === next.start && current.end === next.end ? current : next,
    );
  }, [element]);

  useEffect(() => {
    if (!element) {
      return undefined;
    }

    measure();
    element.addEventListener('scroll', measure, { passive: true });

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    resizeObserver?.observe(element);

    if (element.firstElementChild) {
      resizeObserver?.observe(element.firstElementChild);
    }

    return () => {
      element.removeEventListener('scroll', measure);
      resizeObserver?.disconnect();
    };
  }, [element, measure]);

  return { ref: setElement, element, overflow, width };
}
