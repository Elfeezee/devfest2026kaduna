# 🔥 DevFest Kaduna 2026 - Live Firebase Deployment

Your app is officially live on **Firebase Hosting**!

### 🌐 Live URLs:
- Primary Domain: **[https://devfestkaduna2026.web.app](https://devfestkaduna2026.web.app)**
- Firebase Subdomain: **[https://devfestkaduna2026.firebaseapp.com](https://devfestkaduna2026.firebaseapp.com)**
- Firebase Console: **[https://console.firebase.google.com/project/devfestkaduna2026/overview](https://console.firebase.google.com/project/devfestkaduna2026/overview)**

---

## ⚡ Connecting the Real-Time Game Server (1,000 Sockets)

Your frontend is distributed across Google's global CDN via Firebase Hosting.

To power the 1,000 real-time WebSockets:

### Option A: Free Cloud Backend on Render / Railway
1. Deploy `server/` to Render or Railway (e.g., `https://devfest-backend.onrender.com`).
2. In `client/.env.production`, set:
   ```env
   VITE_SERVER_URL=https://devfest-backend.onrender.com
   ```
3. Re-run:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```
Your `devfestkaduna2026.web.app` will automatically stream all live questions, tallies, and podium events through your cloud backend!

### Option B: Google Cloud Run (Same Project: `devfestkaduna2026`)
Deploy the backend container to Cloud Run within the `devfestkaduna2026` project. In `firebase.json`:
```json
{
  "hosting": {
    "public": "client/dist",
    "rewrites": [
      { "source": "/socket.io/**", "run": { "serviceId": "devfest-quiz-server", "region": "us-central1" } },
      { "source": "/api/**", "run": { "serviceId": "devfest-quiz-server", "region": "us-central1" } },
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```
