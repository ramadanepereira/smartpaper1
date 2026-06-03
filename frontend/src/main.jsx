import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

/* ── Ponto de entrada da SPA ──
 * Renderiza a aplicação React no elemento #root do index.html.
 * React.StrictMode activa verificações adicionais em desenvolvimento. */
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
