-- Debe devolver cero en todas las filas antes de aplicar 0003_add_inventory_checks.sql.
SELECT 'products.min_stock_negative' AS rule, COUNT(*) AS violations
FROM products WHERE min_stock < 0
UNION ALL
SELECT 'products.sale_price_negative', COUNT(*) FROM products WHERE sale_price < 0
UNION ALL
SELECT 'users.failed_login_attempts_negative', COUNT(*) FROM users WHERE failed_login_attempts < 0
UNION ALL
SELECT 'stock_balances.negative_values', COUNT(*)
FROM stock_balances WHERE quantity < 0 OR avg_cost < 0
UNION ALL
SELECT 'inventory_movements.invalid_amounts', COUNT(*)
FROM inventory_movements WHERE quantity <= 0 OR unit_cost < 0 OR total_cost < 0
UNION ALL
SELECT 'inventory_movements.invalid_type_subtype', COUNT(*)
FROM inventory_movements
WHERE NOT (
  (type = 'ENTRY' AND subtype IN ('PURCHASE', 'SALE_RETURN', 'POSITIVE_ADJUSTMENT', 'VOID')) OR
  (type = 'EXIT' AND subtype IN ('SALE', 'PURCHASE_RETURN', 'NEGATIVE_ADJUSTMENT', 'VOID')) OR
  (type = 'TRANSFER' AND subtype IN ('TRANSFER_IN', 'TRANSFER_OUT'))
)
UNION ALL
SELECT 'inventory_movements.missing_reference', COUNT(*)
FROM inventory_movements
WHERE subtype IN ('SALE_RETURN', 'PURCHASE_RETURN', 'TRANSFER_IN', 'VOID')
  AND reference_movement_id IS NULL
UNION ALL
SELECT 'kardex_entries.negative_values', COUNT(*)
FROM kardex_entries
WHERE in_qty < 0 OR in_unit_cost < 0 OR in_total_cost < 0
   OR out_qty < 0 OR out_unit_cost < 0 OR out_total_cost < 0
   OR balance_qty < 0 OR balance_avg_cost < 0 OR balance_total_value < 0
UNION ALL
SELECT 'kardex_entries.invalid_direction', COUNT(*)
FROM kardex_entries
WHERE NOT ((in_qty > 0 AND out_qty = 0) OR (out_qty > 0 AND in_qty = 0));
