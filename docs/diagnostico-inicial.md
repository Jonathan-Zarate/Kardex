# Diagnostico inicial de Kardex

**Fecha:** 22 de agosto de 2026  
**Responsable de decisiones:** Jonathan Zarate  
**Apoyo de analisis:** Codex

## Proposito

Registrar el estado real recibido antes de modificar el proyecto. Este documento es una linea base, no una afirmacion de que el sistema esta listo para produccion.

## Contexto recibido

- El codigo estaba en `E:\Kardex` sin carpeta `.git`.
- El repositorio `Jonathan-Zarate/Kardex` existia en GitHub, pero estaba vacio.
- Se eligieron Neon para PostgreSQL y Vercel para frontend y backend.
- Las credenciales de demostracion no estaban confirmadas por el propietario.
- Existia un archivo `.env`; sus valores no fueron impresos ni documentados.

## Validaciones ejecutadas

### Backend

```powershell
cd E:\Kardex\backend
.\node_modules\.bin\tsc.CMD --noEmit -p tsconfig.json
```

Resultado: correcto, codigo de salida 0.

### Frontend TypeScript

```powershell
cd E:\Kardex\frontend
.\node_modules\.bin\tsc.CMD --noEmit -p tsconfig.app.json
```

Resultado: falla. Se encontraron contratos incompatibles en funciones entregadas como `queryFn`, tipos de Recharts y sintaxis incompatible con `erasableSyntaxOnly`.

### Frontend lint

```powershell
pnpm --filter frontend lint
```

Resultado: falla con dos errores, uno en `SettingsPage.tsx` y otro en `router.tsx`.

### Pruebas

Se buscaron archivos `*.test.*` y `*.spec.*`. No se encontraron suites automatizadas ni scripts `test` en los paquetes.

## Hallazgos criticos

### Concurrencia de stock

El motor lee `stock_balances`, calcula en memoria y luego actualiza sin bloquear la fila. Dos operaciones simultaneas pueden decidir usando el mismo saldo. Una transaccion sin `SELECT ... FOR UPDATE` o una actualizacion atomica condicionada no elimina esta carrera.

### Devoluciones

El PRD exige que la devolucion de venta use el costo promedio vigente y que la devolucion de compra use el costo de la compra original. La interfaz no exige seleccionar el movimiento original y el pipeline general no implementa esas dos reglas de forma separada.

### Autorizacion

El rol se firma dentro del access token y `requireRole` confia en ese valor. Un cambio de rol o desactivacion puede tardar hasta la expiracion del token en aplicarse a rutas protegidas.

### Integridad multiempresa

Las tablas contienen `company_id`, pero las claves foraneas simples no garantizan que producto, almacen, proveedor, usuario y movimiento pertenezcan a la misma empresa.

### Despliegue

- El servidor escucha el puerto 3000 y no consume `PORT`.
- El codigo usa `JWT_ACCESS_SECRET`.
- Docker Compose y los workflows proporcionan `JWT_SECRET`.
- Los workflows existentes apuntan a Google Cloud aunque la infraestructura objetivo ahora es Vercel y Neon.

## Decision inicial

No agregar funcionalidades hasta que el proyecto:

1. tenga trazabilidad Git;
2. compile y pase lint;
3. posea una puerta de calidad reproducible;
4. tenga pruebas para el dominio antes de cambiar el algoritmo de inventario.

## Interaccion con el agente

**Pedido de Jonathan:** analizar Kardex con el criterio aplicado en Qbox e incorporar la retroalimentacion recibida sobre trazabilidad, alcance, evidencia real e infraestructura.

**Propuesta de Codex:** priorizar compilacion, concurrencia, reglas de devolucion, seguridad y despliegue antes de nuevas pantallas.

**Decision de Jonathan pendiente:** aprobar el orden incremental despues de registrar esta linea base.

