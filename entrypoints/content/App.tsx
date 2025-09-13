import { PromptHistoryWidget } from "../../components/PromptHistoryWidget"
import { CaretProvider } from "../../contexts/CaretContext"
import "./App.css"

function App() {
  return (
    <CaretProvider>
      <PromptHistoryWidget />
    </CaretProvider>
  )
}

export default App
