# GhostRig — Guión de demo (el momento que gana el hackathon)

> **La idea en una imagen:** en una sola pantalla, el jurado ve **Minecraft corriendo
> en una compu que no lo está corriendo** Y **plata moviéndose on-chain en Monad en
> tiempo real**. Frames a la izquierda, dinero a la derecha. Si logramos eso, ya
> ganamos la parte emocional. La narrativa técnica gana el resto.

Duración objetivo: **2:30 – 3:00 min**. Ensayar mínimo 3 veces completas.

---

## 0. La regla de oro de la demo

El protagonista NO es el streaming. Es **la liquidación en vivo sobre Monad**.
El streaming es el gancho emocional; el dinero on-chain es el argumento.
Si el streaming falla → Plan B (stream simulado) y la historia se cuenta **igual de fuerte**.

Lo único que NO puede fallar nunca: las **transacciones reales apareciendo en el
explorer de Monad** y el **balance del host subiendo**.

---

## 1. El layout de pantalla (split-screen)

```
┌───────────────────────────────┬───────────────────────────────┐
│  IZQUIERDA — EL JUEGO          │  DERECHA — MONAD EN VIVO        │
│                               │                                 │
│  Minecraft por streaming      │  ┌─ Saldo del cliente ───────┐  │
│  (Moonlight) corriendo en     │  │  0.100 → 0.087 MON  ↓      │  │
│  una laptop sin GPU.          │  └───────────────────────────┘  │
│                               │  ┌─ Cobrado al host ─────────┐  │
│  Overlay arriba:              │  │  0.000 → 0.013 MON  ↑      │  │
│   ⏱ TRIAL 7s   FPS: 60        │  └───────────────────────────┘  │
│   (luego)                     │                                 │
│   💸 COBRANDO  FPS: 58        │  Feed de tx (explorer Monad):   │
│                               │   ✓ reportFps  fps=60  0x9a..   │
│                               │   ✓ reportFps  fps=59  0x3f..   │
│                               │   ✓ reportFps  fps=61  0x7c..   │
│                               │   (una nueva cada segundo)      │
└───────────────────────────────┴───────────────────────────────┘
```

- **Izquierda:** la ventana de Moonlight con Minecraft (o el stream simulado en Plan B).
- **Derecha:** el frontend (Next.js) mostrando saldo del cliente bajando, cobrado al
  host subiendo, y un feed que escucha los eventos `FpsReported` / `SessionClosed`.
- Tener **el explorer de Monad abierto en una pestaña** (testnet, chain 10143) filtrado
  por la dirección del contrato, para poder hacer clic en una tx real frente al jurado.

---

## 2. Setup ANTES de subir al escenario (checklist)

Hacerlo todo y dejarlo "tibio" para que en vivo sea solo "apretar play".

- [ ] **Host (PC del amigo):** Minecraft abierto + **Sunshine** corriendo, en la misma
      red local que la laptop cliente.
- [ ] **Cliente (laptop débil):** **Moonlight** ya emparejado con el host (pairing hecho
      de antemano, no en vivo — el PIN come tiempo y pone nervioso).
- [ ] **Wallets con MON de testnet:**
      - Host: dirección que registró el rig.
      - Cliente: con saldo suficiente para depositar (ej. ≥ 0.2 MON).
- [ ] **Contrato deployado y verificado** en Monad testnet. Dirección anotada y cargada
      en el frontend.
- [ ] **Rig ya registrado** con `registerRig(pricePerFps)` (ver §6 para el número).
      No registrar en vivo — que el rig ya exista con su `rigId`.
- [ ] **Frontend corriendo** (`localhost`), wallet del cliente conectada a red Monad
      testnet, en la pantalla de "elegir rig".
- [ ] **Host-agent corriendo** (mide FPS y manda `reportFps` cada segundo desde el seg 11).
- [ ] **Explorer abierto** en pestaña aparte, filtrado por el contrato.
- [ ] **Plan B precargado** (stream simulado) en una pestaña, listo por si la red del
      evento falla. Decidir el switch en < 10 segundos, sin dramatizar.
- [ ] Silenciar notificaciones, modo no-molestar, brillo al máximo, zoom de la web a un
      tamaño legible desde lejos.

---

## 3. El guión, minuto a minuto

### Beat 0 — El gancho (0:00–0:20) · *antes de tocar nada*
> "Para jugar juegos modernos necesitás una PC de mil quinientos dólares. Al mismo
> tiempo, millones de PCs potentes están apagadas. **GhostRig es el Airbnb de las PCs
> gamer:** el que tiene la máquina la alquila cuando no la usa, y el que no tiene PC
> juega desde cualquier dispositivo — y paga solo por lo que juega, liquidado en vivo
> sobre Monad."

Señalar la laptop: *"Esta laptop no puede correr Minecraft. Miren."*

### Beat 1 — Conectar y depositar (0:20–0:40)
- Conectar wallet (ya conectada; solo mostrarla).
- Elegir el rig del amigo → **depositar saldo** → `openSession(rigId)`.
- En el explorer aparece la tx `SessionOpened`. *"Mi saldo ya está bloqueado on-chain
  en escrow. El host no juega gratis, pero yo tampoco puedo no pagar."*

### Beat 2 — Empieza a jugar (0:40–1:00)
- Minecraft aparece en la laptop por streaming. **Jugar de verdad** unos segundos:
  caminar, romper un bloque. *"Esto corre en la PC de mi amigo, a tres metros. Me llega
  como video y le mando mis controles de vuelta."*

### Beat 3 — Los 10 segundos GRATIS (1:00–1:15) · *el detalle anti-estafa*
- Overlay verde: **"PRUEBA GRATIS — 10s"** con cuenta regresiva.
- *"Los primeros 10 segundos no se cobran. Pruebo que el juego anda y se ve bien
  ANTES de pagar un peso. Si es una estafa o va mal, me voy sin pagar nada."*
- Mientras tanto, el saldo a la derecha **sigue intacto**. Señalarlo.

### Beat 4 — EL MOMENTO: liquidación en vivo (1:15–2:10) · *el clímax*
- Pasan los 10s. El overlay cambia a **"💸 COBRANDO · FPS: 60"**.
- A la derecha empieza el feed: **una tx `reportFps` por segundo**, con el FPS real.
- **Saldo del cliente baja** y **cobrado al host sube**, sincronizados, en vivo.
- Hacer clic en una `reportFps` del explorer → mostrar la tx real confirmada en Monad.
- **La línea que cierra el trato:**
  > "Esto es lo que nos diferencia. Los micropagos en blockchain normalmente usan
  > *state channels* — se inventaron porque las cadenas eran lentas y caras, así que
  > escondés los pagos off-chain. **Monad es tan rápido que no los necesitamos.**
  > Estamos liquidando **directamente on-chain, cada segundo**, y el host ve la plata
  > caer mientras sirve frames. Finalidad de ~1 segundo, gas de centavos."
- El argumento de escala (decirlo, no demostrarlo):
  > "No mandamos una tx por frame — eso es imposible en cualquier cadena. Mandamos una
  > liquidación por sesión cada pocos segundos: 0,1 TPS por jugador. Con los 10.000 TPS
  > de Monad, son **100.000 jugadores simultáneos** liquidando on-chain. Sin L2, sin
  > channels. En cualquier otra cadena esto se traba o sale carísimo."

### Beat 5 — Cerrar sesión y reembolso (2:10–2:30)
- Botón **"Terminar sesión"** → `closeSession(sessionId)`.
- El host **cobra el total acumulado** y al cliente se le **reembolsa el saldo no usado**,
  al instante. Mostrar ambos balances actualizados + la tx `SessionClosed`.
- *"Pagué exactamente por los FPS que recibí. Ni un segundo de más. El resto vuelve a mi
  wallet, ahora."*

### Cierre (2:30–...) — una frase
> "GhostRig: cualquier dispositivo se vuelve una PC gamer, y cada segundo de juego se
> liquida en vivo sobre Monad. **Esto solo es posible en Monad.**"

---

## 4. La pérdida máxima por trampa = 1 segundo (por si preguntan)

Si el jurado pregunta "¿cómo evitan trampas sin intermediario?":
- El cliente deposita **antes** (escrow on-chain) → el host no juega gratis.
- El **cliente es el verificador**: ve el juego en vivo. Si el host manda frames basura
  o infla el FPS, lo ve y cierra la sesión.
- Si el cliente quiere no pagar, no puede: el saldo ya está bloqueado.
- La deuda se acumula cada segundo según el FPS real; **el cobro se ejecuta al cerrar**.
- **Pérdida máxima de cualquiera de los dos por hacer trampa: ~1 segundo.** No hace falta
  verificación criptográfica del cómputo — el ojo del cliente alcanza.

---

## 5. Plan B (si la red del evento falla)

No dramatizar. Switch en < 10 segundos:
- La izquierda pasa a un **stream simulado** (canvas/video loop con FPS medible).
- **Todo lo demás es 100% real:** contrato real, tx reales en Monad, balances reales.
- La frase para taparlo con orgullo:
  > "El streaming de baja latencia es tecnología probada y no es el punto de esta demo.
  > El punto es la liquidación en vivo sobre Monad — y eso que ven a la derecha es 100%
  > real, en testnet, ahora mismo."

El streaming es lo único frágil; el dinero on-chain nunca depende de la red del evento
si las wallets ya tienen MON y el RPC de testnet responde.

---

## 6. Números sugeridos para que el drenaje se VEA bien

Querés que en la ventana de ~60–80s de cobro el saldo baje de forma visible pero no se
agote de golpe.

- **Depósito del cliente:** `0.1 MON`.
- **`pricePerFps` del host:** `0.00001 MON` (= `1e13` wei).
- A 60 FPS: `60 × 0.00001 = 0.0006 MON/segundo`.
- En 60 segundos de cobro: `≈ 0.036 MON` → se gasta ~1/3 del depósito. Drenaje visible,
  con reembolso jugoso al cerrar (efecto "te devuelvo lo que no usaste").

Fórmula para ajustar: `gasto_por_segundo = fps × pricePerFps`. Subí `pricePerFps` si
querés que baje más rápido para una demo más corta.

> ⚠️ Verificá las unidades en el contrato/frontend: `pricePerFps` está en **wei**. En el
> frontend convertí con `parseEther` / `formatEther` para mostrar MON legible.

---

## 7. Riesgos a de-riskear antes (orden de probabilidad)

| Riesgo | Mitigación |
|--------|-----------|
| Pairing de Moonlight en vivo come tiempo / falla | Emparejar **antes**, dejar Minecraft ya abierto. |
| Red del evento mala → streaming cortado | Plan B precargado (§5). |
| Wallet sin gas / RPC lento | Wallets fondeadas de antemano; tener un RPC de respaldo. |
| El feed de eventos no actualiza | Probar el listener de `FpsReported` antes; fallback: refrescar el explorer manual. |
| Nervios → te comés un beat | Este guión impreso/en notas; ensayado 3+ veces. |
| Unidades wei↔MON mal mostradas | Verificar `formatEther` en la UI antes de subir. |

---

## 8. Qué tiene que estar listo (mapeo a los workblocks)

- **WB3** — contrato deployado + verificado (dirección + ABI cargados). 🔴
- **WB5** — frontend: conectar wallet, depositar, `openSession`, deuda en vivo, cerrar. 🔴
- **WB4** — host-agent midiendo FPS y llamando `reportFps` cada segundo. 🔴
- **WB4-stream** — Sunshine+Minecraft (host) + Moonlight (cliente) en LAN. 🔴 (o Plan B)
- **WB7** — esta pantalla split-screen + este guión ensayado. 🔴

Si algo de streaming no llega: **Plan B**. Si algo del contrato/liquidación no llega:
**no hay demo** — ahí va la energía.
