import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { EVMProvider } from './providers/WagmiProvider';
import { SolanaWalletProvider } from './providers/SolanaProvider';
import { App } from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EVMProvider>
      <SolanaWalletProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </SolanaWalletProvider>
    </EVMProvider>
  </React.StrictMode>
);
