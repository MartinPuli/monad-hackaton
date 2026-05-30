# GhostRig — Interfaz del contrato (para Dev B)

Este es el contrato entre Dev A (on-chain) y Dev B (frontend/stream). Programá contra
esta interfaz; la ABI completa está en [`web/abi/GhostRig.json`](../web/abi/GhostRig.json).

## Deployment (Monad testnet, chain 10143)

| Campo | Valor |
|-------|-------|
| **Dirección** | `0x2F9e911f380e03557Ec65F941Dba32c879172b9a` |
| Red | Monad testnet (chainId **10143**) |
| RPC | `https://testnet-rpc.monad.xyz` |
| Moneda | MON nativo |
| Verificado | [MonadVision](https://testnet.monadvision.com/address/0x2F9e911f380e03557Ec65F941Dba32c879172b9a) · [Monadscan](https://testnet.monadscan.com/address/0x2F9e911f380e03557Ec65F941Dba32c879172b9a) |

## Constantes

- `TRIAL_SECONDS() → 10` — segundos gratis antes de cobrar.

## Funciones

### Host (la PC que presta)
```solidity
registerRig(uint256 pricePerFps) returns (uint256 rigId)   // fija precio, devuelve el id del rig
setPrice(uint256 rigId, uint256 pricePerFps)               // cambia precio (solo host)
setActive(uint256 rigId, bool active)                      // pausa/activa el rig (solo host)
reportFps(uint256 sessionId, uint256 fps) returns (bool exhausted)  // cada seg; acumula deuda
```
- `reportFps` solo lo puede llamar el host del rig. Durante los primeros 10 s no cobra (trial).
  Devuelve `true` cuando el depósito se agotó → hay que cerrar la sesión.

### Cliente (el que juega)
```solidity
openSession(uint256 rigId) payable returns (uint256 sessionId)  // deposita MON, abre sesión
closeSession(uint256 sessionId)                                 // cierra: paga host + reembolsa
```
- El precio NO se pasa: se lee del rig on-chain (el cliente no puede manipularlo).
- `closeSession` la puede llamar el cliente **o** el host.

### Vistas
```solidity
rigs(uint256) returns (address host, uint256 pricePerFps, bool active)
sessions(uint256) returns (address client, uint256 rigId, uint256 deposit, uint256 accrued, uint256 startTime, bool open)
rigCount() returns (uint256)
sessionCount() returns (uint256)
isBillable(uint256 sessionId) returns (bool)   // true una vez pasado el trial
```

## Eventos (para escuchar en vivo en el frontend)

```solidity
event RigRegistered(uint256 indexed rigId, address indexed host, uint256 pricePerFps);
event RigPriceUpdated(uint256 indexed rigId, uint256 pricePerFps);
event RigActiveSet(uint256 indexed rigId, bool active);
event SessionOpened(uint256 indexed sessionId, uint256 indexed rigId, address indexed client, uint256 deposit);
event FpsReported(uint256 indexed sessionId, uint256 fps, uint256 accrued);  // ← el contador en vivo de la demo
event SessionClosed(uint256 indexed sessionId, uint256 paidToHost, uint256 refundedToClient);
```

**Para la demo (deuda en vivo):** escuchá `FpsReported` → `fps` es el FPS de ese segundo,
`accrued` es la deuda acumulada total (en wei). El saldo restante del cliente =
`deposit - accrued`.

## Flujo de referencia

```
HOST:    registerRig(pricePerFps)  → rigId
CLIENTE: openSession(rigId) { value: deposito }  → sessionId   // arranca el trial de 10s
HOST:    reportFps(sessionId, fps)  cada segundo  (desde el seg 11 acumula)
CLIENTE/HOST: closeSession(sessionId)  → host cobra accrued, cliente recibe deposit - accrued
```

## Errores (custom errors, para manejar en el front)

`NotRigHost`, `NotParticipant`, `RigInactive`, `SessionNotOpen`, `ZeroDeposit`, `ZeroPrice`, `Reentrancy`, `TransferFailed`.

## Unidades

- `pricePerFps` está en **wei por (FPS × segundo)**. Ej: para ~0.001 MON/s a 60 fps →
  `pricePerFps = 0.001e18 / 60 ≈ 16666666666666` wei. Ajustar según la demo.
- Todos los montos en wei (1 MON = 1e18 wei).
