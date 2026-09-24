import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(window.location.origin, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

export function useSocket(eventHandlers?: {
  onDoseUpdate?: (data: any) => void;
  onMealDetected?: (data: any) => void;
  onAlertNew?: (data: any) => void;
  onAlertUpdated?: (data: any) => void;
  onDeviceUpdate?: (data: any) => void;
  onRefillNeeded?: (data: any) => void;
}) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastNotification, setLastNotification] = useState<{ title: string; message: string; timestamp: Date } | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      setIsConnected(true);
    }

    if (eventHandlers?.onDoseUpdate) {
      socket.on('dose:status_update', eventHandlers.onDoseUpdate);
    }

    if (eventHandlers?.onMealDetected) {
      socket.on('meal:detected', (data) => {
        setLastNotification({
          title: `🍽️ Meal Detected: ${data.mealType.toUpperCase()}`,
          message: `Meal event processed at ${new Date(data.time).toLocaleTimeString()}. ${data.activatedCount} medication(s) activated.`,
          timestamp: new Date(),
        });
        eventHandlers.onMealDetected?.(data);
      });
    }

    if (eventHandlers?.onAlertNew) {
      socket.on('alert:new', (data) => {
        setLastNotification({
          title: `⚠️ Alert: ${data.title}`,
          message: data.message,
          timestamp: new Date(),
        });
        eventHandlers.onAlertNew?.(data);
      });
    }

    if (eventHandlers?.onAlertUpdated) {
      socket.on('alert:updated', eventHandlers.onAlertUpdated);
    }

    if (eventHandlers?.onDeviceUpdate) {
      socket.on('device:status_update', eventHandlers.onDeviceUpdate);
    }

    if (eventHandlers?.onRefillNeeded) {
      socket.on('inventory:refill_needed', eventHandlers.onRefillNeeded);
    }

    return () => {
      if (eventHandlers?.onDoseUpdate) socket.off('dose:status_update', eventHandlers.onDoseUpdate);
      if (eventHandlers?.onMealDetected) socket.off('meal:detected');
      if (eventHandlers?.onAlertNew) socket.off('alert:new');
      if (eventHandlers?.onAlertUpdated) socket.off('alert:updated', eventHandlers.onAlertUpdated);
      if (eventHandlers?.onDeviceUpdate) socket.off('device:status_update', eventHandlers.onDeviceUpdate);
      if (eventHandlers?.onRefillNeeded) socket.off('inventory:refill_needed', eventHandlers.onRefillNeeded);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  return { isConnected, lastNotification, clearNotification: () => setLastNotification(null) };
}
