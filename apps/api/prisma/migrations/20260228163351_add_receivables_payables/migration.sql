-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_template";

-- CreateEnum
CREATE TYPE "TenantPlan" AS ENUM ('TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'FACTORY_OWNER', 'MANAGER', 'SUPERVISOR', 'OPERATOR', 'ACCOUNTANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "tenant_template"."PayOrderStatus" AS ENUM ('DRAFT', 'PENDING_FINANCE', 'PENDING_ADMIN', 'APPROVED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "tenant_template"."BoxStatus" AS ENUM ('IN_STOCK', 'PARTIALLY_USED', 'EMPTY', 'RETURNED');

-- CreateEnum
CREATE TYPE "tenant_template"."ConeStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'EMPTY', 'DEFECTIVE');

-- CreateEnum
CREATE TYPE "tenant_template"."MachineType" AS ENUM ('CIRCULAR_KNITTING', 'FLAT_KNITTING', 'WARP_KNITTING', 'JACQUARD');

-- CreateEnum
CREATE TYPE "tenant_template"."MachineStatus" AS ENUM ('OPERATIONAL', 'MAINTENANCE', 'BREAKDOWN', 'IDLE', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "tenant_template"."DowntimeReason" AS ENUM ('BREAKDOWN', 'MAINTENANCE', 'YARN_CHANGE', 'POWER_OUTAGE', 'NO_OPERATOR', 'NO_YARN', 'QUALITY_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "tenant_template"."RollStatus" AS ENUM ('GREY_STOCK', 'SENT_FOR_DYEING', 'AT_DYEING', 'DYEING_COMPLETE', 'FINISHED_STOCK', 'SOLD', 'REJECTED');

-- CreateEnum
CREATE TYPE "tenant_template"."DyeingStatus" AS ENUM ('SENT', 'IN_PROCESS', 'READY', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "tenant_template"."CustomerType" AS ENUM ('REGULAR', 'WHOLESALE', 'RETAIL', 'EXPORT');

-- CreateEnum
CREATE TYPE "tenant_template"."OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "tenant_template"."PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "tenant_template"."LedgerEntryType" AS ENUM ('OPENING_BALANCE', 'SALE', 'PAYMENT_RECEIVED', 'RETURN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "tenant_template"."PaymentMethod" AS ENUM ('CASH', 'CHEQUE', 'BANK_TRANSFER', 'ONLINE');

-- CreateEnum
CREATE TYPE "tenant_template"."VendorType" AS ENUM ('YARN', 'DYEING', 'GENERAL');

-- CreateEnum
CREATE TYPE "tenant_template"."VendorLedgerType" AS ENUM ('OPENING_BALANCE', 'PURCHASE', 'PAYMENT_MADE', 'RETURN', 'ADJUSTMENT', 'DEBIT_NOTE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "tenant_template"."ChequeType" AS ENUM ('ISSUED', 'RECEIVED');

-- CreateEnum
CREATE TYPE "tenant_template"."ChequeStatus" AS ENUM ('PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED', 'CANCELLED', 'REPLACED');

-- CreateEnum
CREATE TYPE "tenant_template"."MaterialReceiptType" AS ENUM ('PURCHASE', 'RETURN_IN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "tenant_template"."MaterialTransactionType" AS ENUM ('SALE', 'RETURN', 'SAMPLE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "tenant_template"."QualityStatus" AS ENUM ('PENDING_INSPECTION', 'APPROVED', 'REJECTED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "tenant_template"."MaterialIssueType" AS ENUM ('WRONG_TYPE', 'QUALITY_DEFECT', 'SHORT_WEIGHT', 'DAMAGED', 'COLOR_MISMATCH', 'OTHER');

-- CreateEnum
CREATE TYPE "tenant_template"."ReplacementStatus" AS ENUM ('REPORTED', 'RETURN_PENDING', 'RETURNED', 'REPLACEMENT_PENDING', 'REPLACED', 'CREDITED', 'CLOSED');

-- CreateEnum
CREATE TYPE "tenant_template"."StockMovementType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "tenant_template"."UnitCategory" AS ENUM ('LENGTH', 'MASS', 'VOLUME', 'AREA', 'COUNT', 'TIME', 'TEMPERATURE', 'OTHER');

-- CreateEnum
CREATE TYPE "tenant_template"."MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "tenant_template"."MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "schema_name" VARCHAR(100) NOT NULL,
    "owner_name" VARCHAR(255) NOT NULL,
    "owner_email" VARCHAR(255) NOT NULL,
    "owner_phone" VARCHAR(50),
    "address" TEXT,
    "city" VARCHAR(100),
    "total_machines" INTEGER NOT NULL DEFAULT 0,
    "factory_type" VARCHAR(50) NOT NULL DEFAULT 'knitting',
    "plan" "TenantPlan" NOT NULL DEFAULT 'TRIAL',
    "status" "TenantStatus" NOT NULL DEFAULT 'PENDING',
    "trial_ends_at" TIMESTAMP(3),
    "subscription_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_users" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "hashed_password" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255),
    "phone" VARCHAR(50),
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER,
    "user_id" INTEGER,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "entity_id" INTEGER,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."yarn_types" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "brand_name" VARCHAR(255) NOT NULL DEFAULT '',
    "color" VARCHAR(100) NOT NULL DEFAULT '',
    "grade" VARCHAR(50) NOT NULL DEFAULT 'A',
    "composition" JSONB,
    "count_value" DECIMAL(10,2),
    "count_system" VARCHAR(10),
    "default_price_per_kg" DECIMAL(12,2),
    "price_unit" VARCHAR(5) NOT NULL DEFAULT 'KG',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
    "category" VARCHAR(100),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yarn_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."yarn_vendors" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "credit_limit" DECIMAL(15,2),
    "payment_terms" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "rating" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yarn_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."pay_orders" (
    "id" SERIAL NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "order_date" DATE NOT NULL,
    "expected_delivery_date" DATE,
    "total_quantity" DECIMAL(12,3) NOT NULL,
    "total_amount" DECIMAL(15,2),
    "status" "tenant_template"."PayOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "terms" TEXT,
    "notes" TEXT,
    "created_by" INTEGER,
    "approved_by_finance" INTEGER,
    "finance_approved_at" TIMESTAMP(3),
    "approved_by_admin" INTEGER,
    "admin_approved_at" TIMESTAMP(3),
    "rejected_by" INTEGER,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pay_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."pay_order_items" (
    "id" SERIAL NOT NULL,
    "pay_order_id" INTEGER NOT NULL,
    "yarn_type_id" INTEGER NOT NULL,
    "ordered_quantity" DECIMAL(12,3) NOT NULL,
    "received_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'KG',
    "price_per_unit" DECIMAL(12,2),
    "amount" DECIMAL(15,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pay_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."yarn_boxes" (
    "id" SERIAL NOT NULL,
    "box_number" VARCHAR(50) NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "yarn_type_id" INTEGER NOT NULL,
    "lot_number" VARCHAR(100),
    "gross_weight" DECIMAL(10,3) NOT NULL,
    "tare_weight" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "net_weight" DECIMAL(10,3) NOT NULL,
    "price_per_kg" DECIMAL(12,2) NOT NULL,
    "total_value" DECIMAL(15,2) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "invoice_number" VARCHAR(100),
    "gate_pass_number" VARCHAR(100),
    "pay_order_id" INTEGER,
    "status" "tenant_template"."BoxStatus" NOT NULL DEFAULT 'IN_STOCK',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yarn_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."yarn_cones" (
    "id" SERIAL NOT NULL,
    "cone_number" VARCHAR(50) NOT NULL,
    "box_id" INTEGER NOT NULL,
    "yarn_type_id" INTEGER NOT NULL,
    "initial_weight" DECIMAL(10,3) NOT NULL,
    "current_weight" DECIMAL(10,3) NOT NULL,
    "used_weight" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "status" "tenant_template"."ConeStatus" NOT NULL DEFAULT 'AVAILABLE',
    "assigned_machine_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "yarn_cones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."machines" (
    "id" SERIAL NOT NULL,
    "machine_number" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "brand" VARCHAR(100),
    "model" VARCHAR(100),
    "serial_number" VARCHAR(100),
    "machine_type" "tenant_template"."MachineType" NOT NULL,
    "gauge" INTEGER,
    "diameter" INTEGER,
    "feeders" INTEGER,
    "location" VARCHAR(100),
    "position" VARCHAR(50),
    "status" "tenant_template"."MachineStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "last_maintenance_at" TIMESTAMP(3),
    "next_maintenance_at" TIMESTAMP(3),
    "installation_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."shifts" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."production_logs" (
    "id" SERIAL NOT NULL,
    "machine_id" INTEGER NOT NULL,
    "shift_id" INTEGER NOT NULL,
    "operator_id" INTEGER,
    "production_date" DATE NOT NULL,
    "fabric_type" VARCHAR(100) NOT NULL,
    "target_weight" DECIMAL(10,3),
    "actual_weight" DECIMAL(10,3) NOT NULL,
    "rolls_produced" INTEGER NOT NULL DEFAULT 0,
    "efficiency" DECIMAL(5,2),
    "defect_count" INTEGER NOT NULL DEFAULT 0,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "total_hours" DECIMAL(5,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "production_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."yarn_consumption" (
    "id" SERIAL NOT NULL,
    "production_log_id" INTEGER NOT NULL,
    "cone_id" INTEGER NOT NULL,
    "weight_before" DECIMAL(10,3) NOT NULL,
    "weight_after" DECIMAL(10,3) NOT NULL,
    "weight_used" DECIMAL(10,3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yarn_consumption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."downtime_logs" (
    "id" SERIAL NOT NULL,
    "machine_id" INTEGER NOT NULL,
    "reason" "tenant_template"."DowntimeReason" NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "resolved_by" INTEGER,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "downtime_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."rolls" (
    "id" SERIAL NOT NULL,
    "roll_number" VARCHAR(50) NOT NULL,
    "production_log_id" INTEGER,
    "machine_id" INTEGER NOT NULL,
    "fabric_type" VARCHAR(100) NOT NULL,
    "width" DECIMAL(6,2),
    "gsm" INTEGER,
    "grey_weight" DECIMAL(10,3) NOT NULL,
    "finished_weight" DECIMAL(10,3),
    "grey_length" DECIMAL(10,2),
    "finished_length" DECIMAL(10,2),
    "grade" VARCHAR(10) NOT NULL DEFAULT 'A',
    "defects" JSONB,
    "status" "tenant_template"."RollStatus" NOT NULL DEFAULT 'GREY_STOCK',
    "current_location" VARCHAR(100),
    "produced_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."roll_status_history" (
    "id" SERIAL NOT NULL,
    "roll_id" INTEGER NOT NULL,
    "from_status" "tenant_template"."RollStatus",
    "to_status" "tenant_template"."RollStatus" NOT NULL,
    "changed_by" INTEGER,
    "notes" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roll_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."grey_stock_summary" (
    "id" SERIAL NOT NULL,
    "fabric_type" VARCHAR(100) NOT NULL,
    "record_date" DATE NOT NULL,
    "opening_rolls" INTEGER NOT NULL,
    "opening_weight" DECIMAL(12,3) NOT NULL,
    "produced_rolls" INTEGER NOT NULL,
    "produced_weight" DECIMAL(12,3) NOT NULL,
    "sent_for_dyeing" INTEGER NOT NULL,
    "sent_weight" DECIMAL(12,3) NOT NULL,
    "closing_rolls" INTEGER NOT NULL,
    "closing_weight" DECIMAL(12,3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grey_stock_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."dyeing_vendors" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "average_turnaround_days" INTEGER,
    "quality_rating" DECIMAL(3,2),
    "credit_limit" DECIMAL(15,2),
    "payment_terms" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dyeing_vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."general_suppliers" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "supplier_type" VARCHAR(100),
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "ntn" VARCHAR(50),
    "strn" VARCHAR(50),
    "credit_limit" DECIMAL(15,2),
    "payment_terms" INTEGER NOT NULL DEFAULT 30,
    "bank_details" JSONB,
    "rating" INTEGER,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "general_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."dyeing_orders" (
    "id" SERIAL NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "color_code" VARCHAR(50),
    "color_name" VARCHAR(100),
    "process_type" VARCHAR(100),
    "sent_weight" DECIMAL(12,3) NOT NULL,
    "received_weight" DECIMAL(12,3),
    "weight_gain_loss" DECIMAL(12,3),
    "weight_variance" DECIMAL(5,2),
    "rate_per_kg" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(15,2),
    "sent_at" TIMESTAMP(3) NOT NULL,
    "expected_return_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "status" "tenant_template"."DyeingStatus" NOT NULL DEFAULT 'SENT',
    "quality_notes" TEXT,
    "outward_challan" VARCHAR(100),
    "inward_challan" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dyeing_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."dyeing_order_items" (
    "id" SERIAL NOT NULL,
    "dyeing_order_id" INTEGER NOT NULL,
    "roll_id" INTEGER NOT NULL,
    "sent_weight" DECIMAL(10,3) NOT NULL,
    "received_weight" DECIMAL(10,3),
    "is_received" BOOLEAN NOT NULL DEFAULT false,
    "grade" VARCHAR(10),
    "defects" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dyeing_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."customers" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "business_name" VARCHAR(255),
    "contact_person" VARCHAR(255),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "address" TEXT,
    "city" VARCHAR(100),
    "ntn" VARCHAR(50),
    "strn" VARCHAR(50),
    "credit_limit" DECIMAL(15,2),
    "payment_terms" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "customer_type" "tenant_template"."CustomerType" NOT NULL DEFAULT 'REGULAR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."sales_orders" (
    "id" SERIAL NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "order_date" DATE NOT NULL,
    "delivery_date" DATE,
    "subtotal" DECIMAL(15,2) NOT NULL,
    "discount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance_amount" DECIMAL(15,2) NOT NULL,
    "payment_status" "tenant_template"."PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "status" "tenant_template"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "invoice_number" VARCHAR(100),
    "invoiced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."sale_items" (
    "id" SERIAL NOT NULL,
    "sales_order_id" INTEGER NOT NULL,
    "roll_id" INTEGER,
    "fabric_type" VARCHAR(100) NOT NULL,
    "color" VARCHAR(100),
    "weight" DECIMAL(10,3) NOT NULL,
    "length" DECIMAL(10,2),
    "rate_per_kg" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."customer_ledger_entries" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "entry_date" DATE NOT NULL,
    "entry_type" "tenant_template"."LedgerEntryType" NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" INTEGER,
    "reference_number" VARCHAR(100),
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."customer_payments" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "payment_date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "payment_method" "tenant_template"."PaymentMethod" NOT NULL,
    "receipt_number" VARCHAR(100),
    "bank_name" VARCHAR(100),
    "cheque_number" VARCHAR(100),
    "transaction_ref" VARCHAR(100),
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."vendor_payments" (
    "id" SERIAL NOT NULL,
    "vendor_type" "tenant_template"."VendorType" NOT NULL,
    "yarn_vendor_id" INTEGER,
    "dyeing_vendor_id" INTEGER,
    "general_supplier_id" INTEGER,
    "payment_date" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "payment_method" "tenant_template"."PaymentMethod" NOT NULL,
    "voucher_number" VARCHAR(100),
    "cheque_number" VARCHAR(100),
    "bank_name" VARCHAR(100),
    "transaction_ref" VARCHAR(100),
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."vendor_ledger_entries" (
    "id" SERIAL NOT NULL,
    "vendor_type" "tenant_template"."VendorType" NOT NULL,
    "yarn_vendor_id" INTEGER,
    "dyeing_vendor_id" INTEGER,
    "general_supplier_id" INTEGER,
    "entry_date" DATE NOT NULL,
    "entry_type" "tenant_template"."VendorLedgerType" NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(15,2) NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" INTEGER,
    "reference_number" VARCHAR(100),
    "description" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."material_receipts" (
    "id" SERIAL NOT NULL,
    "receipt_number" VARCHAR(50) NOT NULL,
    "vendor_type" "tenant_template"."VendorType" NOT NULL,
    "yarn_vendor_id" INTEGER,
    "dyeing_vendor_id" INTEGER,
    "general_supplier_id" INTEGER,
    "receipt_date" DATE NOT NULL,
    "receipt_type" "tenant_template"."MaterialReceiptType" NOT NULL,
    "invoice_number" VARCHAR(100),
    "gate_pass_number" VARCHAR(100),
    "vehicle_number" VARCHAR(50),
    "pay_order_id" INTEGER,
    "ordered_qty" DECIMAL(12,3),
    "received_qty" DECIMAL(12,3) NOT NULL,
    "accepted_qty" DECIMAL(12,3) NOT NULL,
    "rejected_qty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'KG',
    "rate_per_unit" DECIMAL(12,2),
    "gross_amount" DECIMAL(15,2) NOT NULL,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(15,2) NOT NULL,
    "quality_status" "tenant_template"."QualityStatus" NOT NULL DEFAULT 'PENDING_INSPECTION',
    "quality_checked_by" INTEGER,
    "quality_checked_at" TIMESTAMP(3),
    "quality_notes" TEXT,
    "has_issue" BOOLEAN NOT NULL DEFAULT false,
    "issue_type" "tenant_template"."MaterialIssueType",
    "issue_description" TEXT,
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."material_receipt_items" (
    "id" SERIAL NOT NULL,
    "receipt_id" INTEGER NOT NULL,
    "product_id" INTEGER,
    "yarn_type_id" INTEGER,
    "item_description" VARCHAR(255) NOT NULL,
    "ordered_qty" DECIMAL(12,3),
    "received_qty" DECIMAL(12,3) NOT NULL,
    "accepted_qty" DECIMAL(12,3) NOT NULL,
    "rejected_qty" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'KG',
    "rate_per_unit" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "quality_status" "tenant_template"."QualityStatus" NOT NULL DEFAULT 'PENDING_INSPECTION',
    "quality_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."material_returns" (
    "id" SERIAL NOT NULL,
    "return_number" VARCHAR(50) NOT NULL,
    "vendor_type" "tenant_template"."VendorType" NOT NULL,
    "yarn_vendor_id" INTEGER,
    "dyeing_vendor_id" INTEGER,
    "general_supplier_id" INTEGER,
    "material_receipt_id" INTEGER,
    "return_date" DATE NOT NULL,
    "return_challan_number" VARCHAR(100),
    "issue_type" "tenant_template"."MaterialIssueType" NOT NULL,
    "issue_description" TEXT,
    "returned_quantity" DECIMAL(12,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'KG',
    "return_value" DECIMAL(15,2) NOT NULL,
    "replacement_status" "tenant_template"."ReplacementStatus" NOT NULL DEFAULT 'REPORTED',
    "replacement_quantity" DECIMAL(12,3),
    "replacement_date" DATE,
    "replacement_receipt_id" INTEGER,
    "credit_amount" DECIMAL(15,2),
    "credit_date" DATE,
    "credit_note_number" VARCHAR(100),
    "resolved_at" TIMESTAMP(3),
    "resolved_by" INTEGER,
    "resolution_notes" TEXT,
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."cheques" (
    "id" SERIAL NOT NULL,
    "cheque_number" VARCHAR(50) NOT NULL,
    "cheque_type" "tenant_template"."ChequeType" NOT NULL,
    "customer_id" INTEGER,
    "yarn_vendor_id" INTEGER,
    "dyeing_vendor_id" INTEGER,
    "general_supplier_id" INTEGER,
    "bank_name" VARCHAR(100) NOT NULL,
    "branch_name" VARCHAR(100),
    "account_number" VARCHAR(50),
    "amount" DECIMAL(15,2) NOT NULL,
    "cheque_date" DATE NOT NULL,
    "received_date" DATE,
    "deposit_date" DATE,
    "clearance_date" DATE,
    "bounced_date" DATE,
    "status" "tenant_template"."ChequeStatus" NOT NULL DEFAULT 'PENDING',
    "bounce_reason" TEXT,
    "bounce_charges" DECIMAL(10,2),
    "bounce_count" INTEGER NOT NULL DEFAULT 0,
    "replaced_by_cheque_id" INTEGER,
    "original_cheque_id" INTEGER,
    "customer_payment_id" INTEGER,
    "vendor_payment_id" INTEGER,
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cheques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."cheque_status_history" (
    "id" SERIAL NOT NULL,
    "cheque_id" INTEGER NOT NULL,
    "from_status" "tenant_template"."ChequeStatus",
    "to_status" "tenant_template"."ChequeStatus" NOT NULL,
    "changed_by" INTEGER,
    "reason" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cheque_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."material_transactions" (
    "id" SERIAL NOT NULL,
    "transaction_number" VARCHAR(50) NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "transaction_date" DATE NOT NULL,
    "transaction_type" "tenant_template"."MaterialTransactionType" NOT NULL,
    "reference_number" VARCHAR(100),
    "subtotal" DECIMAL(15,2) NOT NULL,
    "discount_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "delivery_address" TEXT,
    "vehicle_number" VARCHAR(50),
    "sales_order_id" INTEGER,
    "ledger_entry_id" INTEGER,
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "material_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."material_transaction_items" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "roll_id" INTEGER,
    "product_id" INTEGER,
    "item_description" VARCHAR(255) NOT NULL,
    "fabric_type" VARCHAR(100),
    "color" VARCHAR(100),
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT 'KG',
    "rate_per_unit" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."outstanding_balances" (
    "id" SERIAL NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "opening_balance" DECIMAL(15,2) NOT NULL,
    "total_debit" DECIMAL(15,2) NOT NULL,
    "total_credit" DECIMAL(15,2) NOT NULL,
    "current_balance" DECIMAL(15,2) NOT NULL,
    "last_transaction_at" TIMESTAMP(3),
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "overdue_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "overdue_days" INTEGER NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(15,2),
    "available_credit" DECIMAL(15,2),
    "pending_cheque_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pending_cheque_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outstanding_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."aging_snapshots" (
    "id" SERIAL NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "current_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "days_1_to_30" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "days_31_to_60" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "days_61_to_90" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "days_over_90" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_outstanding" DECIMAL(15,2) NOT NULL,
    "total_overdue" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(15,2),
    "available_credit" DECIMAL(15,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aging_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."products" (
    "id" SERIAL NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(100),
    "unit_price" DECIMAL(12,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
    "unit" VARCHAR(20) NOT NULL DEFAULT 'PCS',
    "current_stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "min_stock_level" DECIMAL(12,3),
    "supplier_id" INTEGER,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "variants" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."stock_movements" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "type" "tenant_template"."StockMovementType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "reference_number" VARCHAR(50),
    "source_type" VARCHAR(50),
    "destination_type" VARCHAR(50),
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."tenant_settings" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."departments" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_id" INTEGER,
    "manager_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."product_groups" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parent_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."brands" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "logo_url" VARCHAR(500),
    "website" VARCHAR(255),
    "country" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."units" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "category" "tenant_template"."UnitCategory" NOT NULL,
    "description" TEXT,
    "base_unit" VARCHAR(20),
    "conversion_factor" DECIMAL(20,10),
    "si_unit" BOOLEAN NOT NULL DEFAULT false,
    "iso_code" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."whatsapp_contacts" (
    "id" SERIAL NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "wa_id" VARCHAR(50),
    "name" VARCHAR(255),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "opted_in" BOOLEAN NOT NULL DEFAULT true,
    "linked_to" VARCHAR(50),
    "linked_id" INTEGER,
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "last_message_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."whatsapp_messages" (
    "id" SERIAL NOT NULL,
    "contact_id" INTEGER NOT NULL,
    "direction" "tenant_template"."MessageDirection" NOT NULL,
    "message_type" VARCHAR(20) NOT NULL,
    "content" JSONB NOT NULL,
    "wa_message_id" VARCHAR(100),
    "status" "tenant_template"."MessageStatus" NOT NULL DEFAULT 'PENDING',
    "template_name" VARCHAR(100),
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."whatsapp_templates" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "language" VARCHAR(5) NOT NULL DEFAULT 'en',
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "components" JSONB NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_template"."whatsapp_settings" (
    "id" SERIAL NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "phone_number_id" VARCHAR(50),
    "business_account_id" VARCHAR(50),
    "daily_report_enabled" BOOLEAN NOT NULL DEFAULT true,
    "daily_report_time" VARCHAR(5) NOT NULL DEFAULT '08:00',
    "daily_report_recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "order_notifications" BOOLEAN NOT NULL DEFAULT true,
    "payment_reminders" BOOLEAN NOT NULL DEFAULT true,
    "query_bot_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_schema_name_key" ON "tenants"("schema_name");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenant_id_email_key" ON "tenant_users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_users_tenant_id_username_key" ON "tenant_users"("tenant_id", "username");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "yarn_types_code_key" ON "tenant_template"."yarn_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "yarn_vendors_code_key" ON "tenant_template"."yarn_vendors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "pay_orders_order_number_key" ON "tenant_template"."pay_orders"("order_number");

-- CreateIndex
CREATE INDEX "pay_orders_vendor_id_idx" ON "tenant_template"."pay_orders"("vendor_id");

-- CreateIndex
CREATE INDEX "pay_orders_status_idx" ON "tenant_template"."pay_orders"("status");

-- CreateIndex
CREATE INDEX "pay_orders_order_date_idx" ON "tenant_template"."pay_orders"("order_date");

-- CreateIndex
CREATE INDEX "pay_order_items_pay_order_id_idx" ON "tenant_template"."pay_order_items"("pay_order_id");

-- CreateIndex
CREATE INDEX "pay_order_items_yarn_type_id_idx" ON "tenant_template"."pay_order_items"("yarn_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "yarn_boxes_box_number_key" ON "tenant_template"."yarn_boxes"("box_number");

-- CreateIndex
CREATE INDEX "yarn_boxes_vendor_id_idx" ON "tenant_template"."yarn_boxes"("vendor_id");

-- CreateIndex
CREATE INDEX "yarn_boxes_yarn_type_id_idx" ON "tenant_template"."yarn_boxes"("yarn_type_id");

-- CreateIndex
CREATE INDEX "yarn_boxes_pay_order_id_idx" ON "tenant_template"."yarn_boxes"("pay_order_id");

-- CreateIndex
CREATE INDEX "yarn_boxes_status_idx" ON "tenant_template"."yarn_boxes"("status");

-- CreateIndex
CREATE INDEX "yarn_boxes_received_at_idx" ON "tenant_template"."yarn_boxes"("received_at");

-- CreateIndex
CREATE UNIQUE INDEX "yarn_cones_cone_number_key" ON "tenant_template"."yarn_cones"("cone_number");

-- CreateIndex
CREATE INDEX "yarn_cones_box_id_idx" ON "tenant_template"."yarn_cones"("box_id");

-- CreateIndex
CREATE INDEX "yarn_cones_yarn_type_id_idx" ON "tenant_template"."yarn_cones"("yarn_type_id");

-- CreateIndex
CREATE INDEX "yarn_cones_status_idx" ON "tenant_template"."yarn_cones"("status");

-- CreateIndex
CREATE UNIQUE INDEX "machines_machine_number_key" ON "tenant_template"."machines"("machine_number");

-- CreateIndex
CREATE INDEX "machines_status_idx" ON "tenant_template"."machines"("status");

-- CreateIndex
CREATE UNIQUE INDEX "shifts_code_key" ON "tenant_template"."shifts"("code");

-- CreateIndex
CREATE INDEX "production_logs_machine_id_production_date_idx" ON "tenant_template"."production_logs"("machine_id", "production_date");

-- CreateIndex
CREATE INDEX "production_logs_shift_id_idx" ON "tenant_template"."production_logs"("shift_id");

-- CreateIndex
CREATE INDEX "production_logs_production_date_idx" ON "tenant_template"."production_logs"("production_date");

-- CreateIndex
CREATE INDEX "yarn_consumption_production_log_id_idx" ON "tenant_template"."yarn_consumption"("production_log_id");

-- CreateIndex
CREATE INDEX "yarn_consumption_cone_id_idx" ON "tenant_template"."yarn_consumption"("cone_id");

-- CreateIndex
CREATE INDEX "downtime_logs_machine_id_idx" ON "tenant_template"."downtime_logs"("machine_id");

-- CreateIndex
CREATE INDEX "downtime_logs_start_time_idx" ON "tenant_template"."downtime_logs"("start_time");

-- CreateIndex
CREATE UNIQUE INDEX "rolls_roll_number_key" ON "tenant_template"."rolls"("roll_number");

-- CreateIndex
CREATE INDEX "rolls_status_idx" ON "tenant_template"."rolls"("status");

-- CreateIndex
CREATE INDEX "rolls_fabric_type_idx" ON "tenant_template"."rolls"("fabric_type");

-- CreateIndex
CREATE INDEX "rolls_produced_at_idx" ON "tenant_template"."rolls"("produced_at");

-- CreateIndex
CREATE INDEX "roll_status_history_roll_id_idx" ON "tenant_template"."roll_status_history"("roll_id");

-- CreateIndex
CREATE INDEX "roll_status_history_changed_at_idx" ON "tenant_template"."roll_status_history"("changed_at");

-- CreateIndex
CREATE INDEX "grey_stock_summary_record_date_idx" ON "tenant_template"."grey_stock_summary"("record_date");

-- CreateIndex
CREATE UNIQUE INDEX "grey_stock_summary_fabric_type_record_date_key" ON "tenant_template"."grey_stock_summary"("fabric_type", "record_date");

-- CreateIndex
CREATE UNIQUE INDEX "dyeing_vendors_code_key" ON "tenant_template"."dyeing_vendors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "general_suppliers_code_key" ON "tenant_template"."general_suppliers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dyeing_orders_order_number_key" ON "tenant_template"."dyeing_orders"("order_number");

-- CreateIndex
CREATE INDEX "dyeing_orders_vendor_id_idx" ON "tenant_template"."dyeing_orders"("vendor_id");

-- CreateIndex
CREATE INDEX "dyeing_orders_status_idx" ON "tenant_template"."dyeing_orders"("status");

-- CreateIndex
CREATE INDEX "dyeing_orders_sent_at_idx" ON "tenant_template"."dyeing_orders"("sent_at");

-- CreateIndex
CREATE INDEX "dyeing_order_items_dyeing_order_id_idx" ON "tenant_template"."dyeing_order_items"("dyeing_order_id");

-- CreateIndex
CREATE INDEX "dyeing_order_items_roll_id_idx" ON "tenant_template"."dyeing_order_items"("roll_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "tenant_template"."customers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_order_number_key" ON "tenant_template"."sales_orders"("order_number");

-- CreateIndex
CREATE INDEX "sales_orders_customer_id_idx" ON "tenant_template"."sales_orders"("customer_id");

-- CreateIndex
CREATE INDEX "sales_orders_order_date_idx" ON "tenant_template"."sales_orders"("order_date");

-- CreateIndex
CREATE INDEX "sales_orders_status_idx" ON "tenant_template"."sales_orders"("status");

-- CreateIndex
CREATE INDEX "sale_items_sales_order_id_idx" ON "tenant_template"."sale_items"("sales_order_id");

-- CreateIndex
CREATE INDEX "sale_items_roll_id_idx" ON "tenant_template"."sale_items"("roll_id");

-- CreateIndex
CREATE INDEX "customer_ledger_entries_customer_id_idx" ON "tenant_template"."customer_ledger_entries"("customer_id");

-- CreateIndex
CREATE INDEX "customer_ledger_entries_entry_date_idx" ON "tenant_template"."customer_ledger_entries"("entry_date");

-- CreateIndex
CREATE INDEX "customer_payments_customer_id_idx" ON "tenant_template"."customer_payments"("customer_id");

-- CreateIndex
CREATE INDEX "customer_payments_payment_date_idx" ON "tenant_template"."customer_payments"("payment_date");

-- CreateIndex
CREATE INDEX "vendor_payments_vendor_type_idx" ON "tenant_template"."vendor_payments"("vendor_type");

-- CreateIndex
CREATE INDEX "vendor_payments_payment_date_idx" ON "tenant_template"."vendor_payments"("payment_date");

-- CreateIndex
CREATE INDEX "vendor_payments_general_supplier_id_idx" ON "tenant_template"."vendor_payments"("general_supplier_id");

-- CreateIndex
CREATE INDEX "vendor_ledger_entries_vendor_type_idx" ON "tenant_template"."vendor_ledger_entries"("vendor_type");

-- CreateIndex
CREATE INDEX "vendor_ledger_entries_yarn_vendor_id_idx" ON "tenant_template"."vendor_ledger_entries"("yarn_vendor_id");

-- CreateIndex
CREATE INDEX "vendor_ledger_entries_dyeing_vendor_id_idx" ON "tenant_template"."vendor_ledger_entries"("dyeing_vendor_id");

-- CreateIndex
CREATE INDEX "vendor_ledger_entries_general_supplier_id_idx" ON "tenant_template"."vendor_ledger_entries"("general_supplier_id");

-- CreateIndex
CREATE INDEX "vendor_ledger_entries_entry_date_idx" ON "tenant_template"."vendor_ledger_entries"("entry_date");

-- CreateIndex
CREATE INDEX "vendor_ledger_entries_entry_type_idx" ON "tenant_template"."vendor_ledger_entries"("entry_type");

-- CreateIndex
CREATE UNIQUE INDEX "material_receipts_receipt_number_key" ON "tenant_template"."material_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "material_receipts_vendor_type_idx" ON "tenant_template"."material_receipts"("vendor_type");

-- CreateIndex
CREATE INDEX "material_receipts_yarn_vendor_id_idx" ON "tenant_template"."material_receipts"("yarn_vendor_id");

-- CreateIndex
CREATE INDEX "material_receipts_dyeing_vendor_id_idx" ON "tenant_template"."material_receipts"("dyeing_vendor_id");

-- CreateIndex
CREATE INDEX "material_receipts_general_supplier_id_idx" ON "tenant_template"."material_receipts"("general_supplier_id");

-- CreateIndex
CREATE INDEX "material_receipts_receipt_date_idx" ON "tenant_template"."material_receipts"("receipt_date");

-- CreateIndex
CREATE INDEX "material_receipts_quality_status_idx" ON "tenant_template"."material_receipts"("quality_status");

-- CreateIndex
CREATE INDEX "material_receipt_items_receipt_id_idx" ON "tenant_template"."material_receipt_items"("receipt_id");

-- CreateIndex
CREATE INDEX "material_receipt_items_product_id_idx" ON "tenant_template"."material_receipt_items"("product_id");

-- CreateIndex
CREATE INDEX "material_receipt_items_yarn_type_id_idx" ON "tenant_template"."material_receipt_items"("yarn_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_returns_return_number_key" ON "tenant_template"."material_returns"("return_number");

-- CreateIndex
CREATE INDEX "material_returns_vendor_type_idx" ON "tenant_template"."material_returns"("vendor_type");

-- CreateIndex
CREATE INDEX "material_returns_yarn_vendor_id_idx" ON "tenant_template"."material_returns"("yarn_vendor_id");

-- CreateIndex
CREATE INDEX "material_returns_dyeing_vendor_id_idx" ON "tenant_template"."material_returns"("dyeing_vendor_id");

-- CreateIndex
CREATE INDEX "material_returns_general_supplier_id_idx" ON "tenant_template"."material_returns"("general_supplier_id");

-- CreateIndex
CREATE INDEX "material_returns_return_date_idx" ON "tenant_template"."material_returns"("return_date");

-- CreateIndex
CREATE INDEX "material_returns_replacement_status_idx" ON "tenant_template"."material_returns"("replacement_status");

-- CreateIndex
CREATE UNIQUE INDEX "cheques_replaced_by_cheque_id_key" ON "tenant_template"."cheques"("replaced_by_cheque_id");

-- CreateIndex
CREATE INDEX "cheques_cheque_type_idx" ON "tenant_template"."cheques"("cheque_type");

-- CreateIndex
CREATE INDEX "cheques_customer_id_idx" ON "tenant_template"."cheques"("customer_id");

-- CreateIndex
CREATE INDEX "cheques_yarn_vendor_id_idx" ON "tenant_template"."cheques"("yarn_vendor_id");

-- CreateIndex
CREATE INDEX "cheques_dyeing_vendor_id_idx" ON "tenant_template"."cheques"("dyeing_vendor_id");

-- CreateIndex
CREATE INDEX "cheques_general_supplier_id_idx" ON "tenant_template"."cheques"("general_supplier_id");

-- CreateIndex
CREATE INDEX "cheques_status_idx" ON "tenant_template"."cheques"("status");

-- CreateIndex
CREATE INDEX "cheques_cheque_date_idx" ON "tenant_template"."cheques"("cheque_date");

-- CreateIndex
CREATE INDEX "cheques_deposit_date_idx" ON "tenant_template"."cheques"("deposit_date");

-- CreateIndex
CREATE INDEX "cheque_status_history_cheque_id_idx" ON "tenant_template"."cheque_status_history"("cheque_id");

-- CreateIndex
CREATE INDEX "cheque_status_history_changed_at_idx" ON "tenant_template"."cheque_status_history"("changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "material_transactions_transaction_number_key" ON "tenant_template"."material_transactions"("transaction_number");

-- CreateIndex
CREATE INDEX "material_transactions_customer_id_idx" ON "tenant_template"."material_transactions"("customer_id");

-- CreateIndex
CREATE INDEX "material_transactions_transaction_date_idx" ON "tenant_template"."material_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "material_transactions_transaction_type_idx" ON "tenant_template"."material_transactions"("transaction_type");

-- CreateIndex
CREATE INDEX "material_transactions_sales_order_id_idx" ON "tenant_template"."material_transactions"("sales_order_id");

-- CreateIndex
CREATE INDEX "material_transaction_items_transaction_id_idx" ON "tenant_template"."material_transaction_items"("transaction_id");

-- CreateIndex
CREATE INDEX "material_transaction_items_roll_id_idx" ON "tenant_template"."material_transaction_items"("roll_id");

-- CreateIndex
CREATE INDEX "material_transaction_items_product_id_idx" ON "tenant_template"."material_transaction_items"("product_id");

-- CreateIndex
CREATE INDEX "outstanding_balances_entity_type_idx" ON "tenant_template"."outstanding_balances"("entity_type");

-- CreateIndex
CREATE INDEX "outstanding_balances_is_overdue_idx" ON "tenant_template"."outstanding_balances"("is_overdue");

-- CreateIndex
CREATE UNIQUE INDEX "outstanding_balances_entity_type_entity_id_key" ON "tenant_template"."outstanding_balances"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "aging_snapshots_entity_type_entity_id_idx" ON "tenant_template"."aging_snapshots"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "aging_snapshots_snapshot_date_idx" ON "tenant_template"."aging_snapshots"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "tenant_template"."products"("sku");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "tenant_template"."products"("sku");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "tenant_template"."products"("category");

-- CreateIndex
CREATE INDEX "products_supplier_id_idx" ON "tenant_template"."products"("supplier_id");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_idx" ON "tenant_template"."stock_movements"("product_id");

-- CreateIndex
CREATE INDEX "stock_movements_type_idx" ON "tenant_template"."stock_movements"("type");

-- CreateIndex
CREATE INDEX "stock_movements_created_at_idx" ON "tenant_template"."stock_movements"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_key_key" ON "tenant_template"."tenant_settings"("key");

-- CreateIndex
CREATE INDEX "tenant_settings_category_idx" ON "tenant_template"."tenant_settings"("category");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "tenant_template"."departments"("code");

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "tenant_template"."departments"("parent_id");

-- CreateIndex
CREATE INDEX "departments_is_active_idx" ON "tenant_template"."departments"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "product_groups_code_key" ON "tenant_template"."product_groups"("code");

-- CreateIndex
CREATE INDEX "product_groups_parent_id_idx" ON "tenant_template"."product_groups"("parent_id");

-- CreateIndex
CREATE INDEX "product_groups_is_active_idx" ON "tenant_template"."product_groups"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "brands_code_key" ON "tenant_template"."brands"("code");

-- CreateIndex
CREATE INDEX "brands_is_active_idx" ON "tenant_template"."brands"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "units_code_key" ON "tenant_template"."units"("code");

-- CreateIndex
CREATE INDEX "units_category_idx" ON "tenant_template"."units"("category");

-- CreateIndex
CREATE INDEX "units_is_active_idx" ON "tenant_template"."units"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_contacts_phone_number_key" ON "tenant_template"."whatsapp_contacts"("phone_number");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_linked_to_linked_id_idx" ON "tenant_template"."whatsapp_contacts"("linked_to", "linked_id");

-- CreateIndex
CREATE INDEX "whatsapp_contacts_is_verified_idx" ON "tenant_template"."whatsapp_contacts"("is_verified");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_wa_message_id_key" ON "tenant_template"."whatsapp_messages"("wa_message_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_contact_id_idx" ON "tenant_template"."whatsapp_messages"("contact_id");

-- CreateIndex
CREATE INDEX "whatsapp_messages_status_idx" ON "tenant_template"."whatsapp_messages"("status");

-- CreateIndex
CREATE INDEX "whatsapp_messages_created_at_idx" ON "tenant_template"."whatsapp_messages"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_templates_name_key" ON "tenant_template"."whatsapp_templates"("name");

-- CreateIndex
CREATE INDEX "whatsapp_templates_category_idx" ON "tenant_template"."whatsapp_templates"("category");

-- CreateIndex
CREATE INDEX "whatsapp_templates_is_active_idx" ON "tenant_template"."whatsapp_templates"("is_active");

-- AddForeignKey
ALTER TABLE "tenant_users" ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."pay_orders" ADD CONSTRAINT "pay_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "tenant_template"."yarn_vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."pay_order_items" ADD CONSTRAINT "pay_order_items_pay_order_id_fkey" FOREIGN KEY ("pay_order_id") REFERENCES "tenant_template"."pay_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."pay_order_items" ADD CONSTRAINT "pay_order_items_yarn_type_id_fkey" FOREIGN KEY ("yarn_type_id") REFERENCES "tenant_template"."yarn_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."yarn_boxes" ADD CONSTRAINT "yarn_boxes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "tenant_template"."yarn_vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."yarn_boxes" ADD CONSTRAINT "yarn_boxes_yarn_type_id_fkey" FOREIGN KEY ("yarn_type_id") REFERENCES "tenant_template"."yarn_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."yarn_boxes" ADD CONSTRAINT "yarn_boxes_pay_order_id_fkey" FOREIGN KEY ("pay_order_id") REFERENCES "tenant_template"."pay_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."yarn_cones" ADD CONSTRAINT "yarn_cones_box_id_fkey" FOREIGN KEY ("box_id") REFERENCES "tenant_template"."yarn_boxes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."yarn_cones" ADD CONSTRAINT "yarn_cones_yarn_type_id_fkey" FOREIGN KEY ("yarn_type_id") REFERENCES "tenant_template"."yarn_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."yarn_cones" ADD CONSTRAINT "yarn_cones_assigned_machine_id_fkey" FOREIGN KEY ("assigned_machine_id") REFERENCES "tenant_template"."machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."production_logs" ADD CONSTRAINT "production_logs_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "tenant_template"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."production_logs" ADD CONSTRAINT "production_logs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "tenant_template"."shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."yarn_consumption" ADD CONSTRAINT "yarn_consumption_production_log_id_fkey" FOREIGN KEY ("production_log_id") REFERENCES "tenant_template"."production_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."yarn_consumption" ADD CONSTRAINT "yarn_consumption_cone_id_fkey" FOREIGN KEY ("cone_id") REFERENCES "tenant_template"."yarn_cones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."downtime_logs" ADD CONSTRAINT "downtime_logs_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "tenant_template"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."rolls" ADD CONSTRAINT "rolls_production_log_id_fkey" FOREIGN KEY ("production_log_id") REFERENCES "tenant_template"."production_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."roll_status_history" ADD CONSTRAINT "roll_status_history_roll_id_fkey" FOREIGN KEY ("roll_id") REFERENCES "tenant_template"."rolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."dyeing_orders" ADD CONSTRAINT "dyeing_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "tenant_template"."dyeing_vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."dyeing_order_items" ADD CONSTRAINT "dyeing_order_items_dyeing_order_id_fkey" FOREIGN KEY ("dyeing_order_id") REFERENCES "tenant_template"."dyeing_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."dyeing_order_items" ADD CONSTRAINT "dyeing_order_items_roll_id_fkey" FOREIGN KEY ("roll_id") REFERENCES "tenant_template"."rolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."sale_items" ADD CONSTRAINT "sale_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "tenant_template"."sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."sale_items" ADD CONSTRAINT "sale_items_roll_id_fkey" FOREIGN KEY ("roll_id") REFERENCES "tenant_template"."rolls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_ledger_entries" ADD CONSTRAINT "customer_ledger_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."customer_payments" ADD CONSTRAINT "customer_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."vendor_payments" ADD CONSTRAINT "vendor_payments_yarn_vendor_id_fkey" FOREIGN KEY ("yarn_vendor_id") REFERENCES "tenant_template"."yarn_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."vendor_payments" ADD CONSTRAINT "vendor_payments_dyeing_vendor_id_fkey" FOREIGN KEY ("dyeing_vendor_id") REFERENCES "tenant_template"."dyeing_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."vendor_payments" ADD CONSTRAINT "vendor_payments_general_supplier_id_fkey" FOREIGN KEY ("general_supplier_id") REFERENCES "tenant_template"."general_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_yarn_vendor_id_fkey" FOREIGN KEY ("yarn_vendor_id") REFERENCES "tenant_template"."yarn_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_dyeing_vendor_id_fkey" FOREIGN KEY ("dyeing_vendor_id") REFERENCES "tenant_template"."dyeing_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."vendor_ledger_entries" ADD CONSTRAINT "vendor_ledger_entries_general_supplier_id_fkey" FOREIGN KEY ("general_supplier_id") REFERENCES "tenant_template"."general_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."material_receipts" ADD CONSTRAINT "material_receipts_yarn_vendor_id_fkey" FOREIGN KEY ("yarn_vendor_id") REFERENCES "tenant_template"."yarn_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."material_receipts" ADD CONSTRAINT "material_receipts_dyeing_vendor_id_fkey" FOREIGN KEY ("dyeing_vendor_id") REFERENCES "tenant_template"."dyeing_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."material_receipts" ADD CONSTRAINT "material_receipts_general_supplier_id_fkey" FOREIGN KEY ("general_supplier_id") REFERENCES "tenant_template"."general_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."material_receipt_items" ADD CONSTRAINT "material_receipt_items_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "tenant_template"."material_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."material_returns" ADD CONSTRAINT "material_returns_yarn_vendor_id_fkey" FOREIGN KEY ("yarn_vendor_id") REFERENCES "tenant_template"."yarn_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."material_returns" ADD CONSTRAINT "material_returns_dyeing_vendor_id_fkey" FOREIGN KEY ("dyeing_vendor_id") REFERENCES "tenant_template"."dyeing_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."material_returns" ADD CONSTRAINT "material_returns_general_supplier_id_fkey" FOREIGN KEY ("general_supplier_id") REFERENCES "tenant_template"."general_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."material_returns" ADD CONSTRAINT "material_returns_material_receipt_id_fkey" FOREIGN KEY ("material_receipt_id") REFERENCES "tenant_template"."material_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."cheques" ADD CONSTRAINT "cheques_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."cheques" ADD CONSTRAINT "cheques_yarn_vendor_id_fkey" FOREIGN KEY ("yarn_vendor_id") REFERENCES "tenant_template"."yarn_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."cheques" ADD CONSTRAINT "cheques_dyeing_vendor_id_fkey" FOREIGN KEY ("dyeing_vendor_id") REFERENCES "tenant_template"."dyeing_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."cheques" ADD CONSTRAINT "cheques_general_supplier_id_fkey" FOREIGN KEY ("general_supplier_id") REFERENCES "tenant_template"."general_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."cheques" ADD CONSTRAINT "cheques_customer_payment_id_fkey" FOREIGN KEY ("customer_payment_id") REFERENCES "tenant_template"."customer_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."cheques" ADD CONSTRAINT "cheques_vendor_payment_id_fkey" FOREIGN KEY ("vendor_payment_id") REFERENCES "tenant_template"."vendor_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."cheques" ADD CONSTRAINT "cheques_replaced_by_cheque_id_fkey" FOREIGN KEY ("replaced_by_cheque_id") REFERENCES "tenant_template"."cheques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."cheque_status_history" ADD CONSTRAINT "cheque_status_history_cheque_id_fkey" FOREIGN KEY ("cheque_id") REFERENCES "tenant_template"."cheques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."material_transactions" ADD CONSTRAINT "material_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "tenant_template"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."material_transaction_items" ADD CONSTRAINT "material_transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "tenant_template"."material_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."products" ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "tenant_template"."yarn_vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "tenant_template"."products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tenant_template"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."product_groups" ADD CONSTRAINT "product_groups_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "tenant_template"."product_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template"."whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "tenant_template"."whatsapp_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
