import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { API_BASE, WS_BASE } from '../config';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    connectWebSocket();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, []);

  function connectWebSocket() {
    const ws = new WebSocket(`${WS_BASE}/ws/notifications`);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'notification') {
        setNotifications(prev => [msg.data, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    };
    ws.onclose = () => { setTimeout(connectWebSocket, 3000); };
  }

  async function fetchNotifications() {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`);
      const data = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  }

  async function markAsRead(id) {
    await fetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'PATCH' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await fetch(`${API_BASE}/api/notifications/read-all`, { method: 'PATCH' });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnreadCount(0);
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllRead, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
