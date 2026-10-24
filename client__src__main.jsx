import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AppProvider } from './ctx.jsx';
import './index.css';

const w = window.Telegram?.WebApp;
if (w) { w.ready(); w.expand(); try { w.disableVerticalSwipes?.(); } catch {} }

createRoot(document.getElementById('root')).render(
  <AppProvider>
    <App />
  </AppProvider>,
);
