import { useEffect } from 'react';
import { useNotificationsStore } from './use-notifications-store';

/** Atualiza os alertas periodicamente enquanto o app está aberto e online. */
export const NOTIFICATIONS_REFRESH_MS = 5 * 60 * 1000;
/** Ao voltar para a aba, só busca de novo se a última busca for mais antiga. */
export const NOTIFICATIONS_FOCUS_REFRESH_MS = 60 * 1000;

export function isNotificationsDataStale(
  lastFetchedAt: number | null,
  maxAgeMs: number,
  now = Date.now(),
): boolean {
  return lastFetchedAt === null || now - lastFetchedAt > maxAgeMs;
}

export function useNotificationsPolling(
  userId: number | null,
  isOnline: boolean,
) {
  const setUser = useNotificationsStore((state) => state.setUser);
  const fetchAlertas = useNotificationsStore((state) => state.fetchAlertas);

  useEffect(() => {
    setUser(userId);
  }, [setUser, userId]);

  useEffect(() => {
    if (userId === null || !isOnline) {
      return undefined;
    }

    void fetchAlertas();
    const intervalId = window.setInterval(() => {
      void fetchAlertas();
    }, NOTIFICATIONS_REFRESH_MS);
    const handleFocus = () => {
      const { lastFetchedAt } = useNotificationsStore.getState();

      if (
        isNotificationsDataStale(lastFetchedAt, NOTIFICATIONS_FOCUS_REFRESH_MS)
      ) {
        void fetchAlertas();
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchAlertas, isOnline, userId]);
}
