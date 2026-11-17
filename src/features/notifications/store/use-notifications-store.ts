import { create } from 'zustand';
import { listAlerts } from '@/features/notifications/api/notifications-api';
import {
  loadDismissedAlerts,
  saveDismissedAlerts,
  type DismissedAlerts,
} from '@/features/notifications/utils/dismissed-alerts';
import type { Alerta } from '@/shared/lib/types/domain';

interface NotificationsStoreState {
  alertas: Alerta[];
  dismissed: DismissedAlerts;
  userId: number | null;
  isFetching: boolean;
  /** Erro da última busca; a lista anterior é mantida. */
  hasFetchError: boolean;
  lastFetchedAt: number | null;
  setUser: (userId: number | null) => void;
  fetchAlertas: () => Promise<void>;
  dismissAlerta: (alerta: Alerta) => void;
  restoreDismissed: () => void;
}

export const useNotificationsStore = create<NotificationsStoreState>(
  (set, get) => ({
    alertas: [],
    dismissed: {},
    userId: null,
    isFetching: false,
    hasFetchError: false,
    lastFetchedAt: null,
    setUser: (userId) => {
      if (get().userId === userId) {
        return;
      }

      set({
        userId,
        alertas: [],
        lastFetchedAt: null,
        hasFetchError: false,
        dismissed: userId === null ? {} : loadDismissedAlerts(userId),
      });
    },
    fetchAlertas: async () => {
      if (get().isFetching) {
        return;
      }

      set({ isFetching: true });

      try {
        const response = await listAlerts();
        set({
          alertas: response.alertas,
          hasFetchError: false,
          lastFetchedAt: Date.now(),
        });
      } catch {
        set({ hasFetchError: true });
      } finally {
        set({ isFetching: false });
      }
    },
    dismissAlerta: (alerta) => {
      const dismissed = { ...get().dismissed, [alerta.tipo]: alerta.chave };
      set({ dismissed });
      const { userId } = get();

      if (userId !== null) {
        saveDismissedAlerts(userId, dismissed);
      }
    },
    restoreDismissed: () => {
      set({ dismissed: {} });
      const { userId } = get();

      if (userId !== null) {
        saveDismissedAlerts(userId, {});
      }
    },
  }),
);
