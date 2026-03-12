import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useOfflineStorage } from '@/hooks/useOfflineStorage';

export function OfflineIndicator() {
  const { isOnline } = useOfflineStorage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setIsVisible(true);
    } else {
      // Ocultar después de 3 segundos cuando vuelve la conexión
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
        isOnline
          ? 'bg-green-100 text-green-800 border border-green-300'
          : 'bg-yellow-100 text-yellow-800 border border-yellow-300 animate-pulse'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">Conexión restaurada</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 animate-bounce" />
          <span className="text-sm font-medium">Modo sin conexión</span>
        </>
      )}
    </div>
  );
}
