# 🛰️ Command Centre

A self-contained, **local** command centre to automate and grow two businesses —
**Shanghai Beauty Mauritius** and **Green Eco Solar** — toward **10M MUR / month** each.

It combines **social media scheduling**, a **CRM** (WhatsApp / SMS / calls),
and **appointment booking** into a single browser dashboard that runs entirely
on your Windows laptop. All data lives in a local SQLite file; the only network
calls are to the official APIs you choose to connect.

> **Runs out of the box in DEMO MODE** — every integration (social publishing,
> WhatsApp/SMS sending, Google Calendar) is *simulated* until you add real API
> keys, so you can explore the full workflow immediately with `npm start`.

---

## ✨ Features

| Area | What you get |
|------|--------------|
| **Dashboard** | Revenue trackers vs. 10M MUR target (per business), today's appointments, unread messages, open deals, post status, engagement charts. |
| **CRM & Inbox** | Unified timeline per contact (WhatsApp + SMS + calls), reply directly, deal stages, "Mark as sale" with revenue attribution, manual call/SMS logging (for Microsoft Phone Link). |
| **Social Studio** | Create & schedule posts (text/image/video) to Facebook, Instagram, TikTok, YouTube. **Two posts/day** auto-publish per configurable schedule. |
| **Content Calendar** | Month view of all scheduled/published posts, colour-coded per platform. |
| **Appointments** | Manual booking + **public booking link** (`/book`), Google Calendar sync, double-booking guard, automated 24h reminders via WhatsApp/SMS. |
| **Tasks & Leads** | Follow-up task list with due dates. |
| **Command bar** | Natural-language commands, e.g. `post tomorrow at 9am to all platforms: New arrivals!` |
| **Security** | Password-protected dashboard, all secrets in `.env`, local-only data. |

---

## 🧰 Tech stack

- **Backend:** Node.js + Express, **SQLite** (`better-sqlite3`) with a tiny migration runner.
- **Frontend:** Single-page vanilla JS + custom CSS (no build step) + Chart.js (CDN).
- **Jobs:** `node-cron` for auto-publishing and reminders.
- **Auth:** session cookie + bcrypt-hashed password.

---

## 🚀 Quick start (Windows 10/11, Node.js v18+)

```powershell
# 1. Install Node.js 18+ from https://nodejs.org (LTS), then in this folder:
cd command-centre
npm install

# 2. Create your config from the template
copy .env.example .env
#    (edit .env — at minimum change SESSION_SECRET and ADMIN_PASSWORD)

# 3. Start it
npm start
```

Then open **http://localhost:4000** and log in with the credentials from your
`.env` (`ADMIN_USERNAME` / `ADMIN_PASSWORD`, defaults `admin` / `changeme`).

The database, admin user, both businesses, demo services and sample CRM data are
created automatically on first run. To re-seed manually: `npm run seed`.

> **macOS/Linux:** identical, but use `cp .env.example .env`.

---

## 🔐 Configuration & API keys

Everything is configured through the `.env` file. **Leave any key blank to keep
that integration in demo mode.** Fill them in one at a time as you obtain access.

### Core (required)

| Variable | Purpose |
|----------|---------|
| `SESSION_SECRET` | Long random string that signs your login cookie. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Your dashboard login. |
| `DEMO_MODE` | `true` = simulate integrations (safe for testing). Set `false` when going live. |
| `PUBLIC_BASE_URL` | Public URL of this app (used for booking links & webhooks). |

### Facebook & Instagram — Meta Graph API
1. Go to **https://developers.facebook.com/apps** → *Create App* → type **Business**.
2. Add the **Facebook Login** and **Instagram Graph API** products.
3. Get a **Page Access Token** (long-lived) via the Graph API Explorer, with
   `pages_manage_posts`, `pages_read_engagement`, `instagram_basic`,
   `instagram_content_publish` permissions.
4. Find your **Page ID** (Page → About) and **Instagram Business ID**
   (via `GET /{page-id}?fields=instagram_business_account`).
5. Fill: `META_APP_ID`, `META_APP_SECRET`, `META_PAGE_ID`,
   `META_PAGE_ACCESS_TOKEN`, `META_IG_BUSINESS_ID`.
   *(Instagram posts require a publicly reachable image/video URL.)*

### YouTube — YouTube Data API v3
1. **https://console.cloud.google.com** → new project → enable **YouTube Data API v3**.
2. Create **OAuth 2.0 Client ID** (Desktop). Run the consent flow to obtain a
   **refresh token** with scope `https://www.googleapis.com/auth/youtube.upload`.
3. Fill: `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.
   *(Video upload uses resumable OAuth upload — enable in production.)*

### TikTok — Content Posting API
1. **https://developers.tiktok.com** → register an app, apply for the
   **Content Posting API**.
2. Complete OAuth to get an **access token** (+ refresh token).
3. Fill: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_ACCESS_TOKEN`,
   `TIKTOK_REFRESH_TOKEN`. *(Posts pull video from a hosted URL.)*

### WhatsApp, SMS & Calls — Twilio (free trial)
1. Sign up at **https://www.twilio.com/console** (free trial credit).
2. Copy your **Account SID** and **Auth Token**.
3. Buy/claim an **SMS-capable number**; for WhatsApp use the
   **Twilio Sandbox** (`whatsapp:+14155238886`) or an approved sender.
4. Fill: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_NUMBER`,
   `TWILIO_WHATSAPP_NUMBER`.
5. **Inbound messages:** in the Twilio console point your number's
   *"A message comes in"* webhook to (see the Settings tab in-app):
   - SMS → `PUBLIC_BASE_URL/webhooks/twilio/sms`
   - WhatsApp → `PUBLIC_BASE_URL/webhooks/twilio/whatsapp`
   - Voice status → `PUBLIC_BASE_URL/webhooks/twilio/voice`
   To reach your laptop, run a tunnel: `ngrok http 4000` (or `cloudflared`)
   and set `PUBLIC_BASE_URL` to the tunnel URL.

### Google Calendar (appointment sync)
1. **https://console.cloud.google.com** → enable **Google Calendar API**.
2. Create an **OAuth 2.0 Client ID**, complete the consent flow to get a
   **refresh token** with scope `https://www.googleapis.com/auth/calendar.events`.
3. Fill: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`,
   `GOOGLE_CALENDAR_ID` (`primary` by default).

> **Microsoft Phone Link** has no public API. Use **CRM → "Log call / SMS"** to
> record those interactions manually — they appear in the same unified timeline.

---

## 📁 Project structure

```
command-centre/
├── server.js                 # Express app + route mounting + boot
├── package.json
├── .env.example              # copy to .env and fill in
├── data/                     # SQLite database (created at runtime)
├── uploads/                  # post media (served so social APIs can pull URLs)
├── src/
│   ├── config.js             # env loading + "is integration configured?" flags
│   ├── db.js                 # SQLite connection + migration runner + schema
│   ├── seed.js               # admin user, businesses, services, demo data
│   ├── auth.js               # bcrypt login + session guards
│   ├── scheduler.js          # cron: auto-publish posts + 24h reminders
│   ├── routes/               # contacts, messages, posts, appointments,
│   │                         # tasks, dashboard, command, webhooks
│   └── services/             # social/*, messaging (Twilio), calendar (Google)
└── public/                   # index.html (dashboard), login.html, book.html,
                              # app.js, styles.css
```

---

## 🗄️ Database schema (SQLite)

Tables: `users`, `businesses`, `contacts`, `messages`, `deals`, `tasks`,
`services`, `appointments`, `posts`, `post_schedule`, `engagement`, `settings`.
Migrations live in `src/db.js` and run automatically on start (tracked in
`_migrations`), so schema changes are additive and safe.

---

## 🧪 Try it (demo mode)

1. `npm start` → log in.
2. **CRM** → open *Priya Ramgoolam*, type a reply, hit send (simulated), then
   **Mark sale** → watch the dashboard revenue update.
3. **Social Studio** → write a caption, tick platforms, **Publish now** (simulated),
   then check the **Content Calendar** and dashboard post counts.
4. **Command bar** (top) → `post tomorrow at 9am to all platforms: 20% off facials!`
5. **Appointments** → **New appointment**, or open the public **/book** page.

---

## 🔒 Security notes

- Secrets live only in `.env` (git-ignored) — never hard-coded.
- The dashboard requires login; sessions are cookie-based and expire after 12h.
- Webhook endpoints (`/webhooks/...`) are intentionally public so Twilio can
  reach them — for production, add Twilio request-signature validation.
- All business data stays in `data/command-centre.db` on your machine.

---

## 📝 Assumptions & scope (MVP)

- **DEMO_MODE** simulates external calls so the app is fully testable without any
  accounts. Real credentials + `DEMO_MODE=false` switch to live behaviour.
- Instagram/TikTok publishing requires a **publicly reachable media URL**; in
  demo mode this is bypassed. YouTube video upload (resumable OAuth) is stubbed
  with a clear message — wire it in for production.
- Appointment booking is kept simple per the brief (manual + public link +
  Google Calendar sync + reminders). Currency is **MUR** throughout.
- Revenue is attributed from **won deals** (`Mark as sale` / manual deals).

---

## 🩹 Troubleshooting

- **`better-sqlite3` build error:** ensure Node 18+; it ships prebuilt binaries.
  If needed on Windows: `npm install --global windows-build-tools` then reinstall.
- **Port in use:** change `PORT` in `.env`.
- **Inbound WhatsApp/SMS not arriving:** confirm your tunnel is up and the Twilio
  webhook URL matches `PUBLIC_BASE_URL`.

---

MIT licensed. Built as a local MVP — extend freely.
