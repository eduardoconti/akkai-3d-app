import { useEffect, useRef, useState } from 'react';
import { checkApiConnectivity } from '@/shared/lib/api/http-client';

function getNavigatorOnlineState() {
  return typeof window === 'undefined' ? true : window.navigator.onLine;
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const updateApiStatus = async () => {
      if (!getNavigatorOnlineState()) {
        if (isMountedRef.current) {
          setIsOnline(false);
        }
        return;
      }

      const apiReachable = await checkApiConnectivity();

      if (isMountedRef.current) {
        setIsOnline(apiReachable);
      }
    };

    const handleOnline = () => {
      void updateApiStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    void updateApiStatus();

    const intervalId = window.setInterval(() => {
      void updateApiStatus();
    }, 3000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleOnline);

    return () => {
      isMountedRef.current = false;
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleOnline);
    };
  }, []);

  return isOnline;
}
