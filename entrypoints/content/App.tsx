import { useState } from "react";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="prompt-history-widget">
      <div className="widget-header">
        <h3>Prompt History</h3>
        <button className="close-btn" onClick={() => setIsVisible(false)}>
          ×
        </button>
      </div>
      <div className="widget-content">
        <p>プロンプト履歴拡張機能</p>
        <div className="counter">
          <button onClick={() => setCount(count - 1)}>-</button>
          <span>{count}</span>
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>
        <p>カウントを増減させることができます。</p>
      </div>
    </div>
  );
}

export default App;
