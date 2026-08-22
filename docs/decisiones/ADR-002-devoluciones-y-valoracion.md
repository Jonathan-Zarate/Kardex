# ADR-002: Referencia y valoración de devoluciones

- Estado: aceptada
- Fecha: 2026-08-22
- Decisor de negocio: Jonathan Zarate

## Contexto

El modelo ya distingue devoluciones de venta (`SALE_RETURN`) y de compra
(`PURCHASE_RETURN`), pero la API no exige el movimiento original ni controla la
cantidad acumulada devuelta. Sin esas reglas, una devolución podría superar la
operación original y alterar el stock o su valoración sin trazabilidad.

## Decisión

1. Toda devolución debe indicar `referenceMovementId`.
2. Una devolución de venta solo puede referenciar una salida `SALE` aprobada.
3. Una devolución de compra solo puede referenciar una entrada `PURCHASE`
   aprobada.
4. Se permiten devoluciones parciales y múltiples. La suma de devoluciones
   aprobadas vinculadas no puede superar la cantidad del movimiento original.
5. La referencia debe pertenecer a la misma empresa, producto y almacén.
6. La devolución de venta ingresa al costo promedio vigente del almacén.
7. La devolución de compra sale al costo unitario registrado en la compra
   original.
8. La validación, el cálculo y la actualización de existencias se ejecutan en
   una transacción. Las filas involucradas deben bloquearse para impedir que dos
   solicitudes concurrentes consuman el mismo saldo disponible.

## Consecuencias

- La API rechazará devoluciones sin referencia o con referencias incompatibles.
- El frontend deberá solicitar el movimiento original al registrar una
  devolución.
- La base conservará la relación mediante `reference_movement_id`.
- Las pruebas deben cubrir devoluciones parciales, exceso acumulado, referencia
  cruzada y solicitudes concurrentes.

## Alternativas descartadas

- Aceptar una referencia textual: no permite garantizar integridad ni calcular
  devoluciones acumuladas.
- Valorar toda devolución al promedio vigente: pierde el costo histórico en una
  devolución de compra.
- Permitir cantidades sin límite acumulado: puede devolver más unidades de las
  que existieron en la operación original.
