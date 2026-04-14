-- AlterTable
ALTER TABLE "tenant_template"."brands" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updated_by" INTEGER;

-- AlterTable
ALTER TABLE "tenant_template"."departments" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updated_by" INTEGER;

-- AlterTable
ALTER TABLE "tenant_template"."product_groups" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updated_by" INTEGER;

-- AlterTable
ALTER TABLE "tenant_template"."units" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "updated_by" INTEGER;

-- CreateTable
CREATE TABLE "tenant_template"."groups" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "group_type" VARCHAR(100),
    "description" TEXT,
    "parent_id" INTEGER,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."materials" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(100),
    "category" VARCHAR(100),
    "description" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."colors" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "hex_code" VARCHAR(7),
    "pantone_code" VARCHAR(50),
    "description" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "colors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."grades" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."knitting_machine_sizes" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "gauge" INTEGER,
    "diameter" INTEGER,
    "needle_count" INTEGER,
    "machine_type" VARCHAR(100),
    "description" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" INTEGER,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knitting_machine_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_code_key" ON "tenant_template"."groups"("code");

-- CreateIndex
CREATE INDEX "groups_parent_id_idx" ON "tenant_template"."groups"("parent_id");

-- CreateIndex
CREATE INDEX "groups_is_active_idx" ON "tenant_template"."groups"("is_active");

-- CreateIndex
CREATE INDEX "groups_group_type_idx" ON "tenant_template"."groups"("group_type");

-- CreateIndex
CREATE UNIQUE INDEX "materials_code_key" ON "tenant_template"."materials"("code");

-- CreateIndex
CREATE INDEX "materials_is_active_idx" ON "tenant_template"."materials"("is_active");

-- CreateIndex
CREATE INDEX "materials_type_idx" ON "tenant_template"."materials"("type");

-- CreateIndex
CREATE INDEX "materials_category_idx" ON "tenant_template"."materials"("category");

-- CreateIndex
CREATE UNIQUE INDEX "colors_code_key" ON "tenant_template"."colors"("code");

-- CreateIndex
CREATE INDEX "colors_is_active_idx" ON "tenant_template"."colors"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "grades_code_key" ON "tenant_template"."grades"("code");

-- CreateIndex
CREATE INDEX "grades_is_active_idx" ON "tenant_template"."grades"("is_active");

-- CreateIndex
CREATE INDEX "grades_level_idx" ON "tenant_template"."grades"("level");

-- CreateIndex
CREATE UNIQUE INDEX "knitting_machine_sizes_code_key" ON "tenant_template"."knitting_machine_sizes"("code");

-- CreateIndex
CREATE INDEX "knitting_machine_sizes_is_active_idx" ON "tenant_template"."knitting_machine_sizes"("is_active");

-- CreateIndex
CREATE INDEX "knitting_machine_sizes_gauge_idx" ON "tenant_template"."knitting_machine_sizes"("gauge");

-- CreateIndex
CREATE INDEX "knitting_machine_sizes_machine_type_idx" ON "tenant_template"."knitting_machine_sizes"("machine_type");

-- AddForeignKey
ALTER TABLE "tenant_template"."groups" ADD CONSTRAINT "groups_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tenant_template"."groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
