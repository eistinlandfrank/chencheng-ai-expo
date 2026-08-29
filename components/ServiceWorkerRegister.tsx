'use client';

import { useEffect, useSyncExternalStore } from 'react';

function subscribeToConnectivity(listener: () => void) {
  window.addEventListener('online', listener);
  window.addEventListener('offline', listener);
  return () => {
    window.removeEventListener('online', listener);
    window.removeEventListener('offline', listener);
  };
}

export default function ServiceWorkerRegister() {
  const online = useSyncExternalStore(subscribeToConnectivity, () => navigator.onLine, () => true);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js');
    }
  }, []);

  if (online) return null;
  return <div className="offline-status" role="status">当前离线，已保留可用的场馆与行程信息</div>;
}
