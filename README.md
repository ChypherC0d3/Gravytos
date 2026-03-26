<p align="center">
  <img src="apps/web/public/favicon.svg" width="80" alt="Gravytos" />
</p>

<h1 align="center">Gravytos</h1>

<p align="center">
  <strong>Privacy-Enhanced Multi-Chain Wallet</strong><br/>
  Privacy by design. Auditability on demand.
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#supported-chains">Chains</a> &bull;
  <a href="#download">Download</a> &bull;
  <a href="#development">Development</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#security">Security</a>
</p>

---

## What is Gravytos?

Gravytos is a **non-custodial, multi-chain wallet** that puts you in control of your privacy. Choose your privacy level per transaction — from fast and cheap to full CoinJoin and stealth addresses. Prove what you choose, hide what you don't.

Your keys never leave your device. No server ever sees your seed phrase.

## Features

- **Multi-Chain** — Native support for Bitcoin, Ethereum, Solana, Polygon, Arbitrum, Base, Optimism
- **Privacy Slider** — Choose Low, Medium, or High privacy per transaction
- **Coin Control (BTC)** — Manual UTXO selection, labeling, freezing
- **CoinJoin Coordinator** — Decentralized CoinJoin with audit proofs
- **Stealth Addresses (ETH)** — ERC-5564 stealth address generation
- **RPC Rotation** — Automatic rotation across multiple RPC endpoints
- **Audit Trail** — SHA-256 hash-chained event log with optional export
- **HD Wallet** — BIP39/BIP44/BIP84 key derivation for all chains
- **AES-256-GCM Encryption** — Military-grade vault encryption with Argon2/PBKDF2
- **Swap** — Real swaps via 1inch (EVM) and Jupiter (Solana)
- **Bridge** — Cross-chain bridges via Li.Fi with status tracking
- **Transaction History** — Real-time history from Etherscan, Blockstream, Solana
- **QR Codes** — Generate and scan QR codes for addresses
- **PWA** — Install directly from your browser
- **Desktop App** — Native builds for Windows, macOS, and Linux

## Supported Chains

| Chain | Send/Receive | Swap | Bridge | Privacy |
|-------|:---:|:---:|:---:|:---:|
| Bitcoin | Yes | — | — | Coin Control, CoinJoin |
| Ethereum | Yes | Yes | Yes | Stealth, RPC Rotation |
| Solana | Yes | Yes | — | Wallet Rotation |
| Polygon | Yes | Yes | Yes | RPC Rotation |
| Arbitrum | Yes | Yes | Yes | RPC Rotation |
| Base | Yes | Yes | Yes | RPC Rotation |
| Optimism | Yes | Yes | Yes | RPC Rotation |

## Download

### Desktop

| Platform | Format | Requirements |
|----------|--------|-------------|
| **Windows** | `.msi` | Windows 10+ x64 |
| **macOS** | `.dmg` | macOS 12+ (Intel + Apple Silicon) |
| **Linux** | `.AppImage` | Ubuntu 20.04+ x64 |

Download from [Releases](https://github.com/ChypherC0d3/Gravytos/releases).

### Web App

Visit the hosted version or install as a PWA from your browser (Chrome, Edge, Brave, Safari).

## Development

### Prerequisites

- Node.js 20+
- Rust (for desktop builds)

### Setup

```bash
git clone https://github.com/ChypherC0d3/Gravytos.git
cd Gravytos
npm install
```

### Run

```bash
# Web app
npm run dev:web

# Desktop app (requires Rust)
npm run dev:desktop
```

### Test

```bash
# Run all 163 tests
npx vitest run

# With UI
npx vitest --ui
```

### Build

```bash
# Web (production)
npm run build:web

# Desktop installers
npm run build:desktop:win    # .msi
npm run build:desktop:mac    # .dmg
npm run build:desktop:linux  # .AppImage
```

## Architecture

```
gravytos/
  apps/
    web/           # React + Vite web app
    desktop/       # Tauri desktop app (Rust backend)
  packages/
    core/          # Wallet engine, chain adapters, privacy, audit
    types/         # Shared TypeScript types
    state/         # Zustand stores
    config/        # Chain configs, tokens, env
    ui/            # Shared UI components
    api-client/    # External API clients
```

### Core Engine

- **Key Management** — BIP39 mnemonic, BIP44/BIP84 derivation, AES-256-GCM encryption
- **Chain Adapters** — Bitcoin (UTXO/PSBT), EVM (viem), Solana (@solana/web3.js)
- **Privacy Engine** — Coin Control, CoinJoin, Stealth Addresses, RPC Rotation, Gas Randomization
- **Audit Engine** — SHA-256 hash-chained events with tamper detection
- **Transaction Engine** — Swap (1inch/Jupiter), Bridge (Li.Fi), History (Etherscan/Blockstream)

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS, Vite |
| Desktop | Tauri 2 (Rust) |
| State | Zustand |
| EVM | wagmi, viem, RainbowKit |
| Solana | @solana/web3.js, wallet-adapter |
| Bitcoin | @scure/bip39, @scure/bip32, @noble/curves |
| Crypto | @noble/hashes (SHA-256, PBKDF2), Web Crypto API (AES-256-GCM) |
| Testing | Vitest (163 tests) |
| CI/CD | GitHub Actions, Vercel |

## Security

- **Non-custodial** — Private keys never leave your device
- **AES-256-GCM** — Vault encryption with PBKDF2 key derivation (600,000 iterations)
- **Memory safety** — Seed material zeroized after use
- **No analytics** — Zero telemetry, no tracking
- **Verifiable** — Download checksums provided for all installers
- **Audit trail** — Cryptographic hash chain detects any tampering

### Verify Downloads

```bash
# Windows
certutil -hashfile gravytos-0.1.0-x64.msi SHA256

# macOS
shasum -a 256 gravytos-0.1.0-universal.dmg

# Linux
sha256sum gravytos-0.1.0-x86_64.AppImage
```

## Privacy Levels

| Level | Features | Use Case |
|-------|----------|----------|
| **Low** | Direct transaction, no delay | Speed priority |
| **Medium** | RPC rotation, address rotation, batching, 15s delay | Balanced |
| **High** | Coin control, stealth addresses, CoinJoin, 120s delay | Maximum privacy |

---

<p align="center">
  Privacy is not a feature. It's a right.
</p>
