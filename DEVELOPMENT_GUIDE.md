# Gravytos Development Guide

## Reglas de Oro (OBLIGATORIAS antes de cada cambio)

### 1. NUNCA commitear sin verificar

```
ANTES de git add/commit:
  1. npx tsc --noEmit -p packages/core/tsconfig.json
  2. npx tsc --noEmit -p apps/web/tsconfig.json
  3. npx vitest run (packages/core)
  4. npm run build --workspace=@gravytos/web

Si CUALQUIERA falla -> NO commitear. Arreglar primero.
```

### 2. NUNCA pushear sin build exitoso

```
ANTES de git push:
  1. Build web:     cd apps/web && npx vite build
  2. Verificar:     ls dist/index.html  (debe existir)
  3. Entonces:      git push origin main

Vercel auto-deploya desde main. Un push roto = deploy roto.
```

### 3. Flujo de trabajo para cada feature

```
PASO 1: Leer el codigo afectado (Read tool)
PASO 2: Entender los tipos existentes (Grep interfaces/types)
PASO 3: Editar UN archivo a la vez
PASO 4: Typecheck despues de CADA edicion
PASO 5: Si falla -> arreglar ANTES de tocar otro archivo
PASO 6: Tests
PASO 7: Build
PASO 8: Commit con mensaje descriptivo
PASO 9: Push
```

### 4. NO hacer cambios en cascada sin plan

```
MALO:
  Editar 5 archivos -> encontrar errores -> editar 3 mas -> mas errores -> caos

BUENO:
  1. Listar TODOS los archivos que hay que tocar
  2. Verificar tipos/interfaces ANTES de escribir codigo
  3. Editar archivo 1 -> typecheck -> OK
  4. Editar archivo 2 -> typecheck -> OK
  5. ...
  6. Tests finales
  7. Build final
  8. Un solo commit limpio
```

---

## Arquitectura de Tipos

### ChainFamily (enum, NO string literal)
```typescript
// CORRECTO:
import { ChainFamily } from '@gravytos/types';
chainFamily: ChainFamily.Bitcoin  // NO 'bitcoin'
chainFamily: ChainFamily.EVM     // NO 'evm'
chainFamily: ChainFamily.Solana  // NO 'solana'
```

### WalletAccount (tipo completo)
```typescript
// packages/types/src/wallet.ts
interface WalletAccount {
  id: string;           // UUID
  walletId: string;     // parent wallet UUID
  chainFamily: ChainFamily;
  chainId: ChainId;     // ej: 'bitcoin-mainnet', 'ethereum-1'
  address: string;
  publicKey: string;    // hex
  derivationPath: string;
}
```

### Tipos internos del core
```typescript
// packages/core/src/wallet/wallet-manager.ts (interno, NO exportado)
interface WalletMeta {
  id: string;
  name: string;
  createdAt: number;
  accounts: WalletAccount[];  // USA el tipo completo
  nextIndex: Record<string, number>;
  nextBtcAddressIndex: number;
}
```

---

## Estructura del Proyecto

```
nexora-vault/
  apps/
    web/          -> Frontend React (Vite) -> Vercel
    desktop/      -> Tauri wrapper
  packages/
    core/         -> Logica de negocio (wallet, chains, privacy, audit)
    types/        -> Tipos compartidos (ChainFamily, WalletAccount, etc.)
    state/        -> Zustand stores
    config/       -> Tokens, chains, env
    api-client/   -> Supabase, analytics
    ui/           -> Componentes compartidos
  core-rs/        -> Rust core (futuro)
```

---

## Dependencias Criticas

### Key Management
```
bip39          -> Mnemonic generation/validation
@scure/bip32   -> HD key derivation (BIP32/BIP44/BIP84)
@noble/secp256k1 -> Bitcoin/Ethereum key ops
@noble/ed25519   -> Solana key ops
bs58             -> Base58 encoding (Solana/Bitcoin)
```

### Chain Adapters
```
viem           -> EVM (Ethereum, Polygon, Arbitrum, Base, Optimism)
@solana/web3.js -> Solana
bitcoinjs-lib  -> Bitcoin PSBT builder
```

### Frontend
```
@rainbow-me/rainbowkit -> EVM wallet connect
@solana/wallet-adapter-react -> Solana wallet connect
wagmi          -> EVM hooks
qrcode.react   -> QR generation
```

---

## Stores (Zustand) - Estado Global

### wallet-store
```typescript
{
  evmAddress: string | null,    // Set via setEvmWallet(addr, chainId)
  solanaAddress: string | null, // Set via setSolanaWallet(addr)
  btcAddress: string | null,    // Set via setBtcWallet(addr)
  activeWalletId: string | null,
  balances: Record<string, { balance: string; usdValue: number }>,
}
```

### Flujo de datos: Create Wallet -> Dashboard
```
1. CreateWalletModal: genera mnemonic, encrypta seed, guarda en localStorage
2. WalletManager.importWallet: crea vault + meta con accounts derivadas
3. Dashboard: muestra "Click to unlock"
4. UnlockWalletModal: pide password
5. useWalletManager.unlockAndSetAddresses:
   a. Decrypt seed con password
   b. Leer accounts de meta
   c. Si accounts vacio -> deriveDefaultAddresses() como fallback
   d. Setear btcAddress/evmAddress/solanaAddress en wallet-store
6. Dashboard: lee del store y muestra addresses reales
```

---

## Checklist Pre-Commit

- [ ] `npx tsc --noEmit` pasa en core Y web (0 errores)
- [ ] `npx vitest run` pasa todos los tests
- [ ] `cd apps/web && npx vite build` genera dist/
- [ ] No hay `console.log` de debug en el commit
- [ ] No hay secrets/keys hardcodeados
- [ ] No hay `any` innecesarios
- [ ] Mensaje de commit describe QUE y POR QUE

---

## Checklist Pre-Deploy (Vercel)

- [ ] Todo lo de Pre-Commit
- [ ] Build local exitoso (mismo comando que Vercel: `cd apps/web && npx vite build`)
- [ ] Environment variables configuradas en Vercel dashboard
- [ ] Probar en localhost ANTES de pushear
- [ ] Verificar en Vercel dashboard que el deploy es exitoso
- [ ] Probar la URL de produccion despues del deploy

---

## Errores Comunes y Soluciones

### "Type 'string' is not assignable to type 'ChainFamily'"
```
SOLUCION: Usar ChainFamily.Bitcoin en vez de 'bitcoin'
```

### "Object literal may only specify known properties"
```
SOLUCION: Leer la interface completa ANTES de crear el objeto.
          Grep: "interface NombreTipo" para ver todos los campos requeridos.
```

### "Execution context was destroyed" (preview_eval)
```
CAUSA: Navegacion de pagina destruye el contexto JS
SOLUCION: Esperar despues de navigate, luego ejecutar en nuevo eval
```

### Vercel build falla
```
1. Verificar build local: cd apps/web && npx vite build
2. Si falla localmente -> arreglar primero
3. Si pasa local pero falla en Vercel -> verificar env vars
```

### localStorage vacio despues de redeploy
```
CAUSA: localStorage es por dominio. Cada dominio diferente tiene su propio storage.
SOLUCION: Wallet se recrea en cada dominio nuevo. Normal.
```

---

## API Keys y Secrets (NUNCA en codigo)

```
VITE_ONEINCH_API_KEY      -> 1inch swap quotes
VITE_LIFI_API_KEY         -> Li.Fi bridge quotes
VITE_WALLETCONNECT_ID     -> WalletConnect modal
VITE_SUPABASE_URL         -> Supabase backend
VITE_SUPABASE_ANON_KEY    -> Supabase auth

Configurar en: Vercel Dashboard -> Settings -> Environment Variables
Para local: apps/web/.env.local
```

---

## Regla Final

```
CUANDO TENGAS DUDA:
  1. PARA
  2. LEE el codigo existente
  3. VERIFICA los tipos
  4. ENTONCES escribe

NUNCA asumas que un tipo es un string literal.
NUNCA commitees sin typecheck.
NUNCA pushees sin build exitoso.
```
