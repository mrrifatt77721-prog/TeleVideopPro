import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import routes, { UPLOAD_DIR } from './routes.js';
import { isProd, ADMIN_PIN } from './util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set('trust proxy', 1);

// Telegram embeds the app in an iframe, so framing/CSP are relaxed.
app.use(helmet({ contentSecurityPolicy: false, frameguard: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN === '*' || !process.env.CLIENT_ORIGIN ? true : process.env.CLIENT_ORIGIN.split(',') }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 40 }));

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));
app.use('/api', routes);
app.get('/health', (_, res) => res.json({ ok: true }));

// Serve built client in production (single-service deploy)
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.name === 'ValidationError' ? err.message : 'Server error';
  res.status(err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500)).json({ error: msg });
});

const port = process.env.PORT || 4000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/televideo').then(() => {
  if (isProd && ADMIN_PIN === '1234') console.warn('⚠️  ADMIN_PIN is still the default 1234 — change it!');
  if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.startsWith('change-me')))
    console.warn('⚠️  Set a strong JWT_SECRET!');
  app.listen(port, () => console.log(`TeleVideo Pro API on :${port}`));
}).catch((e) => { console.error('Mongo connection failed', e.message); process.exit(1); });
