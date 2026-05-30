# WB4-stream + WB6 — Setup de streaming (Sunshine host ↔ Moonlight cliente)

Demo: **PC de Robertino = HOST** (sirve Minecraft), **PC de Martin = CLIENTE** (juega por streaming).
Modo elegido: **Desktop** (el cliente ve el escritorio del host y abre TLauncher ahí). Simple y robusto.

---

## ✅ HOST (PC de Robertino) — ya configurado

| Item | Estado |
|---|---|
| Sunshine instalado | ✅ `C:\Program Files\Sunshine` (winget) |
| Servicio | ✅ `SunshineService` running, arranque automático |
| Firewall LAN | ✅ reglas TCP+UDP, todos los perfiles, Allow |
| Puertos en la LAN | ✅ 47984/47989/47990/48010 escuchando en `0.0.0.0` |
| App de stream | ✅ "Desktop" disponible por defecto |
| **IP del host (LAN)** | **`192.168.112.212`** ← Martin la carga en Moonlight |

**Pendiente (solo Robertino, 1 min):** crear cuenta en la consola web.
1. Abrir `https://localhost:47990`.
2. Aviso de certificado → **Avanzado → Continuar a localhost** (cert autofirmado, normal).
3. Crear **usuario + contraseña** y guardarlos.

> Para mejor latencia en la demo: host por cable de ser posible, y misma red/AP que el cliente.

---

## 🟢 CLIENTE (PC de Martin) — pasos para Moonlight

1. Instalar **Moonlight**: https://moonlight-stream.org (o `winget install MoonlightGameStreaming.Moonlight`).
2. Abrir Moonlight. Si no detecta el host solo, **agregarlo manual** con la IP:
   **`192.168.112.212`**
3. Aparece la PC con un candado. Al clickearla, Moonlight muestra un **PIN de 4 dígitos**.

## 🤝 Pairing (los dos juntos, una vez)

1. Martin clickea el host en Moonlight → anota el **PIN**.
2. Robertino entra a la consola de Sunshine (`https://localhost:47990`) → pestaña **"PIN"**.
3. Pega el PIN → **Send**.
4. Quedan pareados. Martin ya ve el host.

## ▶️ Correr el stream (demo)

1. En Moonlight, Martin elige el host → app **"Desktop"** → Start.
2. Ve el escritorio de Robertino. Robertino (o Martin remotamente) abre **TLauncher → Minecraft**.
3. Listo: Martin juega Minecraft que corre en la PC de Robertino.

---

## Checklist día de la demo
- [ ] Host: cuenta de Sunshine creada, servicio corriendo.
- [ ] Host y cliente en la **misma LAN** (idealmente cable + mismo router).
- [ ] Moonlight instalado en el cliente y **pareado** (PIN hecho antes, no en vivo).
- [ ] Minecraft/TLauncher abierto y andando en el host.
- [ ] Sunshine: bajar resolución/bitrate si hay lag (consola web → Configuration).
- [ ] La web GhostRig abierta en el cliente (capa de pago) — ver `web/`.

## Notas
- Sunshine/Moonlight son **GPL-3.0**. OK para hackathon.
- El pairing **no se puede hacer solo**: requiere el cliente generando el PIN. Hacerlo **antes** de la demo.
- El stream (video/inputs) va por la LAN, **fuera** de la web. La web GhostRig solo maneja el pago on-chain.
