import React from 'react'
import ReactDOM from 'react-dom/client'
import BankingApp from './MockBank'
import './index.css' // Optional: if you have global styles

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BankingApp />
  </React.StrictMode>,
)
