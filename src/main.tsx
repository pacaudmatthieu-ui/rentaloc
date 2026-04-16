import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// One-time migration: clear stale property-flipping data from old format
const MIGRATION_KEY = 'rentaloc_migration_v5'
if (!localStorage.getItem(MIGRATION_KEY)) {
  localStorage.removeItem('rentaloc_property_flipping_simulation')
  localStorage.removeItem('rentaloc_panel_flip')
  localStorage.removeItem('rentaloc_comparison_list')
  localStorage.setItem(MIGRATION_KEY, '1')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
