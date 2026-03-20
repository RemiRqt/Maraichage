-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MARAICHER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "length_m" DECIMAL(65,30) NOT NULL,
    "width_m" DECIMAL(65,30) NOT NULL,
    "area_m2" DECIMAL(65,30) NOT NULL,
    "position_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "species" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "species_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cultivars" (
    "id" TEXT NOT NULL,
    "species_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cultivars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "culture_sheets" (
    "id" TEXT NOT NULL,
    "species_id" TEXT NOT NULL,
    "sowing_method" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "culture_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursery_charts" (
    "id" TEXT NOT NULL,
    "culture_sheet_id" TEXT NOT NULL,
    "container_type" TEXT NOT NULL,
    "seeds_per_cell" INTEGER NOT NULL,
    "technique" TEXT,
    "germination_days" INTEGER NOT NULL,
    "germination_temp_c" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nursery_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursery_repot_stages" (
    "id" TEXT NOT NULL,
    "nursery_chart_id" TEXT NOT NULL,
    "stage_number" INTEGER NOT NULL,
    "container_type" TEXT NOT NULL,
    "days_after_sowing" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nursery_repot_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transplant_charts" (
    "id" TEXT NOT NULL,
    "culture_sheet_id" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "row_spacing_cm" DECIMAL(65,30) NOT NULL,
    "plant_spacing_cm" DECIMAL(65,30) NOT NULL,
    "nursery_duration_days" INTEGER,
    "days_to_maturity" INTEGER NOT NULL,
    "harvest_window_days" INTEGER NOT NULL,
    "sow_week_start" INTEGER,
    "sow_week_end" INTEGER,
    "safety_margin_pct" INTEGER,
    "plants_per_m2" DECIMAL(65,30),
    "plants_per_m2_margin" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transplant_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_sow_charts" (
    "id" TEXT NOT NULL,
    "culture_sheet_id" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL,
    "row_spacing_cm" DECIMAL(65,30) NOT NULL,
    "days_to_maturity" INTEGER NOT NULL,
    "harvest_window_days" INTEGER NOT NULL,
    "safety_margin_pct" INTEGER,
    "sow_week_start" INTEGER,
    "sow_week_end" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "direct_sow_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yield_charts" (
    "id" TEXT NOT NULL,
    "culture_sheet_id" TEXT NOT NULL,
    "sale_unit" TEXT NOT NULL,
    "weight_per_unit_g" DECIMAL(65,30),
    "price_per_unit" DECIMAL(65,30),
    "yield_qty_per_30m" DECIMAL(65,30),
    "yield_kg_per_30m" DECIMAL(65,30),
    "revenue_per_30m" DECIMAL(65,30),
    "harvest_days" INTEGER,
    "revenue_per_day_per_m" DECIMAL(65,30),
    "yield_kg_per_day_per_m" DECIMAL(65,30),
    "harvests_per_week" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yield_charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_templates" (
    "id" TEXT NOT NULL,
    "culture_sheet_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template_name" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'APRES',
    "days_offset" INTEGER NOT NULL,
    "minutes_per_m2" DECIMAL(65,30),
    "description" TEXT,
    "position_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantings" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "bed_id" TEXT NOT NULL,
    "cultivar_id" TEXT NOT NULL,
    "culture_sheet_id" TEXT,
    "sowing_date" TIMESTAMP(3) NOT NULL,
    "transplant_date" TIMESTAMP(3),
    "expected_harvest_date" TIMESTAMP(3),
    "actual_first_harvest_date" TIMESTAMP(3),
    "actual_last_harvest_date" TIMESTAMP(3),
    "quantity_planted" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PLANIFIE',
    "succession_order" INTEGER NOT NULL DEFAULT 1,
    "expected_yield_kg" DECIMAL(65,30),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "planting_id" TEXT,
    "bed_id" TEXT,
    "zone_id" TEXT,
    "task_template_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "completed_date" TIMESTAMP(3),
    "actual_duration_hours" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'A_FAIRE',
    "priority" TEXT NOT NULL DEFAULT 'NORMALE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "harvests" (
    "id" TEXT NOT NULL,
    "planting_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity_kg" DECIMAL(65,30) NOT NULL,
    "quality_rating" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "harvests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nursery_batches" (
    "id" TEXT NOT NULL,
    "planting_id" TEXT,
    "cultivar_id" TEXT NOT NULL,
    "seed_inventory_id" TEXT,
    "seeds_consumed" INTEGER,
    "sowing_date" TIMESTAMP(3) NOT NULL,
    "container_type" TEXT NOT NULL,
    "container_count" INTEGER NOT NULL,
    "cells_per_container" INTEGER NOT NULL,
    "total_seeds_sown" INTEGER NOT NULL,
    "germination_count" INTEGER,
    "germination_rate" DECIMAL(65,30),
    "plants_ready" INTEGER,
    "expected_transplant_date" TIMESTAMP(3),
    "actual_transplant_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SEME',
    "notes" TEXT,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nursery_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siret" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "total_amount" DECIMAL(65,30),
    "file_name" TEXT,
    "notes" TEXT,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "cultivar_id" TEXT,
    "raw_text" TEXT NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "packaging" TEXT,
    "unit_type" TEXT,
    "unit_qty" DECIMAL(65,30),
    "quantity_g" DECIMAL(65,30),
    "qty_ordered" INTEGER,
    "unit_price" DECIMAL(65,30),
    "total_price" DECIMAL(65,30),
    "tva_rate" DECIMAL(65,30),
    "lot_number" TEXT,
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seed_inventory" (
    "id" TEXT NOT NULL,
    "cultivar_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "supplier" TEXT NOT NULL,
    "purchase_url" TEXT,
    "unit_price_euros" DECIMAL(65,30) NOT NULL,
    "initial_quantity" INTEGER NOT NULL DEFAULT 0,
    "quantity_in_stock" INTEGER NOT NULL DEFAULT 0,
    "lot_number" TEXT,
    "purchase_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seed_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_data" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "temperature_max" DECIMAL(65,30) NOT NULL,
    "temperature_min" DECIMAL(65,30) NOT NULL,
    "temperature_avg" DECIMAL(65,30) NOT NULL,
    "precipitation_mm" DECIMAL(65,30) NOT NULL,
    "wind_speed_max_kmh" DECIMAL(65,30) NOT NULL,
    "humidity_avg" DECIMAL(65,30) NOT NULL,
    "sunshine_hours" DECIMAL(65,30) NOT NULL,
    "frost" BOOLEAN NOT NULL DEFAULT false,
    "raw_data" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "photos" TEXT NOT NULL DEFAULT '[]',
    "tags" TEXT NOT NULL DEFAULT '[]',
    "planting_id" TEXT,
    "bed_id" TEXT,
    "zone_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "thumbnail_path" TEXT,
    "caption" TEXT,
    "taken_at" TIMESTAMP(3) NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "species_name_key" ON "species"("name");

-- CreateIndex
CREATE UNIQUE INDEX "culture_sheets_species_id_key" ON "culture_sheets"("species_id");

-- CreateIndex
CREATE UNIQUE INDEX "nursery_charts_culture_sheet_id_key" ON "nursery_charts"("culture_sheet_id");

-- CreateIndex
CREATE UNIQUE INDEX "nursery_repot_stages_nursery_chart_id_stage_number_key" ON "nursery_repot_stages"("nursery_chart_id", "stage_number");

-- CreateIndex
CREATE UNIQUE INDEX "transplant_charts_culture_sheet_id_key" ON "transplant_charts"("culture_sheet_id");

-- CreateIndex
CREATE UNIQUE INDEX "direct_sow_charts_culture_sheet_id_key" ON "direct_sow_charts"("culture_sheet_id");

-- CreateIndex
CREATE UNIQUE INDEX "yield_charts_culture_sheet_id_key" ON "yield_charts"("culture_sheet_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "weather_data_date_key" ON "weather_data"("date");

-- CreateIndex
CREATE INDEX "photos_entity_type_entity_id_idx" ON "photos"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_settings_key_key" ON "app_settings"("key");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cultivars" ADD CONSTRAINT "cultivars_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "culture_sheets" ADD CONSTRAINT "culture_sheets_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursery_charts" ADD CONSTRAINT "nursery_charts_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursery_repot_stages" ADD CONSTRAINT "nursery_repot_stages_nursery_chart_id_fkey" FOREIGN KEY ("nursery_chart_id") REFERENCES "nursery_charts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transplant_charts" ADD CONSTRAINT "transplant_charts_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_sow_charts" ADD CONSTRAINT "direct_sow_charts_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yield_charts" ADD CONSTRAINT "yield_charts_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantings" ADD CONSTRAINT "plantings_culture_sheet_id_fkey" FOREIGN KEY ("culture_sheet_id") REFERENCES "culture_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "task_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "harvests" ADD CONSTRAINT "harvests_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursery_batches" ADD CONSTRAINT "nursery_batches_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursery_batches" ADD CONSTRAINT "nursery_batches_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nursery_batches" ADD CONSTRAINT "nursery_batches_seed_inventory_id_fkey" FOREIGN KEY ("seed_inventory_id") REFERENCES "seed_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seed_inventory" ADD CONSTRAINT "seed_inventory_cultivar_id_fkey" FOREIGN KEY ("cultivar_id") REFERENCES "cultivars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seed_inventory" ADD CONSTRAINT "seed_inventory_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_planting_id_fkey" FOREIGN KEY ("planting_id") REFERENCES "plantings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

