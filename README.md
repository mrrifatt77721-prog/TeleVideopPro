# TeleVideo Pro — Telegram Mini App

Dark-themed Telegram Mini App with email/OTP login, a video-link feed, a task "gateway" that unlocks download links, a rewards/check-in system, and a full admin CMS.

**Stack:** React 18 + Vite + Tailwind (client) · Node/Express + MongoDB (server) · Telegram WebApp SDK

## Structure

```
televideo-pro/
├─ server/            Express API (auth, OTP, videos, tasks, admin, uploads)
│  ├─ index.js        app bootstrap, serves client/dist in production
│  ├─ routes.js       all API endpoints
│  ├─ models.js       User, Otp, Video, Progress, Config
│  └─ util.js         JWT, OTP mail, Telegram initData + membership checks
└─ client/            React Mini App
   └─ src/
      ├─ ctx.jsx      global state (user, config, toasts, theme, zoom)
      ├─ api.js       fetch wrapper, uploads, image crop, Telegram helpers
      └─ components/  Login, Home (feed), TaskModal, ProfileModal, MyFiles,
                      Marquee, WelcomeModal, SponsorOverlay, admin/*
```

## Quick start

```bash
npm run install:all
cp server/.env.example server/.env     # edit values
npm run dev:server                      # API on :4000 (needs MongoDB)
npm run dev:client                      # app on :5173 (proxies /api)
```

Without SMTP configured, the OTP is printed in the server console and (outside production) shown as a toast in the app — handy for local testing.

## Admin access

Log in with the email set in `ADMIN_EMAIL`; after the OTP you'll be asked for the 4-digit `ADMIN_PIN` (default `1234`). The **Admin Control Panel** button then appears in Profile. Admin rights are verified **server-side** in the JWT — change the PIN and `JWT_SECRET` before going live (the server warns if you don't).

## Deploy as a Telegram Mini App

1. `npm run build` then `npm start` — the server serves `client/dist` and `/api` from one origin. Host anywhere with HTTPS (Render, Railway, Fly, VPS + Caddy/nginx). Use MongoDB Atlas for the DB.
2. Persist `server/uploads/` (volume), or swap `multer` storage for S3/Cloudinary.
3. In **@BotFather**: `/newapp` (or set the menu button via `/setmenubutton`) and point it at your HTTPS URL.
4. Set `VITE_TG_APP_LINK=https://t.me/YourBot/app` in `client/.env` **before building** so share buttons create `?startapp=v_<id>` deep links that open a specific video.
5. Optional real channel checks: set `BOT_TOKEN`, add the bot as an admin in each required channel, and enter each channel's `@username` in the video form. Without it, Join tasks are timer-based only.

## One-click-ish deploy on Render (free)

1. Push this folder to a GitHub repo.
2. Create a free cluster on **MongoDB Atlas** → Database Access (user) + Network Access (allow `0.0.0.0/0`) → copy the connection string.
3. On **Render** → New → *Blueprint* → pick the repo (it reads `render.yaml`). Fill `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PIN` and the SMTP values.
4. When it's live, open `https://<name>.onrender.com`, then set that URL in **@BotFather → /newapp** (or `/setmenubutton`).
5. **SMTP is required in production** (e.g. Brevo/Gmail app password) — without it OTP codes are only printed in the server log and users can't sign in.

Free Render services sleep when idle (slow first open) and lose local `server/uploads` on restart; use a paid disk or Cloudinary/S3 for uploaded files.

## How the gateway works

- The feed never includes destination links. `POST /videos/:id/unlock` returns the link only after the server has recorded all steps.
- One task per tap: the card shows **Task (done/total)**; tapping opens a single task (ad/partner link) → animated countdown (default 3 s, configurable per video) → "Done!" → the page closes and the counter increases. Tap Task again for the next one; after the last task the button becomes **Download**.
- Each step: `tasks/start` stamps a time → `tasks/verify` is accepted only after the configured countdown has elapsed server-side (can't be skipped by tampering with the client).
- Skip tokens (earned on day 7 of the check-in streak) can skip a step.

## Feature checklist

Email + OTP login with resend timer · admin PIN · marquee ticker (pausable) · welcome popup · search · Latest/Popular tabs · video cards with task badges, download & share · floating "My Downloads" button · profile with stats, 7-day check-in, light/dark, alerts, photo/name edit, logout · task modal with progress · admin: upload (MP4 or link), thumbnail crop 16:9/4:3/1:1, ad or Telegram-join tasks, destination link, button customization, manage/edit/delete, notice & marquee editor, branding + pinch-zoom toggle, sponsor setup, basic analytics.

## Notes

- The "Alerts" toggle stores the preference; wiring push messages would need a bot sending to users' `telegramId` (captured when initData is present).
- Rate limiting, Helmet, input validation and hashed/expiring OTPs are enabled by default.
