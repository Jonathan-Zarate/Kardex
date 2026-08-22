ALTER TABLE "products" ADD COLUMN "supplier_id" uuid REFERENCES "suppliers"("id");
