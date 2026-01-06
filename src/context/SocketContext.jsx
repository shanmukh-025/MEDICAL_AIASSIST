import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
    const newSocket = io(API_URL, { transports: ['websocket', 'polling'] });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected');
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.id) newSocket.emit('join', `user_${payload.id}`);
        } catch (e) { console.error('Token parse error', e); }
      }
    });

    newSocket.on('notification', (data) => {
      console.log('📩 Notification received:', data);
      setNotifications(prev => [data, ...prev]);
      toast.success(data.message, { duration: 5000, icon: '🔔' });
    });

    newSocket.on('disconnect', () => console.log('❌ Socket disconnected'));

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{ socket, notifications, setNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
