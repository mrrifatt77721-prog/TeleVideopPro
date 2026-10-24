import React from 'react';
import { useApp } from './ctx.jsx';
import Login from './components/Login.jsx';
import Home from './components/Home.jsx';
import { Spinner } from './components/ui.jsx';

export default function App() {
  const { user, config, booting } = useApp();
  if (booting) return <div className="grid h-full place-items-center"><Spinner /></div>;
  if (!user || !config) return <Login />;
  return <Home />;
}
