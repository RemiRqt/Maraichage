-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_seed_inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cultivar_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "supplier" TEXT NOT NULL,
    "purchase_url" TEXT,
    "unit_price_euros" DECIMAL NOT NULL,
    "initial_quantity" INTEGER NOT NULL DEFAULT 0,
    "quantity_in_stock" INTEGER NOT NULL DEFAULT 0,
    "lot_number" TEXT,
    "purchase_date" DATETIME,
    "expiry_date" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "seed_inventory_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "seed_inventory_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_seed_inventory" ("id", "cultivar_id", "supplier_id", "supplier", "purchase_url", "unit_price_euros", "initial_quantity", "quantity_in_stock", "lot_number", "purchase_date", "expiry_date", "notes", "created_at", "updated_at")
SELECT "id", "cultivar_id", "supplier_id", "supplier", "purchase_url", "unit_price_euros", CAST(ROUND("weight_grams") AS INTEGER), CAST(ROUND("quantity_in_stock") AS INTEGER), "lot_number", "purchase_date", "expiry_date", "notes", "created_at", "updated_at"
FROM "seed_inventory";

DROP TABLE "seed_inventory";
ALTER TABLE "new_seed_inventory" RENAME TO "seed_inventory";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
