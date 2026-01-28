import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Debug: Global drag event listeners to diagnose WebView2 drag issues
if (import.meta.env.DEV) {
  document.addEventListener('dragstart', (e) => {
    console.log('[Document] dragstart:', e.target, 'dataTransfer:', e.dataTransfer);
  }, true);

  document.addEventListener('drag', (e) => {
    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) {
      console.log('[Document] drag:', e.clientX, e.clientY);
    }
  }, true);

  document.addEventListener('dragenter', (e) => {
    console.log('[Document] dragenter:', e.target);
  }, true);

  document.addEventListener('drop', (e) => {
    console.log('[Document] drop:', e.target);
  }, true);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
