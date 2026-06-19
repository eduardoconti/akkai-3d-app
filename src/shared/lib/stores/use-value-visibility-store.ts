import { create } from 'zustand';

const VALUE_VISIBILITY_STORAGE_KEY = 'akkai.value-visibility.hide-values';
const LEGACY_DASHBOARD_HIDE_VALUES_KEY = 'akkai.dashboard.hide-values';

function getStoredHideValues(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.localStorage.getItem(VALUE_VISIBILITY_STORAGE_KEY) === 'true' ||
    window.localStorage.getItem(LEGACY_DASHBOARD_HIDE_VALUES_KEY) === 'true'
  );
}

function persistHideValues(hideValues: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(VALUE_VISIBILITY_STORAGE_KEY, String(hideValues));
  window.localStorage.setItem(
    LEGACY_DASHBOARD_HIDE_VALUES_KEY,
    String(hideValues),
  );
}

interface ValueVisibilityState {
  hideValues: boolean;
  setHideValues: (hideValues: boolean) => void;
  toggleHideValues: () => void;
}

export const useValueVisibilityStore = create<ValueVisibilityState>((set) => ({
  hideValues: getStoredHideValues(),
  setHideValues: (hideValues) => {
    persistHideValues(hideValues);
    set({ hideValues });
  },
  toggleHideValues: () => {
    set((state) => {
      const hideValues = !state.hideValues;
      persistHideValues(hideValues);
      return { hideValues };
    });
  },
}));
