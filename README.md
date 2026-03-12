# 🔍 AI Detector — Is it Real or AI Generated?

Detect AI-generated images and videos using **Hive AI** + **Claude Vision**.
Identifies the content AND which AI tool (Midjourney, DALL·E, Sora, etc.) likely created it.

---

## ✅ Setup in 5 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Your API Keys

Open `.env.local` and fill in your keys:

```env
HIVE_API_KEY=qGp6PANJ1X8p9cG88xcqLg==
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

> **Get your Anthropic key:** https://console.anthropic.com/
> **Your Hive key is already filled in above.**

### 3. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 🚀 Deploy to Vercel (Free)

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. In Vercel dashboard → **Settings → Environment Variables**, add:
   - `HIVE_API_KEY` = your Hive key
   - `ANTHROPIC_API_KEY` = your Anthropic key
4. Click **Deploy** — done!

---

## 🧠 How It Works

| Layer | Engine | Role |
|-------|--------|------|
| Primary | **Hive AI** | Binary AI/real classification with confidence score |
| Secondary | **Claude Vision** | Identifies *which* AI model generated the content |
| Combined | Weighted average (60% Hive + 40% Claude) | Final score |

### Supported Inputs
- **Images:** JPG, PNG, WEBP, GIF (max 50MB)
- **Videos:** MP4, MOV, WEBM (max 50MB)

### AI Tools Detected (32+)
Midjourney, DALL·E 3, DALL·E 2, Stable Diffusion, Adobe Firefly,
Runway Gen-2/3, Sora, Kling, Pika Labs, Leonardo AI, Ideogram,
Flux, Imagen, Playground AI, HeyGen, Synthesia, D-ID, and more.

---

## 🔒 Security

- API keys are **server-side only** (in `/pages/api/`) — never exposed to the browser
- Files are processed in memory and not stored anywhere
- `.env.local` is in `.gitignore` — never committed to git

---

## 📁 Project Structure

```
ai-detector/
├── pages/
│   ├── index.js          ← Main UI
│   ├── _app.js           ← App wrapper
│   └── api/
│       ├── hive.js       ← Hive API proxy (server-side)
│       └── claude.js     ← Claude API proxy (server-side)
├── styles/
│   └── globals.css       ← Global styles & CSS variables
├── .env.local            ← Your API keys (never commit this!)
├── .gitignore
├── next.config.js
└── package.json
```
