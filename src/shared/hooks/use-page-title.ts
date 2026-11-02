import { useEffect } from 'react';

const APP_NAME = 'AKKAI 3D';

/** Define o título da aba como "Página · AKKAI 3D" enquanto a tela está montada. */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;

    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
