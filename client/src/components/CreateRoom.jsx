import { useState, useRef } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import TransferProgress from "./TransferProgress";

export default function CreateRoom({ onBack }) {
  const {
    roomCode,
    peerConnected,
    transferProgress,
    transferStatus,
    errorMsg,
    createRoom,
    sendFile,
  } = useWebRTC();

  const [selectedFile, setSelectedFile] = useState(null);
  const [roomCreated, setRoomCreated] = useState(false);
  const fileInputRef = useRef(null);

  const handleCreateRoom = () => {
    createRoom();
    setRoomCreated(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleSend = () => {
    if (selectedFile) sendFile(selectedFile);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  return (
    <div className="panel">
      <button className="btn-back" onClick={onBack}>
        ← Back
      </button>

      {!roomCreated ? (
        <div className="step">
          <h2>Step 1: Create a Room</h2>
          <p className="step-desc">
            Generate a room code and share it with the receiver.
          </p>
          <button className="btn btn-send" onClick={handleCreateRoom}>
            Generate Room Code
          </button>
        </div>
      ) : (
        <>
          {/* Room code display */}
          <div className="room-code-display">
            <p>Share this code with the receiver:</p>
            <div className="code">{roomCode}</div>
            <span className={`status ${peerConnected ? "online" : "waiting"}`}>
              {peerConnected
                ? "✅ Peer connected!"
                : "⏳ Waiting for peer..."}
            </span>
          </div>

          {/* File selection (only after peer connects) */}
          {peerConnected &&
            transferStatus !== "transferring" &&
            transferStatus !== "complete" && (
              <div className="step">
                <h2>Step 2: Select a File</h2>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  hidden
                />
                <button
                  className="btn btn-file"
                  onClick={() => fileInputRef.current.click()}
                >
                  📁 Choose File
                </button>

                {selectedFile && (
                  <div className="file-info">
                    <div className="file-info-details">
                      <span className="file-icon">📄</span>
                      <div>
                        <p className="file-name-text">{selectedFile.name}</p>
                        <p className="file-size-text">
                          {formatSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                    <button className="btn btn-send" onClick={handleSend}>
                      🚀 Send
                    </button>
                  </div>
                )}
              </div>
            )}

          {/* Transfer progress */}
          {(transferStatus === "transferring" ||
            transferStatus === "complete") && (
            <TransferProgress
              progress={transferProgress}
              status={transferStatus}
              fileName={selectedFile?.name}
              fileSize={selectedFile?.size}
            />
          )}

          {/* Error */}
          {transferStatus === "error" && (
            <div className="step">
              <p className="status error">❌ {errorMsg || "Something went wrong"}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

