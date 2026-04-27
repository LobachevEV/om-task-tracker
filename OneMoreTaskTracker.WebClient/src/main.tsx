import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './common/i18n/config'
import App from './app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
