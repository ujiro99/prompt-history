import { useState } from "react";
import { i18n } from "#i18n";
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
        <h3>{i18n.t("appName")}</h3>
        <button className="close-btn" onClick={() => setIsVisible(false)}>
          ×
        </button>
      </div>
      <div className="widget-content">
        <p>{i18n.t("promptHistoryExtension")}</p>
        <div className="counter">
          <button onClick={() => setCount(count - 1)}>-</button>
          <span>{count}</span>
          <button onClick={() => setCount(count + 1)}>+</button>
        </div>
      </div>
      <p className="text-red-800">{i18n.t("canIncreaseDecrease")}</p>
    </div>
  );
}

export default App;
