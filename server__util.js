import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase();
export const ADMIN_PIN = process.env.ADMIN_PIN || '1234';
export const isProd = process.env.NODE_ENV === 'production';

export const sign = (payload, expiresIn = '30d') => jwt.sign(payload, JWT_SECRET, { expiresIn });
export const hashCode = (email, code) =>
  crypto.createHmac('sha256', JWT_SECRET).update(`${email}:${code}`).digest('hex');
export const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

let transporter;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

// returns true if actually emailed
export async function sendOtpMail(to, code) {
  if (!transporter) {
    console.log(`[OTP] ${to}: ${code}  (SMTP not configured)`);
    return false;
  }
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Your TeleVideo Pro code: ${code}`,
    text: `Your verification code is ${code}. It expires in 10 minutes.`,
  });
  return true;
}

// Validate Telegram WebApp initData; returns the Telegram user or null.
export function parseInitData(initData) {
  const token = process.env.BOT_TOKEN;
  if (!token || !initData) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    params.delete('hash');
    const str = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
    const calc = crypto.createHmac('sha256', secret).update(str).digest('hex');
    if (!hash || !safeEqual(calc, hash)) return null;
    const authDate = Number(params.get('auth_date') || 0);
    if (Date.now() / 1000 - authDate > 86400) return null;
    return JSON.parse(params.get('user') || 'null');
  } catch { return null; }
}

export async function isChannelMember(chatId, tgUserId) {
  const token = process.env.BOT_TOKEN;
  const url = `https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${tgUserId}`;
  const r = await fetch(url);
  const j = await r.json();
  return !!j.ok && ['creator', 'administrator', 'member', 'restricted'].includes(j.result?.status);
}

export const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);
export const yesterdayStr = () => todayStr(new Date(Date.now() - 864e5));
export const CHECKIN_REWARDS = [5, 10, 15, 20, 25, 30, 50];
