import React, { useEffect } from 'react';

export function Modal({ onClose, children, full = false, z = 50 }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 flex items-end justify-center sm:items-center animate-fade" style={{ zIndex: z }}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-md animate-sheet overflow-y-auto bg-bg sm:rounded-3xl rounded-t-3xl border border-line shadow-2xl ${
        full ? 'h-[94vh] sm:h-[90vh]' : 'max-h-[92vh]'}`}>
        {children}
      </div>
    </div>
  );
}

export function Header({ title, onClose, right }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
      <h2 className="truncate text-base font-bold">{title}</h2>
      <div className="flex items-center gap-2">
        {right}
        {onClose && <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-full bg-card2 text-mute">✕</button>}
      </div>
    </div>
  );
}

export function Toggle({ on, onChange, label, sub }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-3 rounded-xl px-1 py-2 text-left">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {sub && <span className="block text-xs text-mute">{sub}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-accent' : 'bg-line'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mute">{hint}</span>}
    </label>
  );
}

export const Spinner = () => (
  <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent" />
);
