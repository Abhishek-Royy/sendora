import { useRef, useState, useCallback, useEffect } from "react";
import { io } from "socket.io-client";

const SIGNALING_SERVER =
  import.meta.env.VITE_SIGNALING_URL || `http://${window.location.hostname}:3001`;
const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk

// ICE servers: STUN (free) + TURN (for restrictive NATs)
// TURN credentials loaded from env vars so they don't leak into source control
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME || "";
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL || "";

const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// Only add TURN servers if credentials are configured
if (TURN_USERNAME && TURN_CREDENTIAL) {
  iceServers.push(
    {
      urls: "turn:a.relay.metered.ca:443?transport=tcp",
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    },
    {
      urls: "turns:a.relay.metered.ca:443?transport=tcp",
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    }
  );
}

const ICE_SERVERS = { iceServers };


export function useWebRTC() {
  const socketRef = useRef(null);
  const pcRef = useRef(null);           // RTCPeerConnection
  const dcRef = useRef(null);           // RTCDataChannel

  const [roomCode, setRoomCode] = useState("");
  const [connected, setConnected] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferStatus, setTransferStatus] = useState("idle");
  // idle | waiting | connecting | transferring | complete | error
  const [receivedFile, setReceivedFile] = useState(null);
  const [receivedText, setReceivedText] = useState(null);
  const [fileMeta, setFileMeta] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Incoming file buffer
  const receiveBufferRef = useRef([]);
  const receivedSizeRef = useRef(0);
  const fileMetaRef = useRef(null);

  // ── Socket.IO connection ──────────────────────────────────────
  const connectSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;

    const socket = io(SIGNALING_SERVER, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.log("Socket disconnected");
    });

    socket.on("peer-disconnected", () => {
      setPeerConnected(false);
      setTransferStatus("error");
      setErrorMsg("Peer disconnected");
      cleanup();
    });

    return socket;
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    dcRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [cleanup]);

  // ── Create RTCPeerConnection ──────────────────────────────────
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("signal", {
          type: "ice-candidate",
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setPeerConnected(true);
      }
      if (
        pc.connectionState === "failed" ||
        pc.connectionState === "disconnected"
      ) {
        setTransferStatus("error");
        setErrorMsg("WebRTC connection failed");
      }
    };

    return pc;
  }, []);

  // ── SENDER: Create Room ───────────────────────────────────────
  const createRoom = useCallback(() => {
    const socket = connectSocket();
    socket.emit("create-room", ({ code }) => {
      setRoomCode(code);
      setTransferStatus("waiting");
      console.log("Room created:", code);
    });

    // When receiver joins, start WebRTC handshake
    socket.on("peer-joined", async () => {
      console.log("Peer joined, creating offer...");
      const pc = createPeerConnection();

      // Create DataChannel (sender creates it)
      const dc = pc.createDataChannel("file-transfer", {
        ordered: true,
      });
      dcRef.current = dc;

      dc.binaryType = "arraybuffer";
      dc.onopen = () => {
        console.log("DataChannel open (sender)");
        setPeerConnected(true);
        setTransferStatus("connecting");
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("signal", { type: "offer", sdp: offer });
    });

    // Handle incoming signaling messages
    socket.on("signal", async (data) => {
      const pc = pcRef.current;
      if (!pc) return;

      if (data.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === "ice-candidate") {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("Error adding ICE candidate:", e);
        }
      }
    });
  }, [connectSocket, createPeerConnection]);

  // ── RECEIVER: Join Room ───────────────────────────────────────
  const joinRoom = useCallback(
    (code) => {
      const socket = connectSocket();

      socket.emit("join-room", code, async (response) => {
        if (response.error) {
          console.error(response.error);
          setTransferStatus("error");
          setErrorMsg(response.error);
          return;
        }

        setRoomCode(code);
        setTransferStatus("connecting");
      });

      // Listen for file metadata
      socket.on("file-meta", (meta) => {
        fileMetaRef.current = meta;
        setFileMeta(meta);
        console.log("Receiving file:", meta.name, meta.size, "bytes");
      });

      // Handle signaling
      socket.on("signal", async (data) => {
        if (data.type === "offer") {
          const pc = createPeerConnection();

          // Handle incoming DataChannel (receiver listens for it)
          pc.ondatachannel = (event) => {
            const dc = event.channel;
            dcRef.current = dc;
            dc.binaryType = "arraybuffer";

            dc.onopen = () => {
              console.log("DataChannel open (receiver)");
              setPeerConnected(true);
            };

            dc.onmessage = (msgEvent) => {
              // Check for "end of file" signal
              if (
                typeof msgEvent.data === "string" &&
                msgEvent.data === "EOF"
              ) {
                // Assemble the file
                const blob = new Blob(receiveBufferRef.current, {
                  type:
                    fileMetaRef.current?.type || "application/octet-stream",
                });
                const url = URL.createObjectURL(blob);
                setReceivedFile({
                  url,
                  name: fileMetaRef.current?.name || "download",
                  size: blob.size,
                });

                if (fileMetaRef.current?.isText) {
                  blob
                    .text()
                    .then((text) => {
                      setReceivedText(text);
                    })
                    .catch((err) => {
                      console.error("Failed to decode text:", err);
                    });
                }

                setTransferStatus("complete");
                setTransferProgress(100);

                // Reset buffer
                receiveBufferRef.current = [];
                receivedSizeRef.current = 0;
                return;
              }

              // Accumulate binary chunks
              receiveBufferRef.current.push(msgEvent.data);
              receivedSizeRef.current += msgEvent.data.byteLength;
              if (fileMetaRef.current?.size) {
                const pct = Math.min(
                  100,
                  Math.round(
                    (receivedSizeRef.current / fileMetaRef.current.size) * 100
                  )
                );
                setTransferProgress(pct);
                setTransferStatus("transferring");
              }
            };
          };

          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("signal", { type: "answer", sdp: answer });
        } else if (data.type === "ice-candidate") {
          try {
            await pcRef.current?.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          } catch (e) {
            console.error("Error adding ICE candidate:", e);
          }
        }
      });
    },
    [connectSocket, createPeerConnection]
  );

  // ── SENDER: Send File ─────────────────────────────────────────
  const sendFile = useCallback((file, isText = false) => {
    const dc = dcRef.current;
    if (!dc || dc.readyState !== "open") {
      console.error("DataChannel not open");
      setTransferStatus("error");
      setErrorMsg("DataChannel not open — peer may have disconnected");
      return;
    }

    // Send metadata through signaling channel first
    socketRef.current.emit("file-meta", {
      name: file.name,
      size: file.size,
      type: file.type,
      isText: Boolean(isText),
    });

    setTransferStatus("transferring");
    setTransferProgress(0);

    const reader = new FileReader();
    let offset = 0;

    const readSlice = () => {
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      const chunk = e.target.result;

      // Backpressure: wait if buffer is getting full
      if (dc.bufferedAmount > 16 * 1024 * 1024) {
        // 16 MB threshold
        dc.onbufferedamountlow = () => {
          dc.onbufferedamountlow = null;
          sendChunk(chunk);
        };
        dc.bufferedAmountLowThreshold = 1 * 1024 * 1024; // Resume at 1 MB
      } else {
        sendChunk(chunk);
      }
    };

    reader.onerror = () => {
      setTransferStatus("error");
      setErrorMsg("Failed to read file");
    };

    const sendChunk = (chunk) => {
      try {
        dc.send(chunk);
      } catch (err) {
        setTransferStatus("error");
        setErrorMsg("Transfer failed: " + err.message);
        return;
      }

      offset += chunk.byteLength;

      const pct = Math.min(100, Math.round((offset / file.size) * 100));
      setTransferProgress(pct);

      if (offset < file.size) {
        readSlice(); // Read next chunk
      } else {
        // Signal end of file
        dc.send("EOF");
        setTransferStatus("complete");
        setTransferProgress(100);
        console.log("File sent successfully!");
      }
    };

    readSlice(); // Start reading
  }, []);

  // ── SENDER: Send Text / Code ──────────────────────────────────
  const sendText = useCallback(
    (text, filename = "snippet.txt") => {
      const cleanName = filename.trim() || "snippet.txt";
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const file = new File([blob], cleanName, {
        type: "text/plain;charset=utf-8",
      });
      sendFile(file, true);
    },
    [sendFile]
  );

  return {
    roomCode,
    connected,
    peerConnected,
    transferProgress,
    transferStatus,
    receivedFile,
    receivedText,
    fileMeta,
    errorMsg,
    createRoom,
    joinRoom,
    sendFile,
    sendText,
  };
}

