import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DashboardApp } from './DashboardApp'
import '../web/src/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DashboardApp />
  </StrictMode>,
)
