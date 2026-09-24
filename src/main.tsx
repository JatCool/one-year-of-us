import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import Admin from './Admin'
import './styles.css'

createRoot(document.getElementById('root')!).render(<StrictMode>{location.pathname.endsWith('/admin') ? <Admin /> : <App />}</StrictMode>)
