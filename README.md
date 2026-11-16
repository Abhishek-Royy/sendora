# 📡 Sendora — P2P File Transfer

Browser-based peer-to-peer file sharing using WebRTC DataChannels. Files transfer **directly between devices** — the server only handles signaling.

## Quick Start

### 1. Start the signaling server

```bash
cd server
npm install
npm run dev
```

### 2. Start the React client

```bash
cd client
npm install
npm run dev
```

### 3. Transfer a file

1. Open `http://localhost:5173` on **Device A** → click **Send File** → get a room code
2. Open `http://localhost:5173` on **Device B** → click **Receive File** → enter the code
3. Select a file on Device A and click **Send**
4. Device B sees progress → click **Save File** when complete

> **LAN usage:** Both devices must be on the same network. Replace `localhost` with your machine's local IP.

## Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Node.js + Express + Socket.IO (signaling only)
- **Transfer:** WebRTC DataChannel (peer-to-peer)

