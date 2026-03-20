-- Refactor CultureSheet: hub par espèce + sous-chartes spécialisées
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- 1. Ajouter @unique sur species.name
CREATE UNIQUE INDEX "species_name_key" ON "species"("name");

-- 2. Recréer culture_sheets avec speciesId au lieu de cultivarId
DROP TABLE IF EXISTS "task_templates";
DROP TABLE IF EXISTS "culture_sheets";

CREATE TABLE "culture_sheets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "species_id" TEXT NOT NULL,
    "sowing_method" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "culture_sheets_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "culture_sheets_species_id_key" ON "culture_sheets"("species_id");

-- 3. Créer nursery_charts
CREATE TABLE "nursery_charts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "culture_sheet_id" TEXT NOT NULL,
    "container_type" TEXT NOT NULL,
    "seeds_per_cell" INTEGER NOT NULL,
    "technique" TEXT,
    "germination_days" INTEGER NOT NULL,
    "germination_temp_c" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "nursery_charts_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "nursery_charts_culture_sheet_id_key" ON "nursery_charts"("culture_sheet_id");

-- 4. Créer nursery_repot_stages
CREATE TABLE "nursery_repot_stages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nursery_chart_id" TEXT NOT NULL,
    "stage_number" INTEGER NOT NULL,
    "container_type" TEXT NOT NULL,
    "days_after_sowing" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "nursery_repot_stages_nursery_chart_id_fkey" FOREIGN KEY ("nursery_chart_id") REFERENCES "nursery_charts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "nursery_repot_stages_nursery_chart_id_stage_number_key" ON "nursery_repot_stages"("nursery_chart_id", "stage_number");

-- 5. Créer transplant_charts
CREATE TABLE "transplant_charts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "culture_sheet_id" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "row_spacing_cm" DECIMAL NOT NULL,
    "plant_spacing_cm" DECIMAL NOT NULL,
    "nursery_duration_days" INTEGER,
    "days_to_maturity" INTEGER NOT NULL,
    "harvest_window_days" INTEGER NOT NULL,
    "sow_week_start" INTEGER,
    "sow_week_end" INTEGER,
    "safety_margin_pct" INTEGER,
    "plants_per_m2" DECIMAL,
    "plants_per_m2_margin" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "transplant_charts_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "transplant_charts_culture_sheet_id_key" ON "transplant_charts"("culture_sheet_id");

-- 6. Créer direct_sow_charts
CREATE TABLE "direct_sow_charts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "culture_sheet_id" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "row_spacing_cm" DECIMAL NOT NULL,
    "days_to_maturity" INTEGER NOT NULL,
    "harvest_window_days" INTEGER NOT NULL,
    "safety_margin_pct" INTEGER,
    "sow_week_start" INTEGER,
    "sow_week_end" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "direct_sow_charts_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "direct_sow_charts_culture_sheet_id_key" ON "direct_sow_charts"("culture_sheet_id");

-- 7. Créer yield_charts
CREATE TABLE "yield_charts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "culture_sheet_id" TEXT NOT NULL,
    "sale_unit" TEXT NOT NULL,
    "weight_per_unit_g" DECIMAL,
    "price_per_unit" DECIMAL,
    "yield_qty_per_30m" DECIMAL,
    "yield_kg_per_30m" DECIMAL,
    "revenue_per_30m" DECIMAL,
    "harvest_days" INTEGER,
    "revenue_per_day_per_m" DECIMAL,
    "yield_kg_per_day_per_m" DECIMAL,
    "harvests_per_week" DECIMAL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "yield_charts_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "yield_charts_culture_sheet_id_key" ON "yield_charts"("culture_sheet_id");

-- 8. Recréer task_templates avec nouvelle structure
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "culture_sheet_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template_name" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'APRES',
    "days_offset" INTEGER NOT NULL,
    "minutes_per_m2" DECIMAL,
    "description" TEXT,
    "position_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "task_templates_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- 9. Nettoyer les références orphelines dans plantings
UPDATE "plantings" SET "culture_sheet_id" = NULL;

-- 10. Nettoyer les références orphelines dans tasks
UPDATE "tasks" SET "task_template_id" = NULL WHERE "task_template_id" IS NOT NULL;

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
