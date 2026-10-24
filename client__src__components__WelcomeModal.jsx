import React from 'react';
import { asset, openLink } from '../api.js';
import { useApp } from '../ctx.jsx';
import { Modal } from './ui.jsx';

export default function WelcomeModal({ onClose }) {
  const { config } = useApp();
  const n = config.notice;
  return (
    <Modal onClose={onClose} z={60}>
      {n.image && <img src={asset(n.image)} alt="" className="aspect-video w-full object-cover" />}
      <div className="space-y-3 p-5 text-center">
        {n.badge && <span className="badge bg-accent/20 text-accent">{n.badge}</span>}
        <h2 className="text-xl font-extrabold">{n.title}</h2>
        <p className="whitespace-pre-line text-sm text-mute">{n.message}</p>
        <button className="btn-primary w-full" onClick={() => { if (n.linkUrl) openLink(n.linkUrl); onClose(); }}>
          {n.linkLabel || 'Got it'}
        </button>
        {n.linkUrl && <button className="w-full text-xs text-mute" onClick={onClose}>Dismiss</button>}
      </div>
    </Modal>
  );
}
