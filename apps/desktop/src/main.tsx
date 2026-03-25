import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DesktopWalletProvider } from './providers/DesktopWalletProvider';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DesktopWalletProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DesktopWalletProvider>
  </React.StrictMode>,
);
