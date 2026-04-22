import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');
  console.log('Clearing existing data...');

  // Delete in order to respect foreign key constraints
  // Chat
  await prisma.chatMessage.deleteMany();
  await prisma.chatConversation.deleteMany();

  // Accounting
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.generalLedger.deleteMany();
  await prisma.bankReconciliationItem.deleteMany();
  await prisma.bankReconciliation.deleteMany();
  await prisma.accountBudget.deleteMany();
  await prisma.fiscalPeriod.deleteMany();
  await prisma.fiscalYear.deleteMany();
  await prisma.chartOfAccount.deleteMany();
  await prisma.accountingSettings.deleteMany();
  await prisma.currencyExchangeRate.deleteMany();

  // Finance - Cheques
  await prisma.chequeStatusHistory.deleteMany();
  await prisma.cheque.deleteMany();

  // Finance - Payments & Ledger
  await prisma.customerPayment.deleteMany();
  await prisma.vendorPayment.deleteMany();
  await prisma.customerLedgerEntry.deleteMany();
  await prisma.vendorLedgerEntry.deleteMany();
  await prisma.outstandingBalance.deleteMany();
  await prisma.agingSnapshot.deleteMany();

  // Sales
  await prisma.saleItem.deleteMany();
  await prisma.salesOrder.deleteMany();

  // Materials
  await prisma.materialReceiptItem.deleteMany();
  await prisma.materialReceipt.deleteMany();
  await prisma.materialReturn.deleteMany();
  await prisma.materialTransactionItem.deleteMany();
  await prisma.materialTransaction.deleteMany();

  // Production
  await prisma.rollStatusHistory.deleteMany();
  await prisma.roll.deleteMany();
  await prisma.yarnConsumption.deleteMany();
  await prisma.downtimeLog.deleteMany();
  await prisma.productionLog.deleteMany();
  await prisma.greyStockSummary.deleteMany();

  // Dyeing
  await prisma.dyeingOrderItem.deleteMany();
  await prisma.dyeingOrder.deleteMany();

  // Yarn
  await prisma.yarnOutward.deleteMany();
  await prisma.yarnLedger.deleteMany();
  await prisma.yarnCone.deleteMany();
  await prisma.yarnBox.deleteMany();
  await prisma.payOrderItem.deleteMany();
  await prisma.payOrder.deleteMany();
  await prisma.yarnTypeKnittingYarn.deleteMany();
  await prisma.knittingYarn.deleteMany();
  await prisma.yarnType.deleteMany();

  // Needles
  await prisma.needleDamage.deleteMany();
  await prisma.needleMachineAllocation.deleteMany();
  await prisma.needleStockMovement.deleteMany();
  await prisma.needleStockBatch.deleteMany();
  await prisma.needleType.deleteMany();

  // Stock/Inventory
  await prisma.stockAlert.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.stockBatch.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.stockCategory.deleteMany();
  await prisma.warehouse.deleteMany();

  // Machines
  await prisma.machine.deleteMany();

  // Products
  await prisma.stockMovement.deleteMany();
  await prisma.product.deleteMany();

  // Vendors & Customers
  await prisma.yarnVendor.deleteMany();
  await prisma.dyeingVendor.deleteMany();
  await prisma.generalSupplier.deleteMany();
  await prisma.customer.deleteMany();

  // WhatsApp
  await prisma.whatsAppMessage.deleteMany();
  await prisma.whatsAppContact.deleteMany();
  await prisma.whatsAppTemplate.deleteMany();
  await prisma.whatsAppSettings.deleteMany();

  // Settings/Master Data
  await prisma.fabric.deleteMany();
  await prisma.fabricSize.deleteMany();
  await prisma.fabricForm.deleteMany();
  await prisma.fabricComposition.deleteMany();
  await prisma.fabricType.deleteMany();
  await prisma.knittingMachineSize.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.color.deleteMany();
  await prisma.material.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.productGroup.deleteMany();
  await prisma.group.deleteMany();
  await prisma.department.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.tenantSettings.deleteMany();
  await prisma.tenantModule.deleteMany();

  // Audit
  await prisma.auditLog.deleteMany();

  // Users & Tenants
  await prisma.tenantUser.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('All data cleared.');

  // Create default tenant
  console.log('Creating default tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Mughal Grace',
      slug: 'mughal-grace',
      schemaName: 'tenant_mughal_grace',
      ownerName: 'Admin User',
      ownerEmail: 'admin@mughalgrace.com',
      ownerPhone: '+923001234567',
      city: 'Faisalabad',
      factoryType: 'knitting',
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
    },
  });

  // Create admin user (Factory Owner)
  console.log('Creating factory owner user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);

  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      username: 'admin',
      email: 'admin@mughalgrace.com',
      hashedPassword: hashedPassword,
      fullName: 'Admin User',
      role: 'FACTORY_OWNER',
      isActive: true,
    },
  });

  // Create Super Admin user
  console.log('Creating super admin user...');
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);

  await prisma.tenantUser.create({
    data: {
      tenantId: tenant.id,
      username: 'superadmin',
      email: 'superadmin@mughalgrace.com',
      hashedPassword: superAdminPassword,
      fullName: 'Super Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
      isVerified: true,
    },
  });

  // Create default shifts
  console.log('Creating default shifts...');
  await prisma.shift.createMany({
    data: [
      { code: 'MORNING', name: 'Morning', startTime: '06:00', endTime: '14:00', isActive: true },
      { code: 'EVENING', name: 'Evening', startTime: '14:00', endTime: '22:00', isActive: true },
      { code: 'NIGHT', name: 'Night', startTime: '22:00', endTime: '06:00', isActive: true },
    ],
  });

  console.log('');
  console.log('Database seed completed successfully!');
  console.log('');
  console.log('Login credentials:');
  console.log('');
  console.log('  Factory Owner:');
  console.log('    Email: admin@mughalgrace.com');
  console.log('    Password: admin123');
  console.log('');
  console.log('  Super Admin:');
  console.log('    Email: superadmin@mughalgrace.com');
  console.log('    Password: superadmin123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
