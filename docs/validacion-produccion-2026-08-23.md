# Validacion de produccion — 2026-08-23

## Entorno verificado

- Frontend: `https://kardex-frontend-snowy.vercel.app`
- Backend: `https://kardex-backend-blush.vercel.app`
- PostgreSQL: Neon, proyecto `Kardex`, rama `staging`
- Commit correctivo final de concurrencia: `600ba69`

Las credenciales y cadenas de conexion no se incluyen en este documento.

## Base de datos real

Las cinco migraciones versionadas se ejecutaron en orden desde el editor SQL de Neon.

| Evidencia | Resultado |
|---|---:|
| Tablas del esquema `public` | 12 |
| Restricciones `CHECK` | 12 |
| Claves foraneas | 39 |
| Empresas demo | 1 |
| Usuarios demo | 3 |
| Almacenes demo | 1 |
| Categorias demo | 4 |
| Proveedores demo | 1 |

## Smoke tests

| Caso | Resultado |
|---|---|
| `GET /health/live` | `200`, proceso disponible |
| `GET /health/ready` | `200`, base disponible |
| Login de administrador | `200` |
| `GET /auth/me` con token | `200`, rol `ADMIN` |
| Login desde el frontend desplegado | Dashboard cargado |

## Matriz funcional por rol

Se ejecutaron 18 comprobaciones contra la API desplegada.

- Los tres roles pueden consultar categorias.
- `ADMIN` y `SUPERVISOR` pueden crear categorias.
- `WAREHOUSE` recibe `403` al intentar crear categorias.
- `ADMIN` puede crear productos.
- `WAREHOUSE` puede registrar entradas y salidas.
- Una salida mayor que el stock disponible recibe `422`.
- Tras una entrada de 10 y una salida de 3, el saldo observado fue `7.0000`.
- `SUPERVISOR` recibe `403` al intentar desactivar un producto.
- Solo `ADMIN` puede listar usuarios; los otros roles reciben `403`.
- `limit=1` en movimientos devuelve exactamente un registro.
- Los productos y categorias creados para la prueba fueron desactivados al finalizar.

## Concurrencia

### Stock

Sobre un producto con 100 unidades se enviaron 20 salidas simultaneas de 6 unidades.

- 16 solicitudes respondieron `201`.
- 4 solicitudes respondieron `422`.
- Saldo final: `4.0000`.
- No se genero stock negativo.

### Codigo de producto duplicado

La primera ejecucion de ocho altas simultaneas encontro un defecto real:

- 1 respuesta `201`.
- 4 respuestas `409`.
- 3 respuestas `500` por colision entre la consulta previa y el `INSERT`.

Se incorporo `isUniqueViolation`, que traduce el codigo PostgreSQL `23505` a una respuesta de dominio `409`, y se agregaron tres pruebas unitarias. Tras desplegar el commit `600ba69`, la misma carrera produjo:

- 1 respuesta `201`.
- 7 respuestas `409`.
- 0 respuestas `500`.

## Calidad local previa al despliegue

- `pnpm test`: 20 pruebas aprobadas.
- `pnpm typecheck`: correcto en frontend, backend y database.
- `pnpm --filter backend build`: correcto, incluyendo la compilacion previa de `@kardex/database`.
- Importacion del JavaScript compilado: `runtime-import-ok`.
