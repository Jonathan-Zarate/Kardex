# Kardex

Sistema web multiempresa para administrar inventario y consultar un Kardex valorizado mediante promedio ponderado movil.

> Estado: linea base en diagnostico. El backend supera la comprobacion de tipos; el frontend aun presenta errores de TypeScript y lint. No se considera listo para produccion.

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
- GitHub Actions como puerta de calidad y despliegue.

La configuracion actual todavia contiene referencias a Cloud Run y debe alinearse mediante una decision de arquitectura antes del despliegue.

## Estado verificable inicial

Revision realizada el 22 de agosto de 2026:

| Comprobacion | Resultado |
|---|---|
| Backend TypeScript (`tsc --noEmit`) | Correcto |
| Frontend TypeScript (`tsc --noEmit`) | Falla |
| Frontend lint (`eslint .`) | Falla |
| Pruebas automatizadas | No existen |
| Historial Git previo | No existe; el repositorio remoto estaba vacio |
| Preparacion para produccion | Pendiente |

El detalle y los comandos reproducibles estan en [`docs/diagnostico-inicial.md`](docs/diagnostico-inicial.md).

## Riesgos prioritarios

1. El frontend no compila con la configuracion actual.
2. La actualizacion de stock no bloquea el saldo ante operaciones concurrentes.
3. Las devoluciones no cumplen completamente las reglas descritas en el PRD.
4. Los permisos dependen del rol incluido en el JWT hasta que este expire.
5. Faltan restricciones de integridad y aislamiento multiempresa en PostgreSQL.
6. El despliegue no alinea `PORT` ni el nombre del secreto JWT.
7. No hay pruebas unitarias, de integracion, seguridad o concurrencia.

## Forma de trabajo

Cada mejora debe seguir este ciclo:

```text
decision documentada -> cambio pequeno -> prueba -> revision -> commit atomico
```

Las decisiones importantes se registraran cuando se tomen. Las evidencias deben provenir de comandos ejecutados sobre este repositorio; no se presentaran ejemplos teoricos como resultados reales.

## Documentacion

- [`kardex-inventario-prd.md`](kardex-inventario-prd.md): requerimientos funcionales originales.
- [`docs/diagnostico-inicial.md`](docs/diagnostico-inicial.md): estado recibido y riesgos encontrados.
- `docs/decisiones/`: ADR creados durante la evolucion del proyecto.
- `docs/proceso/`: checkpoints y registro del trabajo asistido por IA.

## Seguridad local

El archivo `.env` no debe subirse. Usa `.env.example` como referencia y conserva secretos reales únicamente en el entorno local o en el gestor de secretos del proveedor.

