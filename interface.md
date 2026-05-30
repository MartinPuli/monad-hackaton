# interface.md — Contrato entre Dev A (on-chain) y Dev B (frontend)

> Fuente de verdad de la ABI de `GhostRig.sol`. Dev B construye la UI contra esto
> (con un mock) sin esperar a que Dev A termine. Cuando WB3 entregue el address real,
> Dev B solo cambia la dirección.
>
> ⚠️ **Dev A: confirmá o ajustá estas firmas.** Si cambia algo acá, avisar a Dev B.

Red: **Monad testnet** (chainId `10143`, RPC `https://testnet-rpc.monad.xyz`).
Moneda: **MON nativo** (los montos son `wei`, 18 decimales).

---

## Modelo

- El **host** registra su rig una vez y fija el **precio por FPS** (`pricePerFps`, en wei por FPS por segundo).
- El **cliente** abre una sesión depositando saldo (escrow).
- Los primeros **10 segundos son gratis** (trial). Desde el segundo 11, el host llama `reportFps` cada segundo y la deuda crece `fps × pricePerFps`.
- Al **cerrar**, el host cobra la deuda acumulada y el cliente recupera el saldo no usado.

---

## Funciones

```solidity
// --- HOST ---

/// El host registra su rig y fija el precio. Devuelve el rigId.
/// pricePerFps: wei cobrados por cada 1 FPS durante 1 segundo.
function registerRig(uint256 pricePerFps) external returns (uint256 rigId);

/// El host (solo el dueño del rig) reporta el FPS real del último segundo.
/// Solo válido después del trial (>= 10s desde startTime).
/// Acumula: accrued += fps * pricePerFps, con tope en deposit.
function reportFps(uint256 sessionId, uint256 fps) external;

// --- CLIENTE ---

/// El cliente abre una sesión contra un rig y deposita saldo (msg.value).
/// Lee el pricePerFps del rig (el cliente NO lo pasa). Devuelve sessionId.
function openSession(uint256 rigId) external payable returns (uint256 sessionId);

/// Cierra la sesión: paga `accrued` al host, reembolsa `deposit - accrued` al cliente.
/// Lo puede llamar el cliente o el host.
function closeSession(uint256 sessionId) external;

/// Rescate: si el host abandona (deja de reportar), el cliente recupera el saldo.
/// Llamable por el cliente tras un periodo de inactividad.
function clientTimeout(uint256 sessionId) external;

// --- LECTURA (views, para el frontend) ---

function getSession(uint256 sessionId) external view returns (
    address client,
    uint256 rigId,
    uint256 deposit,
    uint256 accrued,
    uint256 startTime,
    uint256 lastReport,
    bool open
);

function getRig(uint256 rigId) external view returns (
    address host,
    uint256 pricePerFps,
    bool active
);
```

---

## Eventos (lo que el frontend escucha en vivo)

```solidity
event RigRegistered(uint256 indexed rigId, address indexed host, uint256 pricePerFps);
event SessionOpened(uint256 indexed sessionId, uint256 indexed rigId, address indexed client, uint256 deposit);
event FpsReported(uint256 indexed sessionId, uint256 fps, uint256 accrued); // cada segundo
event SessionClosed(uint256 indexed sessionId, uint256 paidToHost, uint256 refundToClient);
```

---

## Notas para el frontend (Dev B)

- **Deuda en vivo:** suscribirse a `FpsReported` → mostrar `fps` del momento y `accrued` subiendo / `deposit - accrued` bajando.
- **Trial:** mostrar contador "prueba gratis 10 s" usando `startTime` (no habrá `FpsReported` hasta el seg 11).
- **Unidades:** `pricePerFps`, `deposit`, `accrued` en wei. Formatear con `formatEther` / `parseEther`.
- **Mock:** mientras no exista el contrato real, simular los eventos `FpsReported` con un `setInterval` que emita un `fps` random (50-60) cada segundo y acumule `accrued`.

## Estado
- [ ] Dev A confirma/ajusta estas firmas.
- [ ] Dev A entrega `address` + ABI JSON tras WB3 → reemplazar el mock.
