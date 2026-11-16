export default function TransferProgress({ progress, status, fileName, fileSize }) {
  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024)
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  return (
    <div className="transfer-progress">
      <div className="transfer-header">
        <span className="transfer-icon">
          {status === "complete" ? "✅" : "📡"}
        </span>
        <div>
          <p className="transfer-label">
            {status === "transferring" ? "Transferring..." : "Transfer Complete!"}
          </p>
          <p className="transfer-file-name">{fileName}</p>
          {fileSize && (
            <p className="transfer-file-size">{formatSize(fileSize)}</p>
          )}
        </div>
      </div>

      <div className="progress-bar-bg">
        <div
          className={`progress-bar-fill ${status === "complete" ? "complete" : ""}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="progress-text">{progress}%</p>
    </div>
  );
}

