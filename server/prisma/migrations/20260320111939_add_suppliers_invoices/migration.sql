-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "siret" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplier_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" DATETIME,
    "total_amount" DECIMAL,
    "file_name" TEXT,
    "notes" TEXT,
    "imported_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoice_id" TEXT NOT NULL,
    "cultivar_id" TEXT,
    "raw_text" TEXT NOT NULL,
    "description" TEXT,
    "quantity_g" DECIMAL,
    "unit_price" DECIMAL,
    "total_price" DECIMAL,
    "lot_number" TEXT,
    "expiry_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "invoice_lines_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
    "weight_grams" DECIMAL NOT NULL,
    "quantity_in_stock" DECIMAL NOT NULL,
    "lot_number" TEXT,
    "purchase_date" DATETIME,
    "expiry_date" DATETIME,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "seed_inventory_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "seed_inventory_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_seed_inventory" ("created_at", "cultivar_id", "expiry_date", "id", "lot_number", "notes", "purchase_date", "purchase_url", "quantity_in_stock", "supplier", "unit_price_euros", "updated_at", "weight_grams") SELECT "created_at", "cultivar_id", "expiry_date", "id", "lot_number", "notes", "purchase_date", "purchase_url", "quantity_in_stock", "supplier", "unit_price_euros", "updated_at", "weight_grams" FROM "seed_inventory";
DROP TABLE "seed_inventory";
ALTER TABLE "new_seed_inventory" RENAME TO "seed_inventory";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");
