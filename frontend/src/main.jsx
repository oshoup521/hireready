import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Register the service worker. `autoUpdate` in vite.config means the SW
// refreshes itself on every new deploy — we just reload once it's ready
// so the user picks up the latest build without a hard refresh.
registerSW({
  onNeedRefresh() {
    // Silent update path: the new SW is ready, activate it now.
    // Skip if you'd rather prompt the user with a toast.
    window.location.reload()
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
