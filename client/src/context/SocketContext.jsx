import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUrl, setActiveUrl] = useState('');

  const initSocket = (url) => {
    if (socket) {
      socket.disconnect();
    }

    console.log('[Socket] Connecting to:', url);
    setActiveUrl(url);

    const s = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    s.on('connect', () => {
      console.log('[Socket] Connected successfully with ID:', s.id);
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setIsConnected(false);
    });

    s.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setIsConnected(false);
    });

    setSocket(s);
    return s;
  };

  useEffect(() => {
    // Production backend is always https://devfest2026kaduna.onrender.com
    // In local development, fall back to localhost:4000
    // Admin can override via the settings modal (stored in localStorage)
    const PRODUCTION_BACKEND = 'https://devfest2026kaduna.onrender.com';

    const savedBackend = typeof window !== 'undefined' ? localStorage.getItem('devfest_backend_url') : null;

    let defaultUrl;
    if (savedBackend) {
      defaultUrl = savedBackend;
    } else if (import.meta.env.VITE_SERVER_URL) {
      defaultUrl = import.meta.env.VITE_SERVER_URL;
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      defaultUrl = 'http://localhost:4000';
    } else {
      // On devfestkaduna2026.web.app or any other production host, always point to Render
      defaultUrl = PRODUCTION_BACKEND;
    }

    const s = initSocket(defaultUrl);

    return () => {
      if (s) s.disconnect();
    };
  }, []);

  const setBackendUrl = (url) => {
    if (!url) return;
    const clean = url.trim().replace(/\/+$/, '');
    localStorage.setItem('devfest_backend_url', clean);
    initSocket(clean);
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, activeUrl, setBackendUrl }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
