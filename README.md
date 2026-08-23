# Kardex

Sistema web multiempresa para administrar inventario y consultar un Kardex valorizado mediante promedio ponderado movil.

> Estado: desplegado y validado. Frontend y backend operan en Vercel contra una rama de Neon, la suite automatizada pasa y las decisiones de arquitectura se encuentran versionadas.

## Alcance existente

- Autenticacion con access token y refresh token.
- Roles `ADMIN`, `SUPERVISOR` y `WAREHOUSE`.
- Empresas, usuarios, almacenes, productos, categorias y proveedores.
- Entradas, salidas, ajustes con aprobacion, transferencias y contraasientos.
- Stock por producto y almacen.
- Kardex valorizado con promedio ponderado movil.
- Dashboard, auditoria y reportes PDF/Excel.

## Arquitectura

El proyecto es un monorepo administrado con pnpm:

```text
frontend/   React, TypeScript, Vite y TanStack Query
backend/    Hono, TypeScript y API REST
database/   PostgreSQL, Drizzle ORM, migraciones y seeds
```

Infraestructura objetivo:

- PostgreSQL administrado en Neon.
- Frontend y backend desplegados por separado en Vercel.
- GitHub Actions como puerta de calidad.
- Integracion Git de Vercel para desplegar ambos proyectos.

Entornos desplegados:

- Frontend: <https://kardex-frontend-snowy.vercel.app>
- Backend: <https://kardex-backend-blush.vercel.app>
- Neon: proyecto `Kardex`, rama `staging`

## Estado verificable

Revision realizada el 23 de agosto de 2026:

| Comprobacion | Resultado |
|---|---|
| TypeScript del monorepo (`pnpm typecheck`) | Correcto |
| Lint (`pnpm lint`) | Correcto |
| Builds (`pnpm build`) | Correcto |
| Pruebas (`pnpm test`) | 20 aprobadas |
| Historial Git | Commits atomicos publicados en `main` |
| Migraciones en Neon | 5 aplicadas; 12 tablas, 12 `CHECK` y 39 FK |
| Smoke test backend | Proceso y base de datos disponibles |
| Validacion por roles | 18 comprobaciones correctas |
| Concurrencia de stock | 16 exitos, 4 rechazos y saldo final no negativo |
| Codigo duplicado concurrente | 1 alta, 7 conflictos y 0 errores internos |

El detalle inicial esta en [`docs/diagnostico-inicial.md`](docs/diagnostico-inicial.md) y la evidencia de produccion en [`docs/validacion-produccion-2026-08-23.md`](docs/validacion-produccion-2026-08-23.md).

## Riesgos prioritarios

1. Convertir la validacion HTTP ejecutada en una suite automatizada reproducible sin secretos.
2. Promover el esquema validado de Neon `staging` a una rama de produccion.
3. Reducir el bundle inicial del frontend mediante carga diferida.
4. Ampliar las colisiones `23505 -> 409` a los demas catalogos con claves unicas.
5. Completar pruebas de transferencias, devoluciones y ajustes concurrentes.

## Forma de trabajo

Cada mejora debe seguir este ciclo:

```text
decision documentada -> cambio pequeno -> prueba -> revision -> commit atomico
```

Las decisiones importantes se registraran cuando se tomen. Las evidencias deben provenir de comandos ejecutados sobre este repositorio; no se presentaran ejemplos teoricos como resultados reales.

## Documentacion

- [`kardex-inventario-prd.md`](kardex-inventario-prd.md): requerimientos funcionales originales.
- [`docs/diagnostico-inicial.md`](docs/diagnostico-inicial.md): estado recibido y riesgos encontrados.
- [`docs/despliegue-neon-vercel.md`](docs/despliegue-neon-vercel.md): configuración y validación del despliegue objetivo.
- [`docs/validacion-produccion-2026-08-23.md`](docs/validacion-produccion-2026-08-23.md): matriz por rol, smoke tests y evidencia de concurrencia.
- `docs/decisiones/`: ADR creados durante la evolucion del proyecto.
- `docs/proceso/`: checkpoints y registro del trabajo asistido por IA.

## Seguridad local

El archivo `.env` no debe subirse. Usa `.env.example` como referencia y conserva secretos reales únicamente en el entorno local o en el gestor de secretos del proveedor.
