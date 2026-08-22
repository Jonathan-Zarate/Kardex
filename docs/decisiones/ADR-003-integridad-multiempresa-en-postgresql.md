# ADR-003: Integridad de inventario y aislamiento multiempresa en PostgreSQL

- Estado: aceptada para implementación
- Fecha: 2026-08-22
- Contexto técnico: Neon PostgreSQL con migraciones Drizzle versionadas

## Contexto

La API valida varios datos, pero las tablas permiten que otro cliente SQL, una
importación o un defecto futuro inserte cantidades negativas, combine tipos y
subtipos incompatibles o relacione entidades pertenecientes a empresas
distintas. En un Kardex, esos errores dañan tanto la existencia como la
valoración histórica.

## Decisión

La base será la última línea de defensa mediante:

1. `CHECK` para cantidades, costos, precios, mínimos e intentos fallidos.
2. `CHECK` para combinaciones válidas de tipo y subtipo de movimiento.
3. `CHECK` para exigir movimiento original en devoluciones, transferencias de
   entrada y contraasientos.
4. `CHECK` para que cada asiento Kardex represente exclusivamente una entrada o
   una salida y conserve saldos no negativos.
5. Claves únicas `(id, company_id)` y claves foráneas compuestas para impedir
   referencias entre empresas en productos, almacenes, proveedores,
   movimientos, usuarios, existencias, Kardex y auditoría.
6. Mantener las claves foráneas simples existentes durante esta etapa para que
   la migración sea incremental y reversible.

## Alcance excluido

- No se restringen monedas, zonas horarias ni formatos configurables sin una
  definición de negocio cerrada.
- No se aplicará la migración a Neon hasta contar con `DATABASE_URL`, respaldo y
  una consulta previa que detecte filas incompatibles.

## Verificación requerida

- El esquema TypeScript debe compilar.
- La migración debe poder ejecutarse en una base PostgreSQL limpia.
- Antes de producción se ejecutarán consultas de prevalidación y luego pruebas
  que intenten insertar datos inválidos directamente en la base.
