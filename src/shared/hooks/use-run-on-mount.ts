import { useEffect, useRef } from 'react';

/**
 * Executa `action` uma única vez, quando o componente é montado. Usa sempre a
 * versão da primeira renderização, então serve para disparar a consulta
 * inicial de uma tela com os filtros padrão.
 */
export function useRunOnMount(action: () => void | Promise<void>): void {
  const actionRef = useRef(action);

  useEffect(() => {
    void actionRef.current();
  }, []);
}
