import { useEffect, useState } from 'react';

export function useSwUpdate() {
  const [needsUpdate, setNeedsUpdate] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const hadController = !!navigator.serviceWorker.controller;

    const handleControllerChange = () => {
      if (!hadController) return;
      setNeedsUpdate(true);
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    );
    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      );
    };
  }, []);

  const update = () => {
    window.location.reload();
  };

  return { needsUpdate, update };
}
