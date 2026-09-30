import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { QaApp } from './components/qa/QaApp'
import { captureIdentityFromUrl } from './services/identityService'

// The QA desk page (/qa/): only the audit tools — no Rocky world, no game
// data to sync — so it opens instantly and stays out of the way.
captureIdentityFromUrl()
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QaApp />
  </StrictMode>,
)
