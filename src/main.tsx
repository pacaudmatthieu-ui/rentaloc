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

// Intégration en iframe (jmacademie.com) : on annonce la hauteur réelle du
// contenu à la page parente pour qu'elle ajuste l'iframe — sans ça, l'iframe
// à hauteur fixe coupe le bas de l'outil dès que le contenu grandit.
if (window.parent !== window) {
  let lastHeight = 0
  const reportHeight = () => {
    const height = Math.ceil(
      Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    )
    if (Math.abs(height - lastHeight) < 4) return
    lastHeight = height
    window.parent.postMessage({ type: 'rentaloc:height', height }, '*')
  }
  const observer = new ResizeObserver(reportHeight)
  observer.observe(document.documentElement)
  observer.observe(document.body)
  window.addEventListener('load', reportHeight)
  // Filet de sécurité : contenus asynchrones (graphiques, polices, panneaux dépliés)
  window.setInterval(reportHeight, 1000)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
