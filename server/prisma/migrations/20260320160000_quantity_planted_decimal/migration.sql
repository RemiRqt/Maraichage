-- quantityPlanted: Int → Decimal pour supporter les portions partielles (ex: 2.5m²)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_plantings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "season_id" TEXT NOT NULL,
    "bed_id" TEXT NOT NULL,
    "cultivar_id" TEXT NOT NULL,
    "culture_sheet_id" TEXT,
    "sowing_date" DATETIME NOT NULL,
    "transplant_date" DATETIME,
    "expected_harvest_date" DATETIME,
    "actual_first_harvest_date" DATETIME,
    "actual_last_harvest_date" DATETIME,
    "quantity_planted" DECIMAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PLANIFIE',
    "succession_order" INTEGER NOT NULL DEFAULT 1,
    "expected_yield_kg" DECIMAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "plantings_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "plantings_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "plantings_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "plantings_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_plantings" SELECT * FROM "plantings";
DROP TABLE "plantings";
ALTER TABLE "new_plantings" RENAME TO "plantings";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
