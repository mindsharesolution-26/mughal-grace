-- AlterTable
ALTER TABLE "tenant_template"."machines" ADD COLUMN     "cylinder_needles" INTEGER,
ADD COLUMN     "dial_needles" INTEGER,
ADD COLUMN     "needle_gauge" INTEGER,
ADD COLUMN     "total_needle_slots" INTEGER;

-- CreateTable
CREATE TABLE "tenant_template"."needle_types" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "needle_kind" VARCHAR(50) NOT NULL,
    "gauge" INTEGER NOT NULL,
    "length" DECIMAL(5,2),
    "material" VARCHAR(50) NOT NULL,
    "brand" VARCHAR(100),
    "supplier_code" VARCHAR(50),
    "cost_per_needle" DECIMAL(10,2),
    "currency" VARCHAR(10) NOT NULL DEFAULT 'PKR',
    "min_stock_level" INTEGER NOT NULL DEFAULT 100,
    "reorder_point" INTEGER NOT NULL DEFAULT 200,
    "compatible_machines" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "needle_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."needle_stock_batches" (
    "id" SERIAL NOT NULL,
    "batch_number" VARCHAR(30) NOT NULL,
    "needle_type_id" INTEGER NOT NULL,
    "received_quantity" INTEGER NOT NULL,
    "current_quantity" INTEGER NOT NULL,
    "allocated_quantity" INTEGER NOT NULL DEFAULT 0,
    "damaged_quantity" INTEGER NOT NULL DEFAULT 0,
    "received_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoice_number" VARCHAR(50),
    "invoice_date" TIMESTAMP(3),
    "unit_cost" DECIMAL(10,2),
    "total_cost" DECIMAL(12,2),
    "supplier_id" INTEGER,
    "supplier_name" VARCHAR(200),
    "collected_by" INTEGER,
    "collector_name" VARCHAR(100),
    "collection_date" TIMESTAMP(3),
    "lot_number" VARCHAR(50),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "needle_stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."needle_stock_movements" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "movement_type" VARCHAR(20) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" INTEGER,
    "performed_by" INTEGER NOT NULL,
    "performer_name" VARCHAR(100) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "needle_stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."needle_machine_allocations" (
    "id" SERIAL NOT NULL,
    "machine_id" INTEGER NOT NULL,
    "needle_type_id" INTEGER NOT NULL,
    "batch_id" INTEGER,
    "installed_quantity" INTEGER NOT NULL,
    "position" VARCHAR(50),
    "installed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installed_by" INTEGER NOT NULL,
    "installer_name" VARCHAR(100) NOT NULL,
    "removed_at" TIMESTAMP(3),
    "removed_by" INTEGER,
    "remover_name" VARCHAR(100),
    "removal_reason" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'INSTALLED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "needle_machine_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."needle_damages" (
    "id" SERIAL NOT NULL,
    "needle_type_id" INTEGER NOT NULL,
    "batch_id" INTEGER,
    "allocation_id" INTEGER,
    "machine_id" INTEGER,
    "damage_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "damage_type" VARCHAR(50) NOT NULL,
    "damaged_quantity" INTEGER NOT NULL,
    "cause" VARCHAR(100),
    "description" TEXT,
    "reported_by" INTEGER NOT NULL,
    "reporter_name" VARCHAR(100) NOT NULL,
    "resolution_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "replaced_quantity" INTEGER,
    "replaced_at" TIMESTAMP(3),
    "replaced_by" INTEGER,
    "replacer_name" VARCHAR(100),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "needle_damages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "needle_types_code_key" ON "tenant_template"."needle_types"("code");

-- CreateIndex
CREATE INDEX "needle_types_code_idx" ON "tenant_template"."needle_types"("code");

-- CreateIndex
CREATE INDEX "needle_types_gauge_idx" ON "tenant_template"."needle_types"("gauge");

-- CreateIndex
CREATE UNIQUE INDEX "needle_stock_batches_batch_number_key" ON "tenant_template"."needle_stock_batches"("batch_number");

-- CreateIndex
CREATE INDEX "needle_stock_batches_batch_number_idx" ON "tenant_template"."needle_stock_batches"("batch_number");

-- CreateIndex
CREATE INDEX "needle_stock_batches_needle_type_id_idx" ON "tenant_template"."needle_stock_batches"("needle_type_id");

-- CreateIndex
CREATE INDEX "needle_stock_batches_received_date_idx" ON "tenant_template"."needle_stock_batches"("received_date");

-- CreateIndex
CREATE INDEX "needle_stock_movements_batch_id_idx" ON "tenant_template"."needle_stock_movements"("batch_id");

-- CreateIndex
CREATE INDEX "needle_stock_movements_movement_type_idx" ON "tenant_template"."needle_stock_movements"("movement_type");

-- CreateIndex
CREATE INDEX "needle_stock_movements_created_at_idx" ON "tenant_template"."needle_stock_movements"("created_at");

-- CreateIndex
CREATE INDEX "needle_machine_allocations_machine_id_idx" ON "tenant_template"."needle_machine_allocations"("machine_id");

-- CreateIndex
CREATE INDEX "needle_machine_allocations_needle_type_id_idx" ON "tenant_template"."needle_machine_allocations"("needle_type_id");

-- CreateIndex
CREATE INDEX "needle_machine_allocations_status_idx" ON "tenant_template"."needle_machine_allocations"("status");

-- CreateIndex
CREATE INDEX "needle_damages_needle_type_id_idx" ON "tenant_template"."needle_damages"("needle_type_id");

-- CreateIndex
CREATE INDEX "needle_damages_machine_id_idx" ON "tenant_template"."needle_damages"("machine_id");

-- CreateIndex
CREATE INDEX "needle_damages_damage_date_idx" ON "tenant_template"."needle_damages"("damage_date");

-- CreateIndex
CREATE INDEX "needle_damages_damage_type_idx" ON "tenant_template"."needle_damages"("damage_type");

-- AddForeignKey
ALTER TABLE "tenant_template"."needle_stock_batches" ADD CONSTRAINT "needle_stock_batches_needle_type_id_fkey" FOREIGN KEY ("needle_type_id") REFERENCES "tenant_template"."needle_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."needle_stock_movements" ADD CONSTRAINT "needle_stock_movements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "tenant_template"."needle_stock_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."needle_machine_allocations" ADD CONSTRAINT "needle_machine_allocations_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "tenant_template"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."needle_machine_allocations" ADD CONSTRAINT "needle_machine_allocations_needle_type_id_fkey" FOREIGN KEY ("needle_type_id") REFERENCES "tenant_template"."needle_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."needle_machine_allocations" ADD CONSTRAINT "needle_machine_allocations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "tenant_template"."needle_stock_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."needle_damages" ADD CONSTRAINT "needle_damages_needle_type_id_fkey" FOREIGN KEY ("needle_type_id") REFERENCES "tenant_template"."needle_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."needle_damages" ADD CONSTRAINT "needle_damages_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "tenant_template"."needle_stock_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."needle_damages" ADD CONSTRAINT "needle_damages_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "tenant_template"."needle_machine_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
