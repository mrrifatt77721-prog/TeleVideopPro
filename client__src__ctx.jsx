import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken, tg } from './api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [rewards, setRewards] = useState([5, 10, 15, 20, 25, 30, 50]);
  const [booting, setBooting] = useState(!!getToken());
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const loadConfig = useCallback(async () => {
    const d = await api('/config');
    setConfig(d.config); setRewards(d.rewards);
  }, []);

  const login = useCallback(async (token, u) => {
    setToken(token); setUser(u);
    await loadConfig();
  }, [loadConfig]);

  const logout = useCallback(() => { setToken(null); setUser(null); setConfig(null); }, []);

  useEffect(() => {
    if (!getToken()) return;
    (async () => {
      try {
        const d = await api('/me');
        setUser(d.user);
        await loadConfig();
      } catch { setToken(null); }
      setBooting(false);
    })();
  }, [loadConfig]);

  // theme
  useEffect(() => {
    const light = user?.settings?.theme === 'light';
    document.documentElement.classList.toggle('light', light);
    const bg = light ? '#f3f5fb' : '#0b0d14';
    const w = tg();
    try { w?.setHeaderColor?.(bg); w?.setBackgroundColor?.(bg); } catch {}
  }, [user?.settings?.theme]);

  // pinch to zoom toggle
  useEffect(() => {
    const vp = document.getElementById('vp');
    if (!vp) return;
    vp.setAttribute('content', config?.branding?.pinchZoom
      ? 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover'
      : 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
  }, [config?.branding?.pinchZoom]);

  const value = { user, setUser, config, setConfig, rewards, booting, login, logout, toast, loadConfig };
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div key={t.id} className={`animate-pop pointer-events-auto rounded-xl border px-4 py-2.5 text-sm font-medium shadow-xl backdrop-blur ${
            t.type === 'err' ? 'border-bad/40 bg-bad/15 text-bad' : 'border-good/40 bg-good/15 text-good'}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
