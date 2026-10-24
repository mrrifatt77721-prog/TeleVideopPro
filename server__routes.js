import express from 'express';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { User, Otp, Video, Progress, Config } from './models.js';
import {
  JWT_SECRET, ADMIN_EMAIL, ADMIN_PIN, isProd, sign, hashCode, safeEqual, sendOtpMail,
  parseInitData, isChannelMember, todayStr, yesterdayStr, CHECKIN_REWARDS,
} from './util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_, file, cb) =>
      cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase().slice(0, 8)),
  }),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 200) * 1024 * 1024 },
  fileFilter: (_, file, cb) =>
    cb(null, file.mimetype.startsWith('image/') || file.mimetype === 'video/mp4'),
});

const r = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (res, code, error) => res.status(code).json({ error });
const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ---------- auth middleware ----------
const auth = wrap(async (req, res, next) => {
  const h = req.headers.authorization || '';
  try {
    const p = jwt.verify(h.replace(/^Bearer /, ''), JWT_SECRET);
    if (p.temp) return fail(res, 401, 'Admin PIN required');
    const user = await User.findById(p.id);
    if (!user) return fail(res, 401, 'Session expired');
    req.user = user;
    req.isAdmin = !!p.admin && user.email === ADMIN_EMAIL;
    next();
  } catch { fail(res, 401, 'Please log in'); }
});
const admin = (req, res, next) => (req.isAdmin ? next() : fail(res, 403, 'Admin only'));

const userDto = (u, isAdmin) => ({
  id: u.id, email: u.email, name: u.name, avatar: u.avatar, points: u.points,
  skipTokens: u.skipTokens, tasksDone: u.tasksDone, unlockedCount: u.unlocked.length,
  streak: u.streak, settings: u.settings, isAdmin: !!isAdmin, member: true,
});

const getConfig = async () =>
  (await Config.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, new: true })).toObject();

// ---------- auth ----------
r.post('/auth/request-otp', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!emailOk(email)) return fail(res, 400, 'Enter a valid email');
  const last = await Otp.findOne({ email }).sort({ createdAt: -1 });
  if (last && Date.now() - last.createdAt.getTime() < 30000)
    return fail(res, 429, 'Please wait before requesting another code');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await Otp.deleteMany({ email });
  await Otp.create({ email, hash: hashCode(email, code), expiresAt: new Date(Date.now() + 10 * 60000) });
  const mailed = await sendOtpMail(email, code).catch((e) => { console.error(e); return false; });
  res.json({ ok: true, resendIn: 30, ...(!mailed && !isProd ? { devCode: code } : {}) });
}));

r.post('/auth/verify-otp', wrap(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '');
  const otp = await Otp.findOne({ email });
  if (!otp || otp.attempts >= 5) return fail(res, 400, 'Code expired. Request a new one.');
  if (!safeEqual(otp.hash, hashCode(email, code))) {
    otp.attempts += 1; await otp.save();
    return fail(res, 400, 'Incorrect code');
  }
  await Otp.deleteMany({ email });
  const tg = parseInitData(req.headers['x-tg-init']);
  const user = await User.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, name: tg?.first_name || email.split('@')[0] }, ...(tg ? { $set: { telegramId: String(tg.id) } } : {}) },
    { upsert: true, new: true },
  );
  if (email === ADMIN_EMAIL) return res.json({ needPin: true, tempToken: sign({ id: user.id, temp: true }, '5m') });
  res.json({ token: sign({ id: user.id }), user: userDto(user, false) });
}));

const pinTries = new Map();
r.post('/auth/admin-pin', wrap(async (req, res) => {
  let p;
  try { p = jwt.verify(req.body.tempToken, JWT_SECRET); } catch { return fail(res, 401, 'Session expired'); }
  if (!p.temp) return fail(res, 400, 'Bad token');
  const n = pinTries.get(p.id) || 0;
  if (n >= 5) return fail(res, 429, 'Too many attempts. Log in again later.');
  if (!safeEqual(String(req.body.pin || ''), ADMIN_PIN)) {
    pinTries.set(p.id, n + 1);
    setTimeout(() => pinTries.delete(p.id), 15 * 60000).unref();
    return fail(res, 400, 'Wrong PIN');
  }
  pinTries.delete(p.id);
  const user = await User.findById(p.id);
  res.json({ token: sign({ id: user.id, admin: true }), user: userDto(user, true) });
}));

// ---------- me ----------
r.get('/me', auth, (req, res) => res.json({ user: userDto(req.user, req.isAdmin) }));

r.patch('/me', auth, wrap(async (req, res) => {
  const { name, avatar, settings } = req.body;
  if (typeof name === 'string') req.user.name = name.trim().slice(0, 40);
  if (typeof avatar === 'string' && (avatar === '' || (avatar.startsWith('data:image/') && avatar.length < 120000) || avatar.startsWith('/uploads/')))
    req.user.avatar = avatar;
  if (settings?.theme && ['dark', 'light'].includes(settings.theme)) req.user.settings.theme = settings.theme;
  if (typeof settings?.alerts === 'boolean') req.user.settings.alerts = settings.alerts;
  await req.user.save();
  res.json({ user: userDto(req.user, req.isAdmin) });
}));

r.post('/me/checkin', auth, wrap(async (req, res) => {
  const s = req.user.streak;
  if (s.lastClaim === todayStr()) return fail(res, 400, 'Already claimed today');
  let day = s.lastClaim === yesterdayStr() ? s.day + 1 : 1;
  if (day > 7) day = 1;
  const reward = CHECKIN_REWARDS[day - 1];
  req.user.points += reward;
  if (day === 7) req.user.skipTokens += 1;
  req.user.streak = { day, lastClaim: todayStr() };
  await req.user.save();
  res.json({ reward, bonusToken: day === 7, user: userDto(req.user, req.isAdmin) });
}));

// ---------- config ----------
r.get('/config', auth, wrap(async (_, res) => {
  const { _id, __v, ...c } = await getConfig();
  res.json({ config: c, rewards: CHECKIN_REWARDS });
}));

r.put('/config', auth, admin, wrap(async (req, res) => {
  const allowed = ['marquee', 'notice', 'branding', 'sponsor'];
  const set = {};
  for (const k of allowed) if (req.body[k]) for (const [f, v] of Object.entries(req.body[k])) set[`${k}.${f}`] = v;
  await Config.findOneAndUpdate({ key: 'main' }, { $set: set }, { upsert: true });
  const { _id, __v, ...c } = await getConfig();
  res.json({ config: c });
}));

// ---------- videos ----------
const publicVideo = (v, prog, user) => ({
  id: v.id, title: v.title, description: v.description, duration: v.duration,
  thumbnail: v.thumbnail, thumbAspect: v.thumbAspect, taskType: v.taskType,
  taskCount: v.taskType === 'telegram' ? v.channels.length : v.taskCount,
  tasksDone: prog?.done || 0, unlocked: user.unlocked.some((id) => id.equals(v._id)),
  buttons: v.buttons, views: v.views, downloads: v.downloads, createdAt: v.createdAt,
  sourceType: v.sourceType,
});

r.get('/videos', auth, wrap(async (req, res) => {
  const q = String(req.query.q || '').trim();
  const filter = q ? { title: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {};
  const sort = req.query.sort === 'popular' ? { downloads: -1, views: -1 } : { createdAt: -1 };
  const videos = await Video.find(filter).sort(sort).limit(100);
  const progs = await Progress.find({ user: req.user._id, video: { $in: videos.map((v) => v._id) } });
  const pm = new Map(progs.map((p) => [String(p.video), p]));
  res.json({ videos: videos.map((v) => publicVideo(v, pm.get(v.id), req.user)) });
}));

r.get('/videos/:id', auth, wrap(async (req, res) => {
  const v = await Video.findById(req.params.id);
  if (!v) return fail(res, 404, 'Not found');
  v.views += 1; await v.save();
  const prog = await Progress.findOne({ user: req.user._id, video: v._id });
  res.json({ video: publicVideo(v, prog, req.user) });
}));

// task steps for modal
r.get('/videos/:id/tasks', auth, wrap(async (req, res) => {
  const v = await Video.findById(req.params.id);
  if (!v) return fail(res, 404, 'Not found');
  const cfg = await getConfig();
  const prog = await Progress.findOne({ user: req.user._id, video: v._id });
  const steps = v.taskType === 'telegram'
    ? v.channels.map((c, i) => ({ label: `Join ${c.name}`, link: c.link, countdown: Math.min(v.countdown, 10) }))
    : Array.from({ length: v.taskCount }, (_, i) => ({
        label: `Partner task ${i + 1}`,
        link: v.adLinks[i] || v.adLinks[0] || cfg.sponsor?.url || '',
        countdown: v.countdown,
      }));
  res.json({ steps, done: prog?.done || 0, unlocked: req.user.unlocked.some((id) => id.equals(v._id)), skipTokens: req.user.skipTokens });
}));

const stepCount = (v) => (v.taskType === 'telegram' ? v.channels.length : v.taskCount);

async function finishIfComplete(user, v, prog) {
  if (prog.done < stepCount(v)) return false;
  if (!user.unlocked.some((id) => id.equals(v._id))) {
    user.unlocked.push(v._id);
    user.tasksDone += stepCount(v);
    user.points += v.reward || 0;
    await user.save();
  }
  return true;
}

r.post('/videos/:id/tasks/start', auth, wrap(async (req, res) => {
  const v = await Video.findById(req.params.id);
  if (!v) return fail(res, 404, 'Not found');
  const step = Number(req.body.step);
  const prog = (await Progress.findOne({ user: req.user._id, video: v._id })) || new Progress({ user: req.user._id, video: v._id });
  if (step !== prog.done || step >= stepCount(v)) return fail(res, 400, 'Invalid step');
  prog.startedAt[step] = new Date();
  prog.markModified('startedAt');
  await prog.save();
  res.json({ ok: true });
}));

r.post('/videos/:id/tasks/verify', auth, wrap(async (req, res) => {
  const v = await Video.findById(req.params.id);
  if (!v) return fail(res, 404, 'Not found');
  const step = Number(req.body.step);
  const prog = await Progress.findOne({ user: req.user._id, video: v._id });
  if (!prog || step !== prog.done || !prog.startedAt[step]) return fail(res, 400, 'Start the task first');
  const cd = v.taskType === 'telegram' ? Math.min(v.countdown, 10) : v.countdown;
  if (Date.now() - new Date(prog.startedAt[step]).getTime() < cd * 1000 - 700) return fail(res, 400, 'Task not finished yet');
  if (v.taskType === 'telegram') {
    const ch = v.channels[step];
    const tg = parseInitData(req.headers['x-tg-init']);
    if (process.env.BOT_TOKEN && ch?.chatId && (tg?.id || req.user.telegramId)) {
      const ok = await isChannelMember(ch.chatId, tg?.id || req.user.telegramId).catch(() => false);
      if (!ok) return fail(res, 400, 'Join the channel first, then verify again');
    }
  }
  prog.done += 1; await prog.save();
  const complete = await finishIfComplete(req.user, v, prog);
  res.json({ done: prog.done, complete, user: userDto(req.user, req.isAdmin) });
}));

r.post('/videos/:id/tasks/skip', auth, wrap(async (req, res) => {
  const v = await Video.findById(req.params.id);
  if (!v) return fail(res, 404, 'Not found');
  if (req.user.skipTokens < 1) return fail(res, 400, 'No skip tokens left');
  const prog = (await Progress.findOne({ user: req.user._id, video: v._id })) || new Progress({ user: req.user._id, video: v._id });
  if (prog.done >= stepCount(v)) return fail(res, 400, 'Already complete');
  prog.done += 1; await prog.save();
  req.user.skipTokens -= 1; await req.user.save();
  const complete = await finishIfComplete(req.user, v, prog);
  res.json({ done: prog.done, complete, user: userDto(req.user, req.isAdmin) });
}));

// destination link is only revealed after the gateway is complete
r.post('/videos/:id/unlock', auth, wrap(async (req, res) => {
  const v = await Video.findById(req.params.id);
  if (!v) return fail(res, 404, 'Not found');
  if (!req.user.unlocked.some((id) => id.equals(v._id))) return fail(res, 403, 'Complete all tasks first');
  v.downloads += 1; await v.save();
  res.json({
    destinationUrl: v.destinationUrl || v.sourceUrl,
    sourceUrl: v.sourceUrl, sourceType: v.sourceType, buttons: v.buttons,
  });
}));

r.get('/me/files', auth, wrap(async (req, res) => {
  const videos = await Video.find({ _id: { $in: req.user.unlocked } }).sort({ createdAt: -1 });
  res.json({ videos: videos.map((v) => ({ id: v.id, title: v.title, thumbnail: v.thumbnail, duration: v.duration })) });
}));

// ---------- admin ----------
r.get('/admin/videos', auth, admin, wrap(async (_, res) => {
  res.json({ videos: await Video.find().sort({ createdAt: -1 }) });
}));

r.get('/admin/stats', auth, admin, wrap(async (_, res) => {
  const [users, videos, agg] = await Promise.all([
    User.countDocuments(), Video.countDocuments(),
    Video.aggregate([{ $group: { _id: null, views: { $sum: '$views' }, downloads: { $sum: '$downloads' } } }]),
  ]);
  res.json({ users, videos, views: agg[0]?.views || 0, downloads: agg[0]?.downloads || 0 });
}));

const VIDEO_FIELDS = ['title', 'description', 'duration', 'sourceType', 'sourceUrl', 'thumbnail', 'thumbAspect',
  'taskType', 'taskCount', 'countdown', 'adLinks', 'channels', 'destinationUrl', 'reward', 'buttons'];
const pickVideo = (b) => Object.fromEntries(VIDEO_FIELDS.filter((k) => b[k] !== undefined).map((k) => [k, b[k]]));

r.post('/admin/videos', auth, admin, wrap(async (req, res) => {
  if (!req.body.title?.trim()) return fail(res, 400, 'Title is required');
  res.json({ video: await Video.create(pickVideo(req.body)) });
}));
r.put('/admin/videos/:id', auth, admin, wrap(async (req, res) => {
  const v = await Video.findByIdAndUpdate(req.params.id, { $set: pickVideo(req.body) }, { new: true, runValidators: true });
  if (!v) return fail(res, 404, 'Not found');
  res.json({ video: v });
}));
r.delete('/admin/videos/:id', auth, admin, wrap(async (req, res) => {
  await Video.findByIdAndDelete(req.params.id);
  await Progress.deleteMany({ video: req.params.id });
  res.json({ ok: true });
}));

r.post('/upload', auth, admin, upload.single('file'), (req, res) => {
  if (!req.file) return fail(res, 400, 'Only images and MP4 files are allowed');
  res.json({ url: `/uploads/${req.file.filename}` });
});

export { UPLOAD_DIR };
export default r;
