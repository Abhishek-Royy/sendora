import { useState, useRef } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import TransferProgress from "./TransferProgress";

// Safety threshold: browser in-memory Blob limit is ~1.5 - 2 GB
const MAX_FILE_SIZE = 1.5 * 1024 * 1024 * 1024; // 1.5 GB
const WARN_FILE_SIZE = 500 * 1024 * 1024; // 500 MB (warning for slower/relayed connections)

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
  const [fileError, setFileError] = useState("");
  const [roomCreated, setRoomCreated] = useState(false);
  const fileInputRef = useRef(null);

  const handleCreateRoom = () => {
    createRoom();
    setRoomCreated(true);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setFileError("");
    if (!file) return;

    if (file.size === 0) {
      setFileError("Selected file is empty (0 Bytes). Please pick a valid file.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError(
        `File is too large (${formatSize(file.size)}). Current in-browser limit is 1.5 GB to prevent tab crashes.`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleSend = () => {
    if (selectedFile && !fileError) {
      sendFile(selectedFile);
    }
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
                <div className="step-header-row">
                  <h2>Step 2: Select a File</h2>
                  <span className="size-badge">Max 1.5 GB</span>
                </div>
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

                {/* Validation error message */}
                {fileError && (
                  <div className="validation-box error-box">
                    <span>⚠️</span>
                    <p>{fileError}</p>
                  </div>
                )}

                {/* Warning for large files */}
                {selectedFile && selectedFile.size > WARN_FILE_SIZE && (
                  <div className="validation-box warning-box">
                    <span>💡</span>
                    <p>
                      Large file ({formatSize(selectedFile.size)}): Best transferred on the same Wi-Fi. Ensure both browser tabs stay awake during transfer.
                    </p>
                  </div>
                )}

                {selectedFile && !fileError && (
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

