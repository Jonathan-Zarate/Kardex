ALTER TABLE "products"
  ADD CONSTRAINT "ck_products_min_stock_nonnegative" CHECK ("min_stock" >= 0),
  ADD CONSTRAINT "ck_products_sale_price_nonnegative" CHECK ("sale_price" IS NULL OR "sale_price" >= 0);

ALTER TABLE "users"
  ADD CONSTRAINT "ck_users_failed_attempts_nonnegative" CHECK ("failed_login_attempts" >= 0);

ALTER TABLE "stock_balances"
  ADD CONSTRAINT "ck_stock_balances_quantity_nonnegative" CHECK ("quantity" >= 0),
  ADD CONSTRAINT "ck_stock_balances_avg_cost_nonnegative" CHECK ("avg_cost" >= 0);

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "ck_movements_quantity_positive" CHECK ("quantity" > 0),
  ADD CONSTRAINT "ck_movements_unit_cost_nonnegative" CHECK ("unit_cost" >= 0),
  ADD CONSTRAINT "ck_movements_total_cost_nonnegative" CHECK ("total_cost" >= 0),
  ADD CONSTRAINT "ck_movements_type_subtype" CHECK (
    ("type" = 'ENTRY' AND "subtype" IN ('PURCHASE', 'SALE_RETURN', 'POSITIVE_ADJUSTMENT', 'VOID')) OR
    ("type" = 'EXIT' AND "subtype" IN ('SALE', 'PURCHASE_RETURN', 'NEGATIVE_ADJUSTMENT', 'VOID')) OR
    ("type" = 'TRANSFER' AND "subtype" IN ('TRANSFER_IN', 'TRANSFER_OUT'))
  ),
  ADD CONSTRAINT "ck_movements_required_reference" CHECK (
    "subtype" NOT IN ('SALE_RETURN', 'PURCHASE_RETURN', 'TRANSFER_IN', 'VOID')
    OR "reference_movement_id" IS NOT NULL
  );

ALTER TABLE "kardex_entries"
  ADD CONSTRAINT "ck_kardex_values_nonnegative" CHECK (
    "in_qty" >= 0 AND "in_unit_cost" >= 0 AND "in_total_cost" >= 0 AND
    "out_qty" >= 0 AND "out_unit_cost" >= 0 AND "out_total_cost" >= 0 AND
    "balance_qty" >= 0 AND "balance_avg_cost" >= 0 AND "balance_total_value" >= 0
  ),
  ADD CONSTRAINT "ck_kardex_single_direction" CHECK (
    ("in_qty" > 0 AND "out_qty" = 0) OR
    ("out_qty" > 0 AND "in_qty" = 0)
  );
