# GhostRig — Plan de ejecución (Workblocks)

Arquitectura elegida: **liquidación on-chain directa, sin state channels.**
Red: **Monad testnet (chain ID 10143)**. Smart contracts con **Foundry**. Frontend con **viem/wagmi**.

Leyenda de prioridad: 🔴 core (sin esto no hay demo) · 🟡 importante · 🟢 nice-to-have / si sobra tiempo.

---

## WB0 — Setup & decisiones ✅ COMPLETADO
**Objetivo:** dejar el terreno listo para hackear sin fricción.

- [x] Decisiones cerradas (ver sección abajo).
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
  - `struct Session { client, host, deposit, spent, ratePerSecond, startTime, lastSettle, open }`
  - `openSession(host, ratePerSecond) payable` → cliente deposita saldo, abre sesión.
  - `settle(sessionId)` → host cobra lo acumulado desde `lastSettle` (calculado por tiempo × rate, cap al depósito).
  - `closeSession(sessionId)` → liquidación final + reembolso del saldo no usado al cliente.
  - `clientTimeout(sessionId)` → si el host abandona, el cliente recupera el saldo.
  - Eventos: `SessionOpened`, `Settled`, `SessionClosed` (para que el frontend escuche en vivo).
- [ ] Guards: reentrancy, solo host puede `settle`, solo cliente/host pueden cerrar, etc.

**Entregable:** `GhostRig.sol` compilando.

---

## WB2 — Tests del contrato 🔴
**Objetivo:** garantizar que la plata no se pierde ni se duplica.

- [ ] Test: apertura descuenta el depósito correcto.
- [ ] Test: `settle` paga exactamente lo proporcional al tiempo transcurrido.
- [ ] Test: no se puede cobrar más que el depósito.
- [ ] Test: cierre reembolsa el remanente correcto.
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
  - cuenta "frames servidos" / tiempo de sesión (real o simulado al inicio).
  - cada N s, firma y envía `settle(sessionId)` a Monad con la wallet del host.
  - emite estado (frames, fps, saldo cobrado) para mostrar en UI.
- [ ] **Decisión de streaming** (elegir según tiempo disponible):
  - 🔴 v0: **simulado** — un video/canvas loop como "el juego", para validar todo el flujo de pago.
  - 🟡 v1: streaming real con **WebRTC** (captura de pantalla → cliente).
  - 🟢 v2: integrar **Sunshine/Moonlight** para un juego real.

**Entregable:** host que liquida automáticamente cada N s contra el contrato.

---

## WB5 — Frontend / Cliente 🔴
**Objetivo:** la app donde el jugador conecta wallet, deposita y juega.

- [ ] App con **Next.js + viem/wagmi**, chain `monadTestnet` de `viem/chains`.
- [ ] Conectar wallet (MetaMask con red Monad testnet).
- [ ] Pantalla: depositar saldo → `openSession()`.
- [ ] Vista de juego: recibe el stream (o el simulado) + captura inputs.
- [ ] **Saldo en vivo:** escuchar eventos `Settled` y mostrar el balance descontándose en tiempo real.
- [ ] Botón "Terminar sesión" → `closeSession()` + mostrar reembolso.

**Entregable:** flujo completo cliente jugable end-to-end.

---

## WB6 — Matchmaking / señalización 🟡
**Objetivo:** conectar cliente y host.

- [ ] Servidor de señalización mínimo (WebSocket) para el handshake WebRTC.
- [ ] Lista simple de hosts disponibles (para la demo, 1 host basta).
- [ ] 🟢 Emparejamiento por región/latencia (post-hackathon).

**Entregable:** cliente y host se encuentran y conectan.

---

## WB7 — La demo (split-screen) 🔴
**Objetivo:** el momento que gana el hackathon.

- [ ] Pantalla dividida: **juego/stream** a la izquierda, **explorer de Monad** a la derecha.
- [ ] Mostrar tx de `settle()` apareciendo cada ~5 s.
- [ ] Mostrar balance del host **subiendo en vivo** y saldo del cliente **bajando**.
- [ ] Guion de demo de 2-3 min ensayado.

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
WB0 → WB1 → WB2 → WB3   (contrato vivo y verificado = base trustless)
            ↓
        WB4 + WB5 en paralelo   (host cobra + cliente paga)
            ↓
          WB7   (demo split-screen)
            ↓
      WB6 y WB8 según tiempo
```

## Regla de oro del alcance
El **protagonista es el contrato + la liquidación en vivo sobre Monad**. El streaming es secundario: si aprieta el tiempo, **stream simulado + liquidación real on-chain** cuenta toda la historia. No quemar el hackathon peleando con WebRTC.

---

## Decisiones cerradas ✅
1. **Unidad de cobro:** por **segundo** (`tiempo × ratePerSecond`). El rate refleja la calidad/FPS acordados al abrir la sesión. Nada que el host pueda falsear.
2. **Intervalo de liquidación:** **cada 5 s**.
3. **Moneda:** **MON nativo** (testnet).
4. **Streaming:** **real**, con **Sunshine (host) + Moonlight (cliente)**. El host-agent ata el pago al ciclo de vida del stream (corta el stream cuando se agota el saldo / se cierra la sesión).
5. **Nombre:** GhostRig (placeholder, sujeto a cambio).

## Decisiones de arquitectura derivadas
- **Streaming ≠ web de pago:** son dos superficies. El jugador paga en la web (wallet) y juega vía Moonlight. El **host-agent** es el pegamento entre el contrato y Sunshine.
- **Sunshine/Moonlight son GPL-3.0** → ok para hackathon; no contamina nuestro contrato ni web (procesos separados).
