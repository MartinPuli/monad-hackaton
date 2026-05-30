# host-agent/ — Servidor del dueño de la PC (WB4)

El proceso que corre en la PC potente: sirve el juego (vía Sunshine) y cobra on-chain.
Es el **pegamento entre el pago (contrato Monad) y el stream (Sunshine)**.

## Stack
- Node/TS
- Wallet del host (firma las tx de `settle()`)
- Integración con **Sunshine** (host de streaming, GPL-3.0)

## Responsabilidades
1. Escuchar el evento `SessionOpened` del contrato → habilitar el stream en Sunshine.
2. Cada **5 s**, llamar `settle(sessionId)` para cobrar `tiempo × ratePerSecond`.
3. **Cortar el stream de Sunshine** cuando:
   - el cliente llama `closeSession()`, o
   - el saldo depositado se agota.
4. Emitir estado (tiempo de sesión, MON cobrado) para mostrar en la UI / demo.

## Streaming: Sunshine + Moonlight
- **Host:** Sunshine (https://github.com/LizardByte/Sunshine) — captura + encode HW + baja latencia.
- **Cliente:** Moonlight — la app con la que juega el usuario.
- Pairing por PIN: para la demo se puede pre-parear una vez.

## Plan incremental de streaming
- v1 🔴: WebRTC / Sunshine real (decisión cerrada: streaming real).
- El protagonista del hackathon sigue siendo el contrato + liquidación en vivo.
  Si el streaming P2P traba, NO quemar el hackathon ahí — ver regla de oro en `../PLAN.md`.
