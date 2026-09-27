import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeIdentityAndSync } from './services/remoteSync'

// Awaited before the first render so that, in remote mode, Home/Achievements/
// Leaderboard never flash the empty local-default state before the agent's
// real backend progress arrives. A no-op network-wise (resolves immediately)
// whenever this build has no VITE_API_URL configured — see apiClient.ts.
initializeIdentityAndSync().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
