-- AlterTable
ALTER TABLE "invoice_lines" ADD COLUMN "packaging" TEXT;
ALTER TABLE "invoice_lines" ADD COLUMN "qty_ordered" INTEGER;
ALTER TABLE "invoice_lines" ADD COLUMN "reference" TEXT;
ALTER TABLE "invoice_lines" ADD COLUMN "tva_rate" DECIMAL;
