import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../ctx.jsx';

export default function Login() {
  const { login, toast } = useApp();
  const [step, setStep] = useState('email'); // email | otp | pin
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [pin, setPin] = useState(['', '', '', '']);
  const [tempToken, setTempToken] = useState('');
  const [timer, setTimer] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const refs = useRef([]);
  const pinRefs = useRef([]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const run = async (fn) => {
    setBusy(true); setErr('');
    try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const sendCode = () => run(async () => {
    const d = await api('/auth/request-otp', { method: 'POST', body: { email } });
    setStep('otp'); setTimer(d.resendIn || 30); setDigits(Array(6).fill(''));
    if (d.devCode) toast(`Dev mode — your code is ${d.devCode}`);
    setTimeout(() => refs.current[0]?.focus(), 50);
  });

  const verify = (code) => run(async () => {
    const d = await api('/auth/verify-otp', { method: 'POST', body: { email, code } });
    if (d.needPin) { setTempToken(d.tempToken); setStep('pin'); setTimeout(() => pinRefs.current[0]?.focus(), 50); return; }
    await login(d.token, d.user);
  });

  const submitPin = (p) => run(async () => {
    try {
      const d = await api('/auth/admin-pin', { method: 'POST', body: { tempToken, pin: p } });
      await login(d.token, d.user);
    } catch (e) { setPin(['', '', '', '']); pinRefs.current[0]?.focus(); throw e; }
  });

  const boxes = (vals, setVals, rs, n, onDone, secret) => (
    <div className="flex justify-center gap-2">
      {vals.map((v, i) => (
        <input
          key={i}
          ref={(el) => (rs.current[i] = el)}
          value={v}
          inputMode="numeric"
          type={secret ? 'password' : 'text'}
          maxLength={1}
          autoComplete="one-time-code"
          className="h-14 w-11 rounded-xl border border-line bg-card2 text-center text-xl font-bold outline-none transition focus:border-accent"
          onChange={(e) => {
            const c = e.target.value.replace(/\D/g, '').slice(-1);
            const nv = [...vals]; nv[i] = c; setVals(nv);
            if (c && i < n - 1) rs.current[i + 1]?.focus();
            if (nv.every(Boolean)) onDone(nv.join(''));
          }}
          onKeyDown={(e) => e.key === 'Backspace' && !vals[i] && i > 0 && rs.current[i - 1]?.focus()}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, n);
            if (t.length === n) { e.preventDefault(); setVals(t.split('')); onDone(t); }
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="mx-auto flex h-full max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl text-3xl shadow-lg"
             style={{ background: 'linear-gradient(135deg,var(--accent),var(--accent2))' }}>▶</div>
        <h1 className="text-2xl font-extrabold">TeleVideo Pro</h1>
        <p className="mt-1 text-sm text-mute">
          {step === 'email' && 'Sign in with your email to continue'}
          {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
          {step === 'pin' && 'Admin detected — enter your 4-digit PIN'}
        </p>
      </div>

      <div className="card animate-pop space-y-4 p-5">
        {step === 'email' && (
          <>
            <input className="input" type="email" placeholder="you@example.com" autoFocus value={email}
                   onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && email && sendCode()} />
            <button className="btn-primary w-full" disabled={busy || !email.includes('@')} onClick={sendCode}>
              {busy ? 'Sending…' : 'Next'}
            </button>
          </>
        )}
        {step === 'otp' && (
          <>
            {boxes(digits, setDigits, refs, 6, verify)}
            <button className="btn-ghost w-full" disabled={timer > 0 || busy} onClick={sendCode}>
              {timer > 0 ? `Resend code in ${timer}s` : 'Resend code'}
            </button>
            <button className="w-full text-xs text-mute" onClick={() => { setStep('email'); setErr(''); }}>Use a different email</button>
          </>
        )}
        {step === 'pin' && boxes(pin, setPin, pinRefs, 4, submitPin, true)}
        {err && <p className="text-center text-sm text-bad">{err}</p>}
      </div>
    </div>
  );
}
