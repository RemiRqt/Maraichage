-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_nursery_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planting_id" TEXT,
    "cultivar_id" TEXT NOT NULL,
    "seed_inventory_id" TEXT,
    "seeds_consumed" INTEGER,
    "sowing_date" DATETIME NOT NULL,
    "container_type" TEXT NOT NULL,
    "container_count" INTEGER NOT NULL,
    "cells_per_container" INTEGER NOT NULL,
    "total_seeds_sown" INTEGER NOT NULL,
    "germination_count" INTEGER,
    "germination_rate" DECIMAL,
    "plants_ready" INTEGER,
    "expected_transplant_date" DATETIME,
    "actual_transplant_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'SEME',
    "notes" TEXT,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "nursery_batches_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "nursery_batches_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "nursery_batches_seed_inventory_id_fkey" FOREIGN KEY ("seed_inventory_id") REFERENCES "seed_inventory" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_nursery_batches" ("actual_transplant_date", "cells_per_container", "container_count", "container_type", "created_at", "cultivar_id", "expected_transplant_date", "germination_count", "germination_rate", "id", "notes", "photos", "planting_id", "plants_ready", "sowing_date", "status", "total_seeds_sown", "updated_at") SELECT "actual_transplant_date", "cells_per_container", "container_count", "container_type", "created_at", "cultivar_id", "expected_transplant_date", "germination_count", "germination_rate", "id", "notes", "photos", "planting_id", "plants_ready", "sowing_date", "status", "total_seeds_sown", "updated_at" FROM "nursery_batches";
DROP TABLE "nursery_batches";
ALTER TABLE "new_nursery_batches" RENAME TO "nursery_batches";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
