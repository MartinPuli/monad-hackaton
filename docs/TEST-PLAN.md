# GhostRig — Plan de prueba (para Rober / setup del host)

Estado: **el pago end-to-end YA funciona y está probado** (contrato + host-agent + web).
Lo único sin confirmar es el **streaming embebido en la web** (el iframe del juego).
Este doc es para cerrar eso y dejar la demo andando en LAN.

---

## ✅ Lo que YA funciona (no hay que tocar)

| Pieza | Estado |
|-------|--------|
| Contrato `GhostRig` | deployado + verificado: `0x2F9e911f380e03557Ec65F941Dba32c879172b9a` |
| Tests | 24/24 verde (`forge test`) |
| host-agent | reporta FPS reales cada seg → cobra on-chain → cierra solo (probado) |
| Web (pago) | conecta wallet, deposita, sesión real, FPS/gasto/saldo en vivo, salir+liquidar |
| Rig de demo | rigId `0`, precio `16666666666666` wei/FPS (~0.001 MON/s a 60fps) |

→ Sin tocar nada, la web ya muestra el **pago real on-chain en vivo**. Eso solo ya es demo válida.

---

## 🔴 Lo ÚNICO que falta probar: el juego embebido en la web

La web tiene un panel a pantalla completa que embebe `NEXT_PUBLIC_STREAM_URL` en un iframe
(componente `web/src/app/GameStream.tsx`). Para que se vea **Minecraft real jugable dentro de
la web**, el host necesita servir el juego por WebRTC. Sunshine pelado NO lo hace; hay que usar
un fork que exponga `/webrtc`:

### Opción recomendada: Vibeshine o LuminalShine
Son forks de Sunshine que streamean directo al navegador (endpoint `/webrtc`), sin instalar
Moonlight aparte.

- Vibeshine: https://github.com/Nonary/vibeshine
- LuminalShine: https://github.com/NortheBridge/luminalshine
- moonlight-web-stream (alternativa): https://github.com/MrCreativ3001/moonlight-web-stream

### Pasos (PC del host = la de tu amigo con la GPU)
1. [ ] Instalar **Vibeshine** (o LuminalShine) en vez de Sunshine. Mismo flujo de setup.
2. [ ] Abrir Minecraft en el host.
3. [ ] Abrir en un navegador del host: `http://localhost:<puerto>/webrtc` → confirmar que se ve
       y se juega Minecraft. Anotar el puerto.
4. [ ] Confirmar la IP LAN del host (ej. `192.168.112.212`).
5. [ ] Desde la PC del cliente (Martin), abrir `http://<ip-host>:<puerto>/webrtc` en el navegador
       → confirmar que ve el juego por LAN.

### Conectar el stream a la web
En `web/.env.local` (crear si no está):
```
NEXT_PUBLIC_GHOSTRIG_ADDRESS=0x2F9e911f380e03557Ec65F941Dba32c879172b9a
NEXT_PUBLIC_RIG_ID=0
NEXT_PUBLIC_STREAM_URL=http://<ip-host>:<puerto>/webrtc
```
Reiniciar `npm run dev`. Al entrar en sesión, el iframe muestra el juego + el overlay de pago.

---

## ▶️ Cómo correr la demo completa en LAN

**En la PC del host (amigo):**
1. [ ] Vibeshine + Minecraft corriendo, `/webrtc` confirmado.
2. [ ] host-agent corriendo (reporta FPS y cobra):
   ```
   cd host-agent
   # .env con HOST_PRIVATE_KEY de la wallet del host (la dueña del rig 0)
   HOST_PRIVATE_KEY=0x... RIG_ID=0 GHOSTRIG_ADDRESS=0x2F9e911f380e03557Ec65F941Dba32c879172b9a npm start
   ```

**En la PC del cliente (Martin):**
3. [ ] `cd web && npm run dev` → abrir `http://localhost:3000`
4. [ ] Conectar MetaMask en **red Monad testnet (10143)**, con algo de MON (faucet).
5. [ ] Depositar (ej. 0.05 MON) → se abre sesión real → 10s gratis → empieza a cobrar.
6. [ ] Se ve: Minecraft en el iframe + overlay FPS/gasto/saldo bajando en vivo.
7. [ ] "Salir y liquidar" → cierra sesión → host cobra, cliente recupera el resto (`withdraw`).

---

## ⚠️ Riesgos conocidos (para no improvisar el día de la demo)

1. **Pairing/streaming hay que probarlo ANTES.** Es lo único no confirmado. Si Vibeshine no
   levanta a tiempo → plan B: la web funciona igual mostrando el pago real; el "juego" puede ser
   un video local. La historia se cuenta igual.
2. **Vercel + LAN no se mezclan bien:** un iframe `http://<ip-lan>/webrtc` dentro de una web
   `https://` de Vercel se bloquea por mixed-content. Para la demo del streaming embebido,
   **correr la web en local** (mismo `http://`), no en Vercel.
3. **Wallets:** el host firma `reportFps` (gas, poquito) y el cliente deposita. Dos wallets
   distintas, ambas con MON de testnet.
4. **El host-agent debe estar corriendo** o la web no muestra FPS (nadie los reporta).

---

## ¿Funciona "lo demás"? Sí.
- Contrato, host-agent y web de pago: **probado, funciona.**
- Lo que hay que cerrar es **solo** el streaming embebido (Vibeshine `/webrtc` + la URL en `.env.local`).
- Si eso anda → demo completa: jugás Minecraft en la web y pagás por FPS en vivo, real, sobre Monad.
