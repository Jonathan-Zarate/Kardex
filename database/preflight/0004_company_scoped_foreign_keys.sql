-- Debe devolver cero en todas las filas antes de aplicar 0004.
SELECT 'products.category_cross_company' AS rule, COUNT(*) AS violations
FROM products p JOIN categories c ON c.id = p.category_id
WHERE p.company_id <> c.company_id
UNION ALL
SELECT 'products.supplier_cross_company', COUNT(*)
FROM products p JOIN suppliers s ON s.id = p.supplier_id
WHERE p.company_id <> s.company_id
UNION ALL
SELECT 'stock.product_cross_company', COUNT(*)
FROM stock_balances sb JOIN products p ON p.id = sb.product_id
WHERE sb.company_id <> p.company_id
UNION ALL
SELECT 'stock.warehouse_cross_company', COUNT(*)
FROM stock_balances sb JOIN warehouses w ON w.id = sb.warehouse_id
WHERE sb.company_id <> w.company_id
UNION ALL
SELECT 'movements.product_cross_company', COUNT(*)
FROM inventory_movements m JOIN products p ON p.id = m.product_id
WHERE m.company_id <> p.company_id
UNION ALL
SELECT 'movements.warehouse_cross_company', COUNT(*)
FROM inventory_movements m JOIN warehouses w ON w.id = m.warehouse_id
WHERE m.company_id <> w.company_id
UNION ALL
SELECT 'movements.supplier_cross_company', COUNT(*)
FROM inventory_movements m JOIN suppliers s ON s.id = m.supplier_id
WHERE m.company_id <> s.company_id
UNION ALL
SELECT 'movements.approver_cross_company', COUNT(*)
FROM inventory_movements m JOIN users u ON u.id = m.approved_by
WHERE m.company_id <> u.company_id
UNION ALL
SELECT 'movements.creator_cross_company', COUNT(*)
FROM inventory_movements m JOIN users u ON u.id = m.created_by
WHERE m.company_id <> u.company_id
UNION ALL
SELECT 'movements.reference_cross_company', COUNT(*)
FROM inventory_movements m JOIN inventory_movements original ON original.id = m.reference_movement_id
WHERE m.company_id <> original.company_id
UNION ALL
SELECT 'kardex.movement_cross_company', COUNT(*)
FROM kardex_entries k JOIN inventory_movements m ON m.id = k.movement_id
WHERE k.company_id <> m.company_id
UNION ALL
SELECT 'kardex.product_cross_company', COUNT(*)
FROM kardex_entries k JOIN products p ON p.id = k.product_id
WHERE k.company_id <> p.company_id
UNION ALL
SELECT 'kardex.warehouse_cross_company', COUNT(*)
FROM kardex_entries k JOIN warehouses w ON w.id = k.warehouse_id
WHERE k.company_id <> w.company_id
UNION ALL
SELECT 'audit.user_cross_company', COUNT(*)
FROM audit_logs a JOIN users u ON u.id = a.user_id
WHERE a.company_id <> u.company_id;
