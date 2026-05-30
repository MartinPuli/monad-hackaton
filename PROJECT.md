# GhostRig — El Airbnb de las PCs gamer, sobre Monad

> **Nombre de trabajo:** GhostRig (placeholder — se puede cambiar).
> Otras opciones: FrameRent, RigShare, PixelLease, HashPlay.

---

## 1. El pitch en una frase

> **Convertimos cualquier dispositivo en una PC gamer de alta gama alquilando el poder de las PCs que están sin usar — y pagás solo por lo que jugás, liquidado en tiempo real sobre Monad.**

---

## 2. El problema

- Jugar juegos modernos exige una PC de **USD 1.500+**. Millones de personas tienen buena conexión a internet pero no pueden pagar ese hardware.
- Al mismo tiempo, millones de PCs potentes pasan **apagadas o sin usar** la mayor parte del día — capital muerto.
- Las plataformas de cloud gaming que existen (GeForce NOW, Stadia en su momento) son **centralizadas**: una empresa pone el hardware, cobra suscripción fija, se queda la comisión y controla todo.

---

## 3. La solución

Un **mercado peer-to-peer** de poder de cómputo para gaming:

- **Quien tiene una PC potente** la alquila cuando no la usa y **gana dinero pasivo**.
- **Quien no tiene PC** juega esos mismos juegos desde cualquier dispositivo (laptop vieja, incluso un celu), porque el juego corre en la máquina del otro y le llega como **video en vivo** (streaming), mandando de vuelta sus controles.

Es **Uber / Airbnb, pero de GPUs para gaming.**

### Pagás solo por lo que usás

Nada de suscripciones mensuales. **Pay-per-use real:** cargás saldo, y se va descontando mientras jugás, en tiempo real, según los **FPS que efectivamente recibís**.

### Reglas del modelo (decididas)

- **Moneda:** MON nativo.
- **Prueba gratis (anti-estafa):** los primeros **10 segundos no se cobran**. El cliente verifica que el juego funciona y se ve bien antes de pagar un peso. Si es una estafa o anda mal, se va sin pagar.
- **El host fija el precio por FPS:** `registerRig(pricePerFps)`. El cliente no puede manipularlo (está registrado on-chain a nombre del host).
- **Se paga por la calidad real:** cada segundo medimos los FPS efectivamente entregados y la deuda crece `fps × pricePerFps`. Más fluido = más caro; cortado = más barato. Pagás por lo que recibís.
- **Una transacción por segundo con el FPS real** (`reportFps`): cada segundo escribimos en Monad un dato real de uso. **El cobro del total se hace al cerrar la sesión** (`closeSession`), no segundo a segundo — el host registra durante la sesión y embolsa todo junto al final, reembolsando al cliente el saldo no usado.

---

## 4. Dónde entra Monad (y por qué es el corazón, no decoración)

El dinero entre el jugador y el dueño de la PC se mueve **automáticamente, en tiempo real y sin intermediarios**, sobre Monad. El dueño ve su plata entrar **mientras** presta su PC.

### El insight técnico que nos diferencia

La forma "vieja" de hacer micropagos en blockchain son los **state channels** (lo que usa Lightning en Bitcoin): se inventaron **porque las blockchains eran lentas y caras**, así que escondés los pagos off-chain y solo tocás la cadena 2 veces.

**Monad es tan rápido que no necesitamos eso.** Liquidamos cada sesión **directamente on-chain, cada pocos segundos**. Sin channels, sin la complejidad criptográfica que otras cadenas te obligan a tragar.

La cuenta que lo justifica:
- No 1 transacción por frame (60/s por usuario → imposible en cualquier cadena).
- Sino **1 liquidación cada ~10 segundos por sesión** = 0,1 TPS por jugador.
- **10.000 TPS de Monad ÷ 0,1 = 100.000 jugadores simultáneos** liquidando on-chain, sin L2, sin channels.

> **En cualquier otra cadena esto se traba o sale carísimo. En Monad es la arquitectura por defecto.**

### Las 3 propiedades de Monad que usamos

1. **Throughput (10k TPS):** toda la plataforma liquida on-chain en tiempo real, a escala.
2. **Finalidad rápida (~1s):** el host ve la plata caer en su wallet *mientras* sirve frames, no minutos después. (Esto es lo que hace la demo visualmente brutal.)
3. **Gas barato:** miles de liquidaciones por segundo cuestan centavos, no dólares.

---

## 5. Por qué NO es "pay-per-fps por transacción" (honestidad técnica)

A 60 FPS harían falta 60 transacciones por segundo por jugador. Aunque Monad las aguante:
- Cada tx tarda más que un frame (16 ms) → el pago siempre va atrasado del render.
- Pagar gas 60 veces por segundo es absurdo.
- No podés bloquear el render esperando que confirme un pago.

**El render (frames) y el dinero están desacoplados.** Los frames fluyen por streaming a 60 FPS; el dinero se *mide* a esa velocidad pero se *liquida* on-chain cada N segundos. El usuario **experimenta** pay-per-fps perfecto; la cadena no se ahoga.

---

## 6. Arquitectura (liquidación on-chain directa, sin channels)

```
HOST (PC potente)
 ├─ Captura + encode del juego (NVENC/AMF) → streaming por WebRTC
 ├─ Cuenta frames servidos + calidad (res/fps)
 └─ Agente de pago: cada N s, llama settle() en el contrato → cobra

RED
 └─ WebRTC P2P (frames van, inputs vuelven)   ← la LATENCIA vive acá, no en Monad
    + servidor de señalización/matchmaking (empareja por región/cercanía)

CLIENTE (dispositivo débil)
 ├─ Decode del stream → render + captura de teclado/mouse/gamepad
 └─ Wallet: deposita saldo, ve cómo se descuenta en vivo

MONAD (contrato de mercado/escrow)
 ├─ registerRig(pricePerFps) : el host fija su precio por FPS (una vez)
 ├─ openSession(rigId)       : cliente deposita saldo y arranca la sesión
 ├─ reportFps(id, fps)       : cada segundo (desde el seg 11) registra el FPS real → acumula deuda
 └─ closeSession(id)         : cobra el total acumulado al host + reembolsa el saldo no usado
```

### Modelo de confianza (cómo evitamos trampas sin intermediario)

- El cliente deposita el saldo **antes** en el contrato (escrow). El host no juega gratis.
- **Trial de 10 s:** el cliente prueba que el juego funciona antes de que corra el reloj de cobro.
- La deuda se **acumula on-chain cada segundo** según el FPS real; el **pago al host se ejecuta al cerrar**.
- Si el host manda frames basura o infla el FPS, el cliente **lo ve en vivo y cierra la sesión**.
- Si el cliente intenta no pagar, no puede: el saldo ya está bloqueado on-chain.
- **El cliente es el verificador:** como ve el juego en tiempo real, no hace falta verificación criptográfica del cómputo. La pérdida máxima por trampa de cualquiera de los dos es **~1 segundo**.

---

## 7. Lo que hace ganar el hackathon

| Eje | Por qué gana |
|-----|--------------|
| **Narrativa** | "Monad elimina la necesidad de state channels" — defendible, técnico, único de Monad. |
| **Demo visual** | Split-screen: juego corriendo + explorer de Monad con tx de liquidación cada 5 s y balance subiendo en vivo. |
| **Caso de uso real** | No es un DeFi más: es gaming, mercado de hardware, algo que cualquiera entiende. |
| **Imposible en otra cadena** | El argumento de throughput + finalidad es real y verificable. |

### Extensiones (factor wow / si sobra tiempo)
- **Mercado de GPU on-chain:** hosts publican precio/disponibilidad, order book en tiempo real ("Uber de FPS").
- **Composabilidad DeFi:** el ingreso del host es un yield on-chain → tokenizar la GPU, staking de reputación, etc. Esto **solo es posible** porque los pagos están on-chain, no escondidos en channels.

---

## 8. La demo que cierra el trato

**Setup real:** un amigo prende **Minecraft + Sunshine** en su PC (el host); jugamos desde otra compu en la **misma red local (LAN/wifi)** — Sunshine/Moonlight da baja latencia y se siente fluido.

1. Cliente sin GPU abre la app, conecta wallet, deposita saldo en Monad.
2. Se conecta al host (la PC del amigo con Minecraft).
3. **Juega Minecraft de verdad** por streaming — se ve corriendo en una compu que no lo está corriendo.
4. Primeros **10 s gratis** (prueba). Después, **split-screen:** a un lado Minecraft, al otro el explorer de Monad mostrando una tx de `reportFps()` por segundo con el FPS real, y la deuda subiendo en vivo.
5. El cliente cierra la sesión: el host cobra el total y el saldo no usado se reembolsa al instante.

> **Plan B (si la red del evento falla):** mismo pago 100% real en Monad, pero el "juego" es un stream local/simulado con FPS medible. La historia se cuenta igual.

> Si el jurado ve **frames corriendo Y plata moviéndose on-chain en tiempo real en la misma pantalla**, ganamos la parte emocional. La narrativa técnica gana el resto.

---

## 9. Alcance honesto para el hackathon

- **Lo difícil de verdad NO es el blockchain** — es el streaming de baja latencia. Por eso **no lo reinventamos**: usamos tecnología probada (Sunshine/Moonlight, WebRTC) o incluso simulamos el stream si el tiempo aprieta.
- **El protagonista del hackathon es el contrato + la liquidación en vivo sobre Monad.** Ahí ponemos la energía.
- Si el streaming P2P real no llega a tiempo, una **demo con stream local/simulado + liquidación real on-chain** sigue contando toda la historia.
