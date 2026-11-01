import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted variable fonts (SIL Open Font License) — no network needed at runtime.
import '@fontsource-variable/inter'
import '@fontsource-variable/manrope'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
