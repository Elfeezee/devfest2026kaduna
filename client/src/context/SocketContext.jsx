import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const PRODUCTION_BACKEND = 'https://devfest2026kaduna.onrender.com';

const resolveBackendUrl = () => {
  if (typeof window === 'undefined') return PRODUCTION_BACKEND;
  const saved = localStorage.getItem('devfest_backend_url');
  if (saved) return saved;
  if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }
  return PRODUCTION_BACKEND;
};

/** Wake Render backend before connecting (free tier sleeps after 15 min idle) */
const wakeBackend = async (url) => {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(15000) });
    if (res.ok) console.log('[Socket] Backend is awake ✅');
  } catch (e) {
    console.warn('[Socket] Wake-up ping failed (may still be booting):', e.message);
  }
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isWaking, setIsWaking] = useState(false);
  const [activeUrl, setActiveUrl] = useState('');
  const keepAliveRef = useRef(null);
  const socketRef = useRef(null);

  const clearKeepAlive = () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
  };

  const initSocket = async (url) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    clearKeepAlive();

    console.log('[Socket] Connecting to:', url);
    setActiveUrl(url);
    setIsConnected(false);

    // Wake the backend first — critical for Render free tier cold starts
    setIsWaking(true);
    await wakeBackend(url);
    setIsWaking(false);

    const s = io(url, {
      transports: ['polling', 'websocket'], // polling first, then upgrade to WS
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      randomizationFactor: 0.4,
      timeout: 20000, // 20s to allow cold-start boot
    });

    s.on('connect', () => {
      console.log('[Socket] Connected ✅ ID:', s.id);
      setIsConnected(true);
      // Keep-alive every 8 min so Render never idles during a live session
      clearKeepAlive();
      keepAliveRef.current = setInterval(() => {
        fetch(`${url}/api/health`).catch(() => {});
      }, 8 * 60 * 1000);
    });

    s.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
      setIsConnected(false);
      clearKeepAlive();
    });

    s.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
      setIsConnected(false);
    });

    socketRef.current = s;
    setSocket(s);
    return s;
  };

  useEffect(() => {
    const url = resolveBackendUrl();
    initSocket(url);
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      clearKeepAlive();
    };
  }, []);

  const setBackendUrl = (url) => {
    if (!url) return;
    const clean = url.trim().replace(/\/+$/, '');
    localStorage.setItem('devfest_backend_url', clean);
    initSocket(clean);
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, isWaking, activeUrl, setBackendUrl }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};

