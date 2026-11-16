import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: allowedOrigins }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Room Management ─────────────────────────────────────────────
// Map<roomCode, { sender: socketId, receiver: socketId | null }>
const rooms = new Map();

function generateRoomCode() {
  // 4-character alphanumeric code — no 0/O/1/I to avoid confusion
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

// ── Socket.IO Event Handling ────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  // --- Sender creates a room ---
  socket.on("create-room", (callback) => {
    const code = generateRoomCode();
    rooms.set(code, { sender: socket.id, receiver: null });
    socket.join(code);
    socket.data.room = code;
    socket.data.role = "sender";
    console.log(`📦 Room created: ${code} by ${socket.id}`);
    callback({ code });
  });

  // --- Receiver joins a room ---
  socket.on("join-room", (code, callback) => {
    const room = rooms.get(code);
    if (!room) {
      return callback({ error: "Room not found" });
    }
    if (room.receiver) {
      return callback({ error: "Room is full" });
    }
    room.receiver = socket.id;
    socket.join(code);
    socket.data.room = code;
    socket.data.role = "receiver";
    console.log(`🔗 ${socket.id} joined room: ${code}`);

    // Tell the sender a peer has arrived
    io.to(room.sender).emit("peer-joined");
    callback({ success: true });
  });

  // --- WebRTC Signaling: relay offer/answer/ice between peers ---
  socket.on("signal", (data) => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room) return;

    // Forward to the OTHER peer in the room
    const targetId =
      socket.data.role === "sender" ? room.receiver : room.sender;
    if (targetId) {
      io.to(targetId).emit("signal", data);
    }
  });

  // --- File metadata (name, size, type) sent before transfer ---
  socket.on("file-meta", (meta) => {
    const code = socket.data.room;
    const room = rooms.get(code);
    if (!room) return;
    const targetId =
      socket.data.role === "sender" ? room.receiver : room.sender;
    if (targetId) {
      io.to(targetId).emit("file-meta", meta);
    }
  });

  // --- Cleanup on disconnect ---
  socket.on("disconnect", () => {
    const code = socket.data.room;
    if (code) {
      const room = rooms.get(code);
      if (room) {
        // Notify the other peer
        const targetId =
          socket.data.role === "sender" ? room.receiver : room.sender;
        if (targetId) {
          io.to(targetId).emit("peer-disconnected");
        }
        rooms.delete(code);
      }
    }
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

// ── Start ───────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT,"0.0.0.0", () => {
  console.log(`🚀 Signaling server running on http://localhost:${PORT}`);
});

