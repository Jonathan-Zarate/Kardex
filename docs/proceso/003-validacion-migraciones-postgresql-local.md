# Proceso 003: Validación real de migraciones PostgreSQL

- Fecha: 2026-08-23
- Entorno: `kardex_dev` local en PostgreSQL 18

## Secuencia ejecutada

1. Se intentó ejecutar el preflight de `0003`.
2. PostgreSQL rechazó la consulta porque el enum no contenía `VOID`. Esto confirmó
   que `0002_add_voided_status.sql` nunca había sido aplicada por el journal
   anterior.
3. Se aplicó `0002`, que es idempotente.
4. Se repitieron los preflights de `0003` y `0004`.
5. Los 9 controles de inventario y los 14 controles multiempresa devolvieron
   cero violaciones.
6. Se ejecutó el migrador oficial de Drizzle.
7. Se consultó el catálogo de PostgreSQL y se realizó una prueba negativa con
   rollback.

## Evidencia obtenida

- Migraciones registradas por Drizzle: 5.
- Restricciones `CHECK` del proyecto: 12.
- Claves foráneas compuestas por empresa: 14.
- Intento de asignar stock `-1`: rechazado por
  `ck_stock_balances_quantity_nonnegative`.
- Filas negativas después de la prueba: 0.

## Alcance de la evidencia

La sintaxis y el comportamiento se comprobaron en PostgreSQL real, pero todavía
falta repetir el procedimiento en una rama temporal de Neon antes de producción.
