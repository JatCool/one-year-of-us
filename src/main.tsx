import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Admin from './admin/Admin'
import App from './site/App'
import './styles.css'

// Tiny router: `<base>/admin` (with or without a trailing slash) opens the editor,
// everything else renders the public page. On GitHub Pages deep links reach this
// file through the 404.html copy created by the deploy workflow.
const isAdmin = /\/admin\/?$/.test(window.location.pathname)

createRoot(document.getElementById('root')!).render(<StrictMode>{isAdmin ? <Admin /> : <App />}</StrictMode>)
