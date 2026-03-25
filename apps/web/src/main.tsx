// Real Buffer polyfill (the inline script in index.html provides a stub,
// this replaces it with the full implementation before React mounts)
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { EVMProvider } from './providers/WagmiProvider';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EVMProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </EVMProvider>
  </React.StrictMode>
);
