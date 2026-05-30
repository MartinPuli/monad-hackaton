# KNTX — El Airbnb de las PCs gamer, sobre Monad

> **Convertí cualquier dispositivo en una PC gamer de alta gama alquilando el poder de las PCs que están sin usar — y pagá solo por lo que jugás, liquidado en tiempo real sobre Monad.**

Mercado peer-to-peer de poder de cómputo para gaming. Quien tiene una PC potente la alquila cuando no la usa y **gana dinero pasivo**; quien no tiene PC **juega esos mismos juegos desde cualquier dispositivo** (laptop vieja, incluso un celu), porque el juego corre en la máquina del otro y le llega como **video en vivo**, mandando de vuelta sus controles. Es **Uber / Airbnb, pero de GPUs para gaming.**

Sin suscripciones: **pay-per-use real.** Cargás saldo y se va descontando mientras jugás, según los **FPS que efectivamente recibís**, liquidado on-chain.

---

## El problema

- Jugar juegos modernos exige una PC de **USD 1.500+**. Millones de personas tienen buena conexión pero no pueden pagar ese hardware.
- Al mismo tiempo, millones de PCs potentes pasan **apagadas o sin usar** la mayor parte del día — capital muerto.
- El cloud gaming centralizado (GeForce NOW, Stadia) cobra suscripción fija, controla el hardware y se queda la comisión.

## Por qué Monad es el corazón (no decoración)

La forma "vieja" de hacer micropagos en blockchain son los **state channels** (Lightning): se inventaron **porque las cadenas eran lentas y caras**, así que escondés los pagos off-chain y solo tocás la cadena dos veces.

**Monad es tan rápido que no hace falta.** Liquidamos cada sesión **directamente on-chain, cada pocos segundos**. Sin channels, sin complejidad criptográfica.

- No 1 tx por frame (60/s por usuario → imposible en cualquier cadena).
- Sino **~1 liquidación cada ~10 s por sesión** = 0,1 TPS por jugador.
- **10.000 TPS de Monad ÷ 0,1 = 100.000 jugadores simultáneos** liquidando on-chain, sin L2, sin channels.

Las 3 propiedades que usamos: **throughput (10k TPS)** para liquidar a escala, **finalidad ~1s** (el host ve la plata caer *mientras* sirve frames), y **gas barato** (miles de liquidaciones cuestan centavos).

---

## Arquitectura

```
HOST (PC potente)
 ├─ Captura + encode del juego (Sunshine / NVENC) → streaming a baja latencia
 ├─ Mide los FPS realmente entregados cada segundo
 └─ host-agent: cada segundo llama reportFps() en el contrato → acumula deuda

RED
 └─ Streaming P2P (Sunshine/Moonlight): los frames van, los inputs vuelven.
    La LATENCIA vive acá, NO en Monad.

CLIENTE (dispositivo débil)
 ├─ Decodifica el stream → render + captura de teclado/mouse/gamepad
 └─ Wallet (web app): deposita saldo y ve cómo se descuenta en vivo

MONAD (contrato escrow — GhostRig.sol)
 ├─ registerRig(pricePerFps) : el host fija su precio por FPS (una vez)
 ├─ openSession(rigId)       : el cliente deposita MON y arranca la sesión
 ├─ reportFps(id, fps)       : cada segundo (desde el seg 11) registra el FPS real → acumula deuda
 ├─ closeSession(id)         : acredita lo acumulado al host y reembolsa el saldo no usado
 └─ withdraw()               : cada parte retira sus fondos (pull-payment)
```

### El render y el dinero están desacoplados

A 60 FPS harían falta 60 tx/s por jugador — absurdo, y el pago siempre iría atrasado del frame. Por eso los **frames fluyen a 60 FPS por streaming**, pero el dinero se **mide** a esa velocidad y se **liquida** on-chain cada N segundos. El usuario *experimenta* pay-per-fps perfecto; la cadena no se ahoga.

### Modelo de confianza (sin intermediario)

- El cliente deposita el saldo **antes** en el contrato (escrow). El host no juega gratis.
- **Trial de 10 s gratis** (`TRIAL_SECONDS`): el cliente prueba que el juego funciona antes de que corra el reloj de cobro. Si es una estafa o anda mal, se va sin pagar.
- El **precio por FPS se bloquea al abrir** la sesión: el host no lo puede cambiar a mitad de partida.
- La deuda se **acumula on-chain cada segundo** según el FPS real (con tope `MAX_FPS = 480` y capada al depósito); el **pago se ejecuta al cerrar**.
- **El cliente es el verificador:** como ve el juego en vivo, no hace falta verificación criptográfica del cómputo. La pérdida máxima por trampa de cualquiera de los dos es **~1 segundo**.

---

## Estructura del repo

| Carpeta | Qué es |
|---------|--------|
| `contracts/` | Contrato `GhostRig.sol` + tests + script de deploy (Foundry). |
| `web/` | Frontend Next.js + wagmi/viem: wallet, sesión en vivo, dashboard del host, stream embebido. |
| `host-agent/` | Proceso Node del dueño de la PC: mide FPS y reporta on-chain cada segundo. |
| `sunshine/` | Host de streaming (Sunshine, vendido como dependencia GPL-3.0). |
| `docs/` | `DEMO.md`, `TEST-PLAN.md`, `streaming-setup.md`, notas de Monad. |
| `.claude/skills/monad-development/` | Skill de Claude Code para construir dapps sobre Monad. |

Documentos de producto/diseño en la raíz: `PROJECT.md` (pitch técnico completo), `PRODUCT.md`, `PLAN.md`, `DESIGN.md`, `interface.md`.

---

## Contrato

| | |
|---|---|
| **Red** | Monad Testnet (chain ID **10143**) |
| **Dirección** | `0x2F9e911f380e03557Ec65F941Dba32c879172b9a` |
| **Explorer** | https://monad-testnet.socialscan.io/address/0x2F9e911f380e03557Ec65F941Dba32c879172b9a |
| **Moneda** | MON nativo |
| **Compilador** | Solidity 0.8.28, `evm_version = prague` |

### API (resumen)

| Función | Quién | Qué hace |
|---------|-------|----------|
| `registerRig(pricePerFps)` | host | Registra una rig con su precio por FPS (wei). Devuelve `rigId`. |
| `setPrice(rigId, price)` / `setActive(rigId, bool)` | host | Cambia precio o pausa la rig. |
| `openSession(rigId)` *payable* | cliente | Deposita MON y abre la sesión. El precio se bloquea al abrir. |
| `reportFps(sessionId, fps)` | host | Reporta el FPS del último segundo; acumula `fps × pricePerFps` (tras el trial). |
| `closeSession(sessionId)` | cliente **o** host | Acredita lo acumulado al host, reembolsa el resto al cliente. |
| `withdraw()` | cualquiera | Retira los fondos acreditados (pull-payment). |

---

## Cómo correrlo

### 1. Contrato (Foundry)

```bash
cd contracts
forge build
forge test

# Deploy a Monad testnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $PRIVATE_KEY \
  --broadcast
```

> Conseguí MON de testnet en https://faucet.monad.xyz antes de desplegar.

### 2. Web (Next.js)

```bash
cd web
npm install
npm run dev          # http://localhost:3000
```

Variables de entorno (opcionales — por defecto apunta al contrato ya desplegado):

```bash
NEXT_PUBLIC_GHOSTRIG_ADDRESS=0x2F9e911f380e03557Ec65F941Dba32c879172b9a
```

Necesitás una wallet inyectada (MetaMask) configurada en **Monad Testnet (10143)**.

### 3. Host-agent (dueño de la PC)

```bash
cd host-agent
npm install

# 1) Registrar tu rig (una vez) → te devuelve el RIG_ID
HOST_PRIVATE_KEY=0x... npm run register

# 2) Correr el agente: mide FPS y los reporta on-chain cada segundo
HOST_PRIVATE_KEY=0x... RIG_ID=0 npm start
```

Variables: `HOST_PRIVATE_KEY` (wallet que firma `reportFps`/`closeSession`, **nunca commitear**), `RIG_ID`, y opcionalmente `GHOSTRIG_ADDRESS`.

### 4. Streaming

Sunshine (host) + Moonlight (cliente): video del juego en vivo, baja latencia, encode por hardware. Ver `docs/streaming-setup.md`.

---

## KNTX en acción

1. El cliente abre KNTX, conecta su wallet y deposita saldo en Monad.
2. Se conecta a una rig disponible y el juego arranca al instante por streaming.
3. **Juega de verdad** — un AAA corriendo fluido en un dispositivo que jamás podría ejecutarlo.
4. Primeros **10 s gratis** para probar. Después, **split-screen:** a un lado el juego, al otro el explorer de Monad con una tx de `reportFps()` por segundo y la deuda subiendo en vivo.
5. Cierra la sesión: el host cobra al instante y el saldo no usado vuelve a la wallet del cliente.

El jugador ve **frames corriendo y plata moviéndose on-chain en la misma pantalla, en tiempo real.** Esa es KNTX.

## Licencia

MIT (el código del proyecto). `sunshine/` es una dependencia de terceros bajo GPL-3.0.
