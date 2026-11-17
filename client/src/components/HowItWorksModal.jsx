import { useEffect } from "react";

export default function HowItWorksModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-title-icon">💡</span>
            <h3 id="modal-title">How It Works</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close popup">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="how-step">
            <div className="how-step-num">1</div>
            <div className="how-step-info">
              <h4>Create a Room</h4>
              <p>The sender clicks <strong>Send File</strong> to generate a unique 4-character room code.</p>
            </div>
          </div>

          <div className="how-step">
            <div className="how-step-num">2</div>
            <div className="how-step-info">
              <h4>Join with Code</h4>
              <p>The receiver clicks <strong>Receive File</strong> on their device and enters the code to link.</p>
            </div>
          </div>

          <div className="how-step">
            <div className="how-step-num">3</div>
            <div className="how-step-info">
              <h4>Direct P2P Transfer</h4>
              <p>Sender picks a file. Data streams securely directly between browsers — never saved on any server.</p>
            </div>
          </div>

          <div className="how-tips">
            <div className="how-tip-item">
              <span className="tip-icon">🔒</span>
              <div>
                <strong>Private & Direct:</strong> End-to-end encrypted peer-to-peer WebRTC connection.
              </div>
            </div>
            <div className="how-tip-item">
              <span className="tip-icon">⚡</span>
              <div>
                <strong>Super Fast:</strong> Max speed when both devices are on the same Wi-Fi network.
              </div>
            </div>
            <div className="how-tip-item">
              <span className="tip-icon">📱</span>
              <div>
                <strong>Keep Tabs Open:</strong> Don't close or minimize browser tabs until the transfer finishes.
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-got-it" onClick={onClose}>
            Got it, let's start!
          </button>
        </div>
      </div>
    </div>
  );
}
