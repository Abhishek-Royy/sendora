import { useState } from "react";
import CreateRoom from "./components/CreateRoom";
import JoinRoom from "./components/JoinRoom";
import HowItWorksModal from "./components/HowItWorksModal";
import "./App.css";

function App() {
  const [mode, setMode] = useState(null); // null | "send" | "receive"
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  return (
    <div className="app">
      <header className="header">
        <h1>📡 Sendora</h1>
        <p>Peer-to-peer file transfer — no cloud, no limits</p>
      </header>

      {!mode && (
        <div className="home-content">
          <div className="mode-select">
            <button className="btn btn-send" onClick={() => setMode("send")}>
              📤 Send File
            </button>
            <button
              className="btn btn-receive"
              onClick={() => setMode("receive")}
            >
              📥 Receive File
            </button>
          </div>

          <button
            type="button"
            className="btn-how-it-works"
            onClick={() => setShowHowItWorks(true)}
          >
            <span className="how-icon">💡</span> How does it work?
          </button>
        </div>
      )}

      {mode === "send" && <CreateRoom onBack={() => setMode(null)} />}
      {mode === "receive" && <JoinRoom onBack={() => setMode(null)} />}

      <footer className="footer">
        <p>
          Made with <span className="footer-heart">❤️</span> by{" "}
          <span className="footer-author">Abhishek Roy</span>
        </p>
      </footer>

      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />
    </div>
  );
}

export default App;
