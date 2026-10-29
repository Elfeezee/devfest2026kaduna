# ⚡ DevFest 2026 Live Quiz Arena (Kahoot Clone)

An ultra-responsive, real-time interactive quiz platform designed for high-concurrency developer events like **DevFest 2026**, capable of supporting **1,000+ concurrent live participants** on their mobile phones.

Built with **Node.js, Express, Socket.IO, React, Vite**, and the **Web Audio API**.

---

## 🌟 Key Features

### 1. 📺 Stage Host Display (Projector / Big Screen)
- **Automatic 6-digit Game PIN & Scannable QR Code**: Attendees point their phone cameras at the screen to join in 1 tap (`?pin=XXXXXX`).
- **Real-Time Lobby Counter & Avatar Cloud**: Visual badge cloud of incoming developers with fun avatars.
- **Synchronized Question Display**: Circular countdown timer, question titles, optional syntax-highlighted code snippets, and 4 iconic Kahoot-style colored cards (▲ Red, ◆ Blue, ● Yellow, ■ Green).
- **Throttled Live Answer Meter**: Real-time counter of votes cast across 1,000 players without client or server socket flooding.
- **Dynamic Results Bar Chart**: Animated distribution graph showing option breakdown and highlighting the correct answer with an emerald checkmark.
- **Top 10 Live Leaderboard**: Real-time score recalculation, streak counters (🔥 3 in a row!), and position change badges.
- **Grand Finale 3-Step Podium**: Olympic-style 1st, 2nd, and 3rd place pedestals with golden cup, continuous confetti explosions, and victory fanfare!
- **Pure Web Audio API Sound Synthesizer**: Zero external mp3 dependencies — ticking timers, gong chimes, and podium fanfare work 100% offline or online.

### 2. 📱 Participant Mobile Experience (Attendee Phones)
- **Instant 1-Tap Join Flow**: Auto-fills Game PIN from QR code, customizable nickname, and 12 developer avatars (🚀, 🤖, ⚡, 💻, 🔥, 🧠, etc.).
- **Tactile 4-Color Answer Grid**: Full-screen touch buttons with haptic vibration feedback (`navigator.vibrate`) for instant response.
- **Offline / Sleep Reconnection Resilience**: Session state stored in `localStorage` — if an attendee's phone sleeps or reconnects to venue Wi-Fi, their score, streak, and rank are restored immediately.
- **Instant Result & Rank Feedback**: Shows personal score increase (+950 pts), streak bonus, and individual ranking (e.g., *"You are #14 of 842"*).

### 3. 🛠️ Quiz Creator & Admin Studio
- Edit and save quizzes directly in the browser.
- Configurable per-question time limits (10s, 15s, 20s, 30s, 60s).
- Optional syntax-highlighted code snippet blocks for developer trivia.
- Pre-loaded with the **DevFest 2026 Grand Tech Trivia** (Flutter, Cloud Run, Generative AI LoRA, WebAssembly, Git, JavaScript internals).

### 4. 🤖 Built-In 1,000-Player Concurrency Simulator
- Stress-test the system before the event with **+100, +500, or +1,000 simulated participants** right from the host lobby.
- Simulates realistic human reaction delays, random accuracy distribution, and socket answer batches.

---

## 🚀 Quick Start Guide

### 1. Start the Server Locally
```bash
# In the workspace root
npm start
```
The server will boot and serve the complete app at:
👉 **`http://localhost:4000`**

### 2. Development Mode (Hot Reloading)
```bash
# Terminal 1: Backend with file watcher
npm run dev:server

# Terminal 2: Frontend with Vite HMR
npm run dev:client
```

---

## 🌐 Deploying to the Cloud for DevFest 2026

For 1,000 simultaneous attendees connecting via mobile 4G/5G or venue Wi-Fi, deploy the server to a cloud provider with WebSocket support:

### Option A: Render.com (Recommended - 5 Minutes)
1. Push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New + Web Service**.
3. Select your repository.
4. Settings:
   - **Environment**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
5. Attach your custom event domain (e.g. `quiz.devfest2026.com`).

### Option B: Railway.app
1. Click **New Project** -> **Deploy from GitHub repo**.
2. Railway will automatically detect Node.js, run the build, and assign a live HTTPS URL with WebSocket support.

### Option C: Fly.io or VPS (DigitalOcean / AWS / GCP Compute Engine)
```bash
# Dockerfile or direct node execution
npm run build
NODE_ENV=production PORT=80 node server/server.js
```

---

## ⚡ 1,000 Concurrent Players Architecture

When 1,000 attendees hit an answer button in a 10-second window, traditional socket architectures flood the host browser with 1,000 individual events. This platform solves this via:

1. **Throttled Batch Tallies**: The server buffers answer counts and emits aggregated updates to the host every **200ms**, reducing 1,000 events down to just 50 lightweight ticks.
2. **O(N log N) Instant Sorting**: Scores and ranks are calculated in memory in under 2 milliseconds for 1,000 players.
3. **Low Bandwidth Footprint**: Socket payloads use compact JSON structures with minimal overhead.
4. **Zero-Lag Audio**: Audio tones are synthesized dynamically via browser `AudioContext` without network streaming.

---

## 📂 Project Structure

```
├── client/                     # Vite + React Mobile & Stage Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── HostView.jsx    # Stage display (PIN, QR, Live tally, Leaderboard, Podium)
│   │   │   ├── PlayerView.jsx  # Mobile participant touch UI
│   │   │   └── QuizEditor.jsx  # Admin quiz builder & question manager
│   │   ├── context/
│   │   │   └── SocketContext.jsx # Socket.io connection manager
│   │   ├── utils/
│   │   │   └── audio.js        # Web Audio API sound generator
│   │   ├── App.jsx             # Main navigation & live status
│   │   └── index.css           # Glassmorphism, DevFest & Kahoot color tokens
│   └── dist/                   # Production-optimized build
├── server/                     # Node.js + Express + Socket.IO Backend
│   ├── data/
│   │   └── quizzes.json        # Pre-loaded DevFest tech quizzes
│   ├── gameManager.js          # Room state machine, batch tallies & bot simulator
│   └── server.js               # Express API & Socket.io server
└── package.json                # Root orchestration scripts
```

---

🎉 *Have an amazing DevFest 2026!*
