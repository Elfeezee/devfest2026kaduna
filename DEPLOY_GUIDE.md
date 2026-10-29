# 🚀 DevFest 2026 Live Deployment Guide

This guide walks you through taking the DevFest Quiz Arena live on the internet so that 1,000 attendees can join from anywhere with a custom public URL and QR code.

---

## ⚡ Option 1: 1-Click Deploy on Render.com (Recommended)

Render offers free hosting with native WebSocket support, automatic HTTPS, and automatic custom domains.

### Step 1: Push Code to GitHub
1. Create a new repository on [GitHub](https://github.com/new) called `devfest-quiz-arena`.
2. In your terminal, run:
```bash
git remote add origin https://github.com/YOUR_USERNAME/devfest-quiz-arena.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Select your GitHub repository `devfest-quiz-arena`.
4. Render will automatically detect [render.yaml](file:///c:/Users/El_feezee/Desktop/games/render.yaml). If configuring manually, use:
   - **Environment**: `Node`
   - **Build Command**: `npm run install:all && npm run build`
   - **Start Command**: `npm start`
5. Click **Create Web Service**.
6. Render will build and give you a live URL:
   👉 `https://devfest-quiz-arena.onrender.com`

---

## 🚂 Option 2: Deploy on Railway.app

1. Go to [Railway.app](https://railway.app).
2. Click **Start a New Project** -> **Deploy from GitHub repo**.
3. Select `devfest-quiz-arena`.
4. Railway will automatically build the [Dockerfile](file:///c:/Users/El_feezee/Desktop/games/Dockerfile) and launch the app with a public domain.

---

## 📱 Option 3: Immediate Live Access for Mobile Testing

A public tunnel is active right now for real-device testing:
👉 **URL:** `https://cold-parts-beam.loca.lt`

*(To test on phones connected to the same Wi-Fi network, attendees can also browse directly to your machine's local IP address: `http://YOUR_LOCAL_IP:4000`)*.
