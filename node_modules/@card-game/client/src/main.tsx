import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/pixel.css'
import './styles/login.css'
import './styles/lobby.css'
import './styles/room.css'
import './styles/battle.css'
import './styles/world.css'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
