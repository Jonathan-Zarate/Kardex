# Proceso 002: Integridad multiempresa

Fecha: 2026-08-22

## Pedido al agente

Continuar fortaleciendo el esquema PostgreSQL y evitar relaciones entre datos de
empresas diferentes.

## Decisión de Jonathan

Usar Neon como base web y avanzar con restricciones versionadas antes del
despliegue.

## Correcciones realizadas

- Se añadieron claves únicas `(id, company_id)` a las entidades referenciadas.
- Se añadieron claves foráneas compuestas en catálogo, existencias, movimientos,
  Kardex y auditoría.
- Se creó una consulta previa que detecta relaciones cruzadas antes de migrar.

## Validación ejecutada

- Typecheck del paquete de base de datos: aprobado.
- Typecheck del backend: aprobado.
- Suite del backend: 13/13 pruebas aprobadas.

## Validación pendiente declarada

La migración SQL todavía no se ejecutó contra PostgreSQL: Docker no está activo
y la instancia local encontrada no tiene una base desechable ni credenciales
confirmadas. No se usó una base desconocida para evitar modificar datos ajenos.
La migración deberá probarse primero en una rama de Neon o base temporal.
