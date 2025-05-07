import React, { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div style={{
      backgroundColor: '#ffcc00',
      color: '#000',
      textAlign: 'center',
      padding: '10px',
      fontWeight: 'bold',
      position: 'fixed',
      bottom: 0,
      width: '100%',
      zIndex: 9999
    }}>
      ⚠️ You are currently offline. Some features may not work.
    </div>
  );
}
