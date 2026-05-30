# Handoff — Dev B / Rebrand KNTX + próximos pasos UX

Rama: **`dev-b/kntx-rebrand`**. Autor: Robertino (Dev B). Para: Martin (Dev A) o yo mismo al reiniciar sesión.

## Contexto
El producto se renombró **GhostRig → KNTX** (marca/UI). El **contrato on-chain sigue llamándose
`GhostRig`** y NO se re-deploya (`0x2F9e911f380e03557Ec65F941Dba32c879172b9a`). Por eso `web/src/lib/*`
y `web/abi/GhostRig.json` conservan el nombre del contrato a propósito — no tocar eso como "marca".

Reparto vigente: **Dev A (Martin)** = contrato + host-agent + **wiring del front al contrato real**.
**Dev B (yo)** = **UX/UI** (marca + vista cliente pulida + vista host nueva). Ver `PLAN.md` → WB5b.

## ✅ Hecho en esta rama (rebrand KNTX)
- **Logo:** `web/src/components/KntxMark.tsx` — rombo con hueco, SVG inline, usa `currentColor`.
- **Color de marca:** `#6b52f9` → `--accent` en `web/src/app/globals.css` (hover `#8270fb`).
- **Nav:** logo KNTX + wordmark "KNTX" (antes ícono Ghost + "GhostRig") en `web/src/app/page.tsx`.
- **Copys de marca:** "GhostRig" → "KNTX" en banners y aria-labels de la UI.
- **Favicon/icon:** `web/src/app/icon.png` (Next lo auto-detecta) + `web/public/favicon-kntx.png` +
  `web/public/logo-kntx.png`. Se borró el `favicon.ico` default de Next.
- **Metadata:** título "KNTX — Rent FPS on Monad" en `web/src/app/layout.tsx`.
- **Verde:** `npx tsc --noEmit` y `npx eslint` sin errores. Sigue en MOCK MODE.

## ⏭️ Próximo paso (lo más importante que falta): VISTA HOST
La app hoy solo tiene la **vista cliente** (`web/src/app/page.tsx`). Falta la superficie del dueño de
la PC. Plan sugerido:

1. **Routing cliente/host.** Crear `web/src/app/host/page.tsx` y un switch en la nav (link "Soy host").
   Mantener la home como vista cliente.
2. **Vista host (en MOCK primero, igual que el cliente):**
   - **Registrar rig** → `registerRig(pricePerFps)`. Form con precio por FPS (en MON/fps).
   - **Editar precio / pausar** → `setPrice(rigId, price)` y `setActive(rigId, bool)`.
   - **Sesión activa:** mostrar FPS reportados en vivo + deuda acumulada (escuchar `FpsReported`).
   - **Retirar ganancias** → leer `pendingWithdrawals(addr)` y botón `withdraw()`.
   - Reusar componentes/estilos de la vista cliente (Badge, Stat, panel de liquidación).
3. **Coordinar con Martin** la forma del estado del host (hook tipo `useHostSession`/lecturas wagmi)
   para no pisar su wiring. El ABI ya está alineado en `web/src/lib/ghostrig.ts`
   (`sessions()`, `rigs()`, `pendingWithdrawals`, `withdraw`, `setPrice`, `setActive`).
4. **Pulido cliente** (si sobra tiempo): estados loading/error reales cuando el wiring esté, y revisar
   contraste del nuevo `#6b52f9` sobre superficies oscuras.

## Cómo correr
```
cd web && npm run dev   # http://localhost:3000  (MOCK MODE, no necesita host prendido)
```
