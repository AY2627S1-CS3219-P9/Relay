import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

function StandaloneApp() {
  const [creditHistoryOpen, setHistoryOpen] = useState(false)
  return (
    <App
      creditBalance={null}
      authVersion={0}
      creditHistoryOpen={creditHistoryOpen}
      closeCredit={() => setHistoryOpen(false)}
      showCreditHistory={() => setHistoryOpen(true)}
      showCreditBalance={() => setHistoryOpen(false)}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StandaloneApp />
  </StrictMode>,
)
