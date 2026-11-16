import { useState } from "react";
import CreateRoom from "./components/CreateRoom";
import JoinRoom from "./components/JoinRoom";
import "./App.css";

function App() {
  const [mode, setMode] = useState(null); // null | "send" | "receive"

  return (
    <div className="app">
      <header className="header">
        <h1>📡 Sendora</h1>
        <p>Peer-to-peer file transfer — no cloud, no limits</p>
      </header>

      {!mode && (
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
      )}

      {mode === "send" && <CreateRoom onBack={() => setMode(null)} />}
      {mode === "receive" && <JoinRoom onBack={() => setMode(null)} />}
    </div>
  );
}

export default App;

