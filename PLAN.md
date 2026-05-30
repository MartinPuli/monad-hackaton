# GhostRig — Plan de ejecución (Workblocks)

Arquitectura elegida: **liquidación on-chain directa, sin state channels.**
Red: **Monad testnet (chain ID 10143)**. Smart contracts con **Foundry**. Frontend con **viem/wagmi**.

Leyenda de prioridad: 🔴 core (sin esto no hay demo) · 🟡 importante · 🟢 nice-to-have / si sobra tiempo.

---

## Decisiones cerradas (ya no son abiertas)

- **Moneda:** MON nativo.
- **Unidad de cobro:** **por FPS** — el host fija `pricePerFps`; la deuda crece `fps × pricePerFps` por segundo.
- **Trial:** **10 segundos gratis** antes de empezar a cobrar (core, va en el contrato).
- **Liquidación:** se **registra el FPS cada segundo** (`reportFps`) acumulando deuda on-chain; el **pago al host se ejecuta al cerrar** (`closeSession`).
- **Precio:** lo fija el **host** vía `registerRig`, registrado on-chain (el cliente no lo pasa ni lo manipula).
- **Demo:** **Minecraft real** vía Sunshine/Moonlight en **LAN**; 1 host = la PC de un amigo. Plan B: stream simulado.

---

## WB0 — Setup & decisiones ✅ COMPLETADO
**Objetivo:** dejar el terreno listo para hackear sin fricción.

- [x] Decisiones cerradas (ver sección arriba).
- [x] Foundry instalado (v1.7.1) en `~/.foundry/bin`.
- [x] Estructura de carpetas: `/contracts` (Foundry init), `/web`, `/host-agent`.
- [x] `foundry.toml` configurado (`evm_version = "prague"`, `solc 0.8.28`, rpc monad_testnet).
- [x] Wallet de deploy creada y persistida en `.env` (en `.gitignore`).
      Address: `0x66D5331F872069F9C204aF56835f664d545E2585`
- [x] Wallet fondeada vía faucet: **1 MON** en testnet (balance confirmado).
- [x] Archivos de ejemplo (Counter) eliminados.

**Entregable:** ✅ repo con estructura + wallet fondeada en testnet.

> Nota: `~/.foundry/bin` no está en el PATH permanente. En cada sesión de terminal nueva, anteponer:
> `export PATH="$PATH:/c/Users/rober/.foundry/bin"` (o agregarlo al perfil).

---

## WB1 — Smart contract: el corazón 🔴
**Objetivo:** contrato de mercado/escrow con liquidación directa.

- [ ] `forge init` en `/contracts`, configurar `foundry.toml` (`evm_version = "prague"`, `solc 0.8.28`).
- [ ] Contrato `GhostRig.sol` con:
  - `struct Rig { host, pricePerFps, active }` → registro del host.
  - `struct Session { client, rigId, deposit, accrued, startTime, lastReport, open }`
  - `TRIAL_SECONDS = 10` constante.
  - `registerRig(pricePerFps)` → el host registra su rig y fija el precio por FPS (on-chain, no manipulable por el cliente).
  - `openSession(rigId) payable` → cliente deposita saldo, abre sesión, guarda `startTime`. Lee el `pricePerFps` del rig.
  - `reportFps(sessionId, fps)` → (solo después del trial de 10 s) acumula `accrued += fps × pricePerFps`, cap al depósito; si llega al cap, marca para cierre.
  - `closeSession(sessionId)` → paga `accrued` al host + reembolsa `deposit - accrued` al cliente.
  - `clientTimeout(sessionId)` → si el host abandona, el cliente recupera el saldo.
  - Eventos: `RigRegistered`, `SessionOpened`, `FpsReported(id, fps, accrued)`, `SessionClosed` (para que el frontend escuche en vivo).
- [ ] Guards: reentrancy, solo el host del rig puede `reportFps`, solo cliente/host pueden cerrar, no cobrar más que el depósito, no `reportFps` durante el trial.

**Entregable:** `GhostRig.sol` compilando.

---

## WB2 — Tests del contrato 🔴
**Objetivo:** garantizar que la plata no se pierde ni se duplica.

- [ ] Test: apertura bloquea el depósito correcto.
- [ ] Test: `reportFps` durante los primeros 10 s NO acumula deuda (trial gratis).
- [ ] Test: `reportFps` después del trial acumula `fps × pricePerFps` exacto.
- [ ] Test: no se puede acumular/cobrar más que el depósito (cap).
- [ ] Test: `closeSession` paga `accrued` al host y reembolsa el remanente al cliente.
- [ ] Test: solo el host del rig puede `reportFps`; el cliente no puede manipular el precio.
- [ ] Test: timeout del cliente funciona.
- [ ] Test: nadie ajeno puede cobrar/cerrar.

**Entregable:** `forge test` en verde.

---

## WB3 — Deploy + verificación en Monad testnet 🔴
**Objetivo:** contrato vivo y verificado.

- [ ] `script/Deploy.s.sol` (sin hardcodear address).
- [ ] Deploy con `forge script ... --broadcast` a testnet.
- [ ] Verificar con la verification API (los 3 explorers).
- [ ] Guardar la **dirección del contrato + ABI** para el frontend.

**Entregable:** link del contrato verificado en el explorer.

---

## WB4 — Host Agent (servidor del dueño de PC) 🔴
**Objetivo:** el proceso que sirve el juego y cobra.

- [ ] Servicio Node/TS que:
  - mide los **FPS reales** entregados por segundo (real, o simulado al inicio).
  - cada segundo (desde el seg 11) envía `reportFps(sessionId, fps)` a Monad con la wallet del host.
  - emite estado (fps, deuda acumulada) para mostrar en UI.
- [ ] **Streaming — objetivo: Minecraft real en LAN**:
  - 🔴 v0: **simulado** — un canvas/video loop con FPS medible, para validar todo el flujo de pago primero (plan B de la demo).
  - 🔴 v1 (objetivo demo): **Sunshine** corriendo Minecraft en la PC del host + **Moonlight** en el cliente, en la misma red local.
  - 🟢 v2: WebRTC embebido en la web (post-hackathon).
- [ ] **Integración pago↔stream:** el stream solo arranca con sesión abierta; al cerrar/agotarse el saldo, el Gateway corta Sunshine. (Aquí está el mayor riesgo de integración.)

**Entregable:** host que mide FPS y lo reporta cada segundo al contrato, atado al arranque/corte del stream.

---

## WB5 — Frontend / Cliente 🔴 (Dev B) — UI lista en MOCK, falta wiring real
**Objetivo:** la app donde el jugador conecta wallet, deposita y juega.

- [x] App con **Next.js 16 + wagmi 3/viem 2**, chain `monadTestnet` de `viem/chains`.
- [x] Conectar wallet (injected / MetaMask con red Monad testnet).
- [x] Pantalla: rig → depositar saldo → `openSession()` (mock).
- [~] Vista de juego: placeholder de FPS en vivo (el stream real de Minecraft llega por Moonlight, fuera de la web — WB6/WB7).
- [x] **Trial visible:** contador verde "prueba gratis 10 s" antes de cobrar.
- [x] **Deuda en vivo:** log de eventos `FpsReported` (mock 1/seg) + FPS + deuda subiendo / saldo bajando.
- [x] Botón "Terminar sesión" → `closeSession()` + reembolso (mock).
- [ ] **Wiring al contrato real** (depende del address de WB3 de Dev A). Ver `web/README.md`.

**Estado:** corre en `web/`, `npm run dev` → :3000. Build y typecheck en verde. Banner "MOCK MODE"
hasta que se configure `NEXT_PUBLIC_GHOSTRIG_ADDRESS`. ABI acordada en `interface.md`.

**Entregable:** ✅ flujo cliente jugable end-to-end (en mock); pendiente conectar al contrato real.

---

## WB6 — Conexión cliente↔host en LAN (Dev B) 🟡 — host listo, falta pairing con Martin
**Objetivo:** conectar cliente y host vía Sunshine/Moonlight. Ver `docs/streaming-setup.md`.

- [x] **Host (PC Robertino):** Sunshine instalado, servicio + firewall LAN OK, app "Desktop" lista. IP `192.168.112.212`.
- [ ] Host: crear cuenta en la consola web (`https://localhost:47990`) — pendiente, 1 min.
- [ ] **Cliente (PC Martin):** instalar Moonlight, agregar host por IP.
- [ ] **Pairing:** PIN de Moonlight → consola Sunshine (requiere ambas PCs juntas, hacer antes de la demo).
- [ ] 🟢 Matchmaking por región/lista de hosts (post-hackathon; para la demo 1 host alcanza).

**Entregable:** Martin ve el escritorio del host y abre Minecraft por streaming.

---

## WB7 — La demo (split-screen) 🔴
**Objetivo:** el momento que gana el hackathon.

- [ ] Pantalla dividida: **Minecraft/stream** a la izquierda, **explorer de Monad** a la derecha.
- [ ] Mostrar tx de `reportFps()` apareciendo cada segundo con el FPS real.
- [ ] Mostrar deuda del cliente **subiendo en vivo** y, al cerrar, el host cobrando + reembolso.
- [ ] Guion de demo de 2-3 min ensayado (incluye los 10 s de prueba gratis).

**Entregable:** demo reproducible + guion.

---

## WB8 — Pitch & material 🟡
**Objetivo:** contar la historia.

- [ ] Slides basadas en `PROJECT.md` (problema → solución → por qué Monad → demo).
- [ ] Recalcar la línea: *"Monad elimina la necesidad de state channels"*.
- [ ] Mostrar la cuenta de los 100k jugadores simultáneos.
- [ ] 🟢 README con instrucciones de correr el proyecto.

**Entregable:** pitch deck + demo listos para presentar.

---

## Camino crítico (orden sugerido)

```
WB0 (juntos, 30 min)
   ↓
DEV A: WB1 → WB2 → WB3        DEV B: WB5 (UI con mock) + WB4-v0 (host simulado)
   (contrato vivo + verificado)        en paralelo, contra una ABI/mock acordada
                  ↓ (se encuentran cuando el contrato está deployado)
        Integración: WB4-v1 (Sunshine/Minecraft) + WB5 conectado al contrato real
                  ↓
              WB7 (demo) — juntos
                  ↓
              WB8 (pitch) — Dev A mientras Dev B pule la demo
```

## Regla de oro del alcance
El **protagonista es el contrato + la liquidación en vivo sobre Monad**. El streaming es secundario: si aprieta el tiempo, **stream simulado + liquidación real on-chain** cuenta toda la historia. No quemar el hackathon peleando con el streaming.

---

# 👥 División del trabajo — 2 developers

La división está pensada para que **trabajen en paralelo casi sin bloquearse**. La clave: **acordar primero la interfaz del contrato (ABI) en WB0**, así cada uno programa contra esa interfaz aunque el otro no haya terminado.

## 🔵 DEV A — "On-chain / Backend" (dueño del dinero)
**Responsable de que la plata sea correcta y el host cobre bien.**

| WB | Tarea | Prioridad |
|----|-------|-----------|
| WB1 | Escribir `GhostRig.sol` (registerRig, openSession, reportFps, closeSession, timeout) | 🔴 |
| WB2 | Tests Foundry (trial, cap, cobro, permisos) — `forge test` en verde | 🔴 |
| WB3 | Deploy + verificación en Monad testnet; entregar address + ABI | 🔴 |
| WB4 | **Host-agent**: mide FPS real y llama `reportFps` cada segundo con la wallet del host | 🔴 |
| WB8 | Pitch deck (narrativa anti-state-channels, cuenta de los 100k) | 🟡 |

**Carpetas:** `/contracts`, `/host-agent`, `/docs` (pitch).
**Stack:** Solidity, Foundry, Node/TS (host-agent), viem (para firmar tx del host).

## 🟢 DEV B — "Frontend / Streaming" (dueño de la experiencia)
**Responsable de que el juez vea, toque y entienda.**

| WB | Tarea | Prioridad |
|----|-------|-----------|
| WB5 | App Next.js + viem/wagmi: conectar wallet, depositar, `openSession`, deuda en vivo, cerrar | 🔴 |
| WB6 | Conexión cliente↔host en LAN (Sunshine/Moonlight) — versión mínima, 1 host | 🟡 |
| WB4-stream | Montar **Sunshine + Minecraft** en la PC del host y **Moonlight** en el cliente | 🔴 |
| WB7 | La demo split-screen (juego + explorer) + ensayar guion | 🔴 |

**Carpetas:** `/web`, setup de Sunshine/Moonlight.
**Stack:** Next.js, viem/wagmi, Sunshine/Moonlight (config, no C++).

## 🤝 El contrato entre ambos (la interfaz que acuerdan en WB0)
Para no bloquearse, en WB0 escriben juntos **un archivo `interface.md`** con:
- Las firmas exactas: `registerRig(uint256 pricePerFps)`, `openSession(uint256 rigId) payable`, `reportFps(uint256 sessionId, uint256 fps)`, `closeSession(uint256 sessionId)`.
- Los eventos: `FpsReported(uint256 sessionId, uint256 fps, uint256 accrued)`, etc.
- Mientras Dev A termina el contrato real, **Dev B trabaja contra un mock con esa misma ABI** (un contrato dummy deployado, o datos simulados). Cuando WB3 entrega el address real, Dev B solo cambia la dirección.

## Punto de sincronización (1 sola dependencia dura)
Dev B necesita el **address + ABI** de Dev A (fin de WB3) para conectar de verdad. Hasta entonces, **ninguno espera al otro**: A construye/testea el contrato, B construye la UI + monta el streaming. Se juntan en la integración y la demo.

## Decisiones de arquitectura derivadas
- **Streaming ≠ web de pago:** son dos superficies. El jugador paga en la web (wallet) y juega vía Moonlight. El **host-agent** es el pegamento entre el contrato y Sunshine.
- **Sunshine/Moonlight son GPL-3.0** → ok para hackathon; no contamina nuestro contrato ni web (procesos separados).
