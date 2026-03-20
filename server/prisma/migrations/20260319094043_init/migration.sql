-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MARAICHER',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zone_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "length_m" DECIMAL NOT NULL,
    "width_m" DECIMAL NOT NULL,
    "area_m2" DECIMAL NOT NULL,
    "position_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "beds_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cultivars" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "species_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "cultivars_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "culture_sheets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cultivar_id" TEXT NOT NULL,
    "days_to_maturity" INTEGER NOT NULL,
    "density_per_bed" INTEGER NOT NULL,
    "plant_spacing_cm" DECIMAL NOT NULL,
    "row_spacing_cm" DECIMAL NOT NULL,
    "nursery_duration_days" INTEGER,
    "yield_per_m2_kg" DECIMAL NOT NULL,
    "sowing_method" TEXT NOT NULL,
    "harvest_start_date_template" TEXT,
    "harvest_window_days" INTEGER,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "culture_sheets_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "culture_sheet_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "days_offset_from_sowing" INTEGER NOT NULL,
    "estimated_duration_hours" DECIMAL NOT NULL,
    "description" TEXT,
    "position_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "task_templates_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "plantings" (
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
    "quantity_planted" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planting_id" TEXT,
    "bed_id" TEXT,
    "zone_id" TEXT,
    "task_template_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scheduled_date" DATETIME NOT NULL,
    "completed_date" DATETIME,
    "actual_duration_hours" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'A_FAIRE',
    "priority" TEXT NOT NULL DEFAULT 'NORMALE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tasks_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "tasks_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "task_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "harvests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planting_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "quantity_kg" DECIMAL NOT NULL,
    "quality_rating" INTEGER,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "harvests_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "nursery_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planting_id" TEXT NOT NULL,
    "cultivar_id" TEXT NOT NULL,
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
    CONSTRAINT "nursery_batches_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "nursery_batches_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "seed_inventory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cultivar_id" TEXT NOT NULL,
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
    CONSTRAINT "seed_inventory_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "weather_data" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "temperature_max" DECIMAL NOT NULL,
    "temperature_min" DECIMAL NOT NULL,
    "temperature_avg" DECIMAL NOT NULL,
    "precipitation_mm" DECIMAL NOT NULL,
    "wind_speed_max_kmh" DECIMAL NOT NULL,
    "humidity_avg" DECIMAL NOT NULL,
    "sunshine_hours" DECIMAL NOT NULL,
    "frost" BOOLEAN NOT NULL DEFAULT false,
    "raw_data" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "content" TEXT NOT NULL,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "planting_id" TEXT,
    "bed_id" TEXT,
    "zone_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "journal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "journal_entries_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "journal_entries_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "journal_entries_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "file_path" TEXT NOT NULL,
    "thumbnail_path" TEXT,
    "caption" TEXT,
    "taken_at" DATETIME NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "weather_data_date_key" ON "weather_data"("date");

-- CreateIndex
CREATE INDEX "photos_entity_type_entity_id_idx" ON "photos"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");
