import { useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import TransferProgress from "./TransferProgress";

export default function JoinRoom({ onBack }) {
  const {
    peerConnected,
    transferProgress,
    transferStatus,
    receivedFile,
    fileMeta,
    errorMsg,
    joinRoom,
  } = useWebRTC();

  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = () => {
    if (code.length === 4) {
      joinRoom(code.toUpperCase());
      setJoining(true);
    }
  };

  const handleDownload = () => {
    if (!receivedFile) return;
    const a = document.createElement("a");
    a.href = receivedFile.url;
    a.download = receivedFile.name;
    a.click();
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
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

      {!joining && (
        <div className="step">
          <h2>Enter Room Code</h2>
          <p className="step-desc">
            Enter the 4-character code from the sender's device.
          </p>
          <div className="code-input-group">
            <input
              type="text"
              className="code-input"
              maxLength={4}
              placeholder="XXXX"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))
              }
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              autoFocus
            />
            <button
              className="btn btn-receive"
              onClick={handleJoin}
              disabled={code.length !== 4}
            >
              Connect
            </button>
          </div>
        </div>
      )}

      {joining && peerConnected && transferStatus === "connecting" && (
        <div className="step">
          <div className="waiting-card">
            <div className="pulse-dot"></div>
            <p className="status online">
              Connected! Waiting for sender to share a file...
            </p>
          </div>
        </div>
      )}

      {joining && !peerConnected && transferStatus === "connecting" && (
        <div className="step">
          <div className="waiting-card">
            <div className="spinner"></div>
            <p className="status waiting">Establishing connection...</p>
          </div>
        </div>
      )}

      {(transferStatus === "transferring" || transferStatus === "complete") && (
        <>
          <TransferProgress
            progress={transferProgress}
            status={transferStatus}
            fileName={fileMeta?.name}
            fileSize={fileMeta?.size}
          />

          {transferStatus === "complete" && receivedFile && (
            <div className="step download-section">
              <div className="file-info">
                <div className="file-info-details">
                  <span className="file-icon">📄</span>
                  <div>
                    <p className="file-name-text">{receivedFile.name}</p>
                    <p className="file-size-text">
                      {formatSize(receivedFile.size)}
                    </p>
                  </div>
                </div>
              </div>
              <button className="btn btn-send" onClick={handleDownload}>
                💾 Save File
              </button>
            </div>
          )}
        </>
      )}

      {transferStatus === "error" && (
        <div className="step">
          <p className="status error">
            ❌ {errorMsg || "Connection lost. Please try again."}
          </p>
          <button className="btn btn-receive" onClick={() => { setJoining(false); setCode(""); }}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

