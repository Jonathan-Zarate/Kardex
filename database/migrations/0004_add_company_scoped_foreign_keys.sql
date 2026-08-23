CREATE UNIQUE INDEX "uq_categories_id_company" ON "categories" ("id", "company_id");
CREATE UNIQUE INDEX "uq_suppliers_id_company" ON "suppliers" ("id", "company_id");
CREATE UNIQUE INDEX "uq_warehouses_id_company" ON "warehouses" ("id", "company_id");
CREATE UNIQUE INDEX "uq_users_id_company" ON "users" ("id", "company_id");
CREATE UNIQUE INDEX "uq_products_id_company" ON "products" ("id", "company_id");
CREATE UNIQUE INDEX "uq_movements_id_company" ON "inventory_movements" ("id", "company_id");

ALTER TABLE "products"
  ADD CONSTRAINT "fk_products_category_company"
    FOREIGN KEY ("category_id", "company_id") REFERENCES "categories" ("id", "company_id"),
  ADD CONSTRAINT "fk_products_supplier_company"
    FOREIGN KEY ("supplier_id", "company_id") REFERENCES "suppliers" ("id", "company_id");

ALTER TABLE "stock_balances"
  ADD CONSTRAINT "fk_stock_product_company"
    FOREIGN KEY ("product_id", "company_id") REFERENCES "products" ("id", "company_id"),
  ADD CONSTRAINT "fk_stock_warehouse_company"
    FOREIGN KEY ("warehouse_id", "company_id") REFERENCES "warehouses" ("id", "company_id");

ALTER TABLE "inventory_movements"
  ADD CONSTRAINT "fk_movements_product_company"
    FOREIGN KEY ("product_id", "company_id") REFERENCES "products" ("id", "company_id"),
  ADD CONSTRAINT "fk_movements_warehouse_company"
    FOREIGN KEY ("warehouse_id", "company_id") REFERENCES "warehouses" ("id", "company_id"),
  ADD CONSTRAINT "fk_movements_supplier_company"
    FOREIGN KEY ("supplier_id", "company_id") REFERENCES "suppliers" ("id", "company_id"),
  ADD CONSTRAINT "fk_movements_approved_by_company"
    FOREIGN KEY ("approved_by", "company_id") REFERENCES "users" ("id", "company_id"),
  ADD CONSTRAINT "fk_movements_created_by_company"
    FOREIGN KEY ("created_by", "company_id") REFERENCES "users" ("id", "company_id"),
  ADD CONSTRAINT "fk_movements_reference_company"
    FOREIGN KEY ("reference_movement_id", "company_id") REFERENCES "inventory_movements" ("id", "company_id");

ALTER TABLE "kardex_entries"
  ADD CONSTRAINT "fk_kardex_movement_company"
    FOREIGN KEY ("movement_id", "company_id") REFERENCES "inventory_movements" ("id", "company_id"),
  ADD CONSTRAINT "fk_kardex_product_company"
    FOREIGN KEY ("product_id", "company_id") REFERENCES "products" ("id", "company_id"),
  ADD CONSTRAINT "fk_kardex_warehouse_company"
    FOREIGN KEY ("warehouse_id", "company_id") REFERENCES "warehouses" ("id", "company_id");

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "fk_audit_user_company"
    FOREIGN KEY ("user_id", "company_id") REFERENCES "users" ("id", "company_id");
