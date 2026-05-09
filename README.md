# 📸 TWEETBOOK

**Convert any tweet into a beautiful, customizable screenshot.**

Paste a Twitter/X link, pick a theme, tweak the design, and export as a high-resolution image — all in your browser.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Instant Generation** | Paste any `twitter.com` or `x.com` URL and get a rendered tweet card |
| **6 Preset Themes** | Default, Midnight, Sunset, Clean, Neon, and No Background |
| **12+ Gradient Backgrounds** | Purple, Ocean, Sunset, Rose, Emerald, and more |
| **Transparent Background** | Export tweet cards with no background (transparent PNG) |
| **Card Themes** | Light, Dark, and Dim card styles matching Twitter's own themes |
| **Full Customization** | Border radius, shadow, border, padding, width, aspect ratio, font scale |
| **Element Toggles** | Show/hide avatar, metrics, timestamp, verified badge, X logo |
| **Custom Watermark** | Add branding text in any corner |
| **High-Res Export** | PNG, JPG, or SVG at 1x, 2x, or 3x resolution |
| **Copy to Clipboard** | One-click copy for instant sharing |
| **Live Preview** | All changes update in real-time at 60fps |

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### Install & Run

```bash
# Clone the repository
git clone https://github.com/yourusername/tweetshot.git
cd tweetshot

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 🏗️ Production Build

```bash
# Build the frontend
npm run build

# Start production server (Linux/Mac)
npm start

# Start production server (Windows)
npm run start:win
```

The production server serves the built frontend and API from a single Express server on port `3001` (or `PORT` env variable).

---

## 🌐 Deployment

### Deploy to Railway / Render / Fly.io

1. Push your code to GitHub
2. Connect the repo to your hosting provider
3. Set the build command: `npm run build`
4. Set the start command: `npm start`
5. Set environment variable: `PORT=3001` (or provider default)

### Deploy to VPS

```bash
git clone https://github.com/yourusername/tweetshot.git
cd tweetshot
npm install
npm run build
PORT=80 npm start
```

### Deploy with Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server.js"]
```

---

## 🏛️ Architecture

```
TWEETBOOK/
├── index.html          # Single-page app entry
├── style.css           # Design system & all styles
├── main.js             # App logic, state, rendering, export
├── server.js           # Express API proxy + production server
├── vite.config.js      # Vite dev config with API proxy
├── package.json        # Dependencies & scripts
└── README.md           # This file
```

### How It Works

1. **User pastes a tweet URL** → Frontend extracts the tweet ID
2. **Frontend calls `/api/tweet/:id`** → Express server proxies the request
3. **Server fetches tweet data** from Twitter's syndication API (with FxTwitter fallback)
4. **Tweet card renders** in the browser DOM with full styling
5. **User customizes** via sidebar controls — all changes apply instantly via `requestAnimationFrame`
6. **Export** uses `html-to-image` to convert the DOM node to a high-fidelity image

### Why a Backend Proxy?

Twitter's APIs don't set CORS headers for browser requests. The Express server acts as a lightweight proxy, fetching tweet data server-side and returning it to the frontend. This avoids CORS issues without requiring any Twitter API keys.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Vite** | Build tool & dev server |
| **Vanilla JS** | Zero-framework frontend for maximum speed |
| **Express.js** | API proxy & production server |
| **html-to-image** | DOM-to-image export engine |
| **Inter** | Typography (Google Fonts) |

---

## 📝 License

MIT © TWEETBOOK

---

<p align="center">
  Built with ⚡ by TWEETBOOK
</p>
