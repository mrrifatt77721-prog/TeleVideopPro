import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const User = model('User', new Schema({
  email: { type: String, unique: true, index: true },
  telegramId: String,
  name: { type: String, default: '' },
  avatar: { type: String, default: '' },
  points: { type: Number, default: 0 },
  skipTokens: { type: Number, default: 0 },
  tasksDone: { type: Number, default: 0 },
  unlocked: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
  streak: { day: { type: Number, default: 0 }, lastClaim: { type: String, default: '' } },
  settings: {
    theme: { type: String, default: 'dark' },
    alerts: { type: Boolean, default: true },
  },
}, { timestamps: true }));

const Otp = model('Otp', new Schema({
  email: { type: String, index: true },
  hash: String,
  attempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, index: { expires: 0 } },
}));

const Video = model('Video', new Schema({
  title: { type: String, required: true },
  description: String,
  duration: String,
  sourceType: { type: String, enum: ['file', 'link'], default: 'link' },
  sourceUrl: String,
  thumbnail: String,
  thumbAspect: { type: String, default: '16:9' },
  taskType: { type: String, enum: ['ads', 'telegram'], default: 'ads' },
  taskCount: { type: Number, default: 3, min: 1, max: 10 },
  countdown: { type: Number, default: 3, min: 1, max: 60 },
  adLinks: [String],
  channels: [{ name: String, link: String, chatId: String }],
  destinationUrl: String,
  reward: { type: Number, default: 10 },
  buttons: {
    download: { enabled: { type: Boolean, default: true }, label: { type: String, default: 'Download' } },
    telegram: { enabled: { type: Boolean, default: false }, label: { type: String, default: 'Join Telegram' }, url: String },
    share: { enabled: { type: Boolean, default: true }, label: { type: String, default: 'Share' } },
  },
  views: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
}, { timestamps: true }));

const Progress = model('Progress', new Schema({
  user: { type: Schema.Types.ObjectId, index: true },
  video: { type: Schema.Types.ObjectId, index: true },
  done: { type: Number, default: 0 },
  startedAt: [Date],
}));

const Config = model('Config', new Schema({
  key: { type: String, default: 'main', unique: true },
  marquee: {
    enabled: { type: Boolean, default: true },
    text: { type: String, default: '🔥 New viral links added daily — stay tuned!' },
  },
  notice: {
    enabled: { type: Boolean, default: true },
    badge: { type: String, default: 'Special Notice' },
    title: { type: String, default: 'Welcome to TeleVideo Pro' },
    message: { type: String, default: 'Complete a few quick tasks to unlock your files.' },
    image: String,
    linkLabel: { type: String, default: 'Got it' },
    linkUrl: String,
  },
  branding: {
    title: { type: String, default: 'TeleVideo Pro' },
    folder: { type: String, default: 'Bachelor Point' },
    badge: { type: String, default: 'Active Links' },
    latestHeader: { type: String, default: 'New Viral Link' },
    popularHeader: { type: String, default: 'Trending Links' },
    footer: { type: String, default: '© TeleVideo Pro' },
    pinchZoom: { type: Boolean, default: false },
  },
  sponsor: {
    enabled: { type: Boolean, default: false },
    url: String,
    image: String,
    title: String,
    seconds: { type: Number, default: 5 },
  },
}, { minimize: false }));

export { User, Otp, Video, Progress, Config };
