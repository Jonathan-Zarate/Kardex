# Kardex

Sistema web multiempresa para administrar inventario y consultar un Kardex valorizado mediante promedio ponderado movil.

> Estado: modernizacion activa. Frontend y backend compilan, la suite automatizada pasa y las decisiones de arquitectura se encuentran versionadas. Falta conectar y validar una rama de Neon antes del primer despliegue.

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

## Estado verificable

Revision realizada el 22 de agosto de 2026:

| Comprobacion | Resultado |
|---|---|
| TypeScript del monorepo (`pnpm typecheck`) | Correcto |
| Lint (`pnpm lint`) | Correcto |
| Builds (`pnpm build`) | Correcto |
| Pruebas (`pnpm test`) | 17 aprobadas |
| Historial Git | Commits atomicos publicados en `main` |
| Migraciones en Neon | Pendientes de una rama y credenciales confirmadas |

El detalle y los comandos reproducibles estan en [`docs/diagnostico-inicial.md`](docs/diagnostico-inicial.md).

## Riesgos prioritarios

1. Ejecutar migraciones y pruebas de integración contra una rama temporal de Neon.
2. Añadir pruebas HTTP, de roles y de concurrencia contra PostgreSQL real.
3. Configurar y verificar los dos proyectos Vercel.
4. Reducir el bundle inicial del frontend mediante carga diferida.
5. Completar la cobertura de flujos críticos y la prueba de estrés.

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
- `docs/decisiones/`: ADR creados durante la evolucion del proyecto.
- `docs/proceso/`: checkpoints y registro del trabajo asistido por IA.

## Seguridad local

El archivo `.env` no debe subirse. Usa `.env.example` como referencia y conserva secretos reales únicamente en el entorno local o en el gestor de secretos del proveedor.
