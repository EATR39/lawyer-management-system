/**
 * Avukat Yönetim Sistemi - React Entry Point
 * Ana uygulama başlangıç noktası
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// React uygulamasını başlat
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
