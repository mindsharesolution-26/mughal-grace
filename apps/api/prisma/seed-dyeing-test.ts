import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding test data for dyeing, customers, and vendors...');

  // ============ CUSTOMERS ============
  console.log('\n--- Creating Customers ---');
  const customers = [
    {
      code: 'CUST-001',
      name: 'Fashion House Pvt Ltd',
      contactPerson: 'Ahmed Raza',
      phone: '0321-1111111',
      email: 'ahmed@fashionhouse.pk',
      city: 'Karachi',
      address: '123 Main Boulevard, DHA Phase 5',
      creditLimit: 500000,
      paymentTerms: 30, // Days
    },
    {
      code: 'CUST-002',
      name: 'Textile Traders',
      contactPerson: 'Bilal Khan',
      phone: '0333-2222222',
      email: 'bilal@textiletraders.pk',
      city: 'Lahore',
      address: '45 Mall Road',
      creditLimit: 300000,
      paymentTerms: 15,
    },
    {
      code: 'CUST-003',
      name: 'Global Garments',
      contactPerson: 'Usman Ali',
      phone: '0300-3333333',
      email: 'usman@globalgarments.pk',
      city: 'Faisalabad',
      address: '78 Susan Road',
      creditLimit: 750000,
      paymentTerms: 45,
    },
    {
      code: 'CUST-004',
      name: 'Premium Exports',
      contactPerson: 'Hassan Sheikh',
      phone: '0345-4444444',
      email: 'hassan@premiumexports.pk',
      city: 'Sialkot',
      address: '12 Industrial Area',
      creditLimit: 1000000,
      paymentTerms: 30,
    },
    {
      code: 'CUST-005',
      name: 'City Cloth House',
      contactPerson: 'Waqar Hussain',
      phone: '0312-5555555',
      email: 'waqar@citycloth.pk',
      city: 'Multan',
      address: '56 Bosan Road',
      creditLimit: 200000,
      paymentTerms: 0, // Cash
    },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { code: customer.code },
      update: {},
      create: customer,
    });
  }
  console.log(`Created/verified ${customers.length} customers`);

  // ============ YARN VENDORS ============
  console.log('\n--- Creating Yarn Vendors ---');
  const yarnVendors = [
    {
      code: 'YV-001',
      name: 'Ideal Spinning Mills',
      contactPerson: 'Rahim Butt',
      phone: '0321-6666666',
      email: 'rahim@idealspinning.pk',
      city: 'Faisalabad',
      address: '100 Jaranwala Road',
      paymentTerms: 30, // Days
      creditLimit: 2000000,
    },
    {
      code: 'YV-002',
      name: 'Pakistan Yarn Corporation',
      contactPerson: 'Saleem Ahmed',
      phone: '0333-7777777',
      email: 'saleem@pakcorp.pk',
      city: 'Lahore',
      address: '25 Industrial Estate',
      paymentTerms: 45,
      creditLimit: 3000000,
    },
    {
      code: 'YV-003',
      name: 'Quality Threads Ltd',
      contactPerson: 'Farhan Malik',
      phone: '0300-8888888',
      email: 'farhan@qualitythreads.pk',
      city: 'Karachi',
      address: '88 SITE Area',
      paymentTerms: 15,
      creditLimit: 1500000,
    },
  ];

  for (const vendor of yarnVendors) {
    await prisma.yarnVendor.upsert({
      where: { code: vendor.code },
      update: {},
      create: vendor,
    });
  }
  console.log(`Created/verified ${yarnVendors.length} yarn vendors`);

  // ============ GENERAL SUPPLIERS ============
  console.log('\n--- Creating General Suppliers ---');
  const generalSuppliers = [
    {
      code: 'GS-001',
      name: 'Office Supplies Co',
      contactPerson: 'Ali Raza',
      phone: '0321-9999999',
      email: 'ali@officesupplies.pk',
      city: 'Lahore',
      address: '10 Liberty Market',
      supplierType: 'Office Supplies',
    },
    {
      code: 'GS-002',
      name: 'Machine Parts Hub',
      contactPerson: 'Kamran Shah',
      phone: '0333-1010101',
      email: 'kamran@machinehub.pk',
      city: 'Faisalabad',
      address: '55 Factory Area',
      supplierType: 'Machine Parts',
    },
    {
      code: 'GS-003',
      name: 'Packaging Solutions',
      contactPerson: 'Nadeem Khan',
      phone: '0300-1212121',
      email: 'nadeem@packagingsolutions.pk',
      city: 'Karachi',
      address: '77 Korangi Industrial',
      supplierType: 'Packaging',
    },
  ];

  for (const supplier of generalSuppliers) {
    await prisma.generalSupplier.upsert({
      where: { code: supplier.code },
      update: {},
      create: supplier,
    });
  }
  console.log(`Created/verified ${generalSuppliers.length} general suppliers`);

  // ============ DYEING DATA ============
  console.log('\n--- Creating Dyeing Test Data ---');

  // 1. Create Colors if not exist
  console.log('Creating colors...');
  const colors = [
    { code: 'CLR-001', name: 'Navy Blue', hexCode: '#000080' },
    { code: 'CLR-002', name: 'Black', hexCode: '#000000' },
    { code: 'CLR-003', name: 'White', hexCode: '#FFFFFF' },
    { code: 'CLR-004', name: 'Red', hexCode: '#FF0000' },
    { code: 'CLR-005', name: 'Grey', hexCode: '#808080' },
    { code: 'CLR-006', name: 'Maroon', hexCode: '#800000' },
    { code: 'CLR-007', name: 'Olive Green', hexCode: '#556B2F' },
    { code: 'CLR-008', name: 'Royal Blue', hexCode: '#4169E1' },
  ];

  for (const color of colors) {
    await prisma.color.upsert({
      where: { code: color.code },
      update: {},
      create: color,
    });
  }
  console.log(`Created/verified ${colors.length} colors`);

  // 2. Create Dyeing Vendors if not exist
  console.log('Creating dyeing vendors...');
  const vendors = [
    {
      code: 'DV-001',
      name: 'Ali Dyeing Mills',
      contactPerson: 'Ali Hassan',
      phone: '0321-1234567',
      city: 'Faisalabad',
      averageTurnaroundDays: 7,
      qualityRating: 4.5,
      paymentTerms: 30,
    },
    {
      code: 'DV-002',
      name: 'Bismillah Dyeing',
      contactPerson: 'Muhammad Tariq',
      phone: '0333-9876543',
      city: 'Lahore',
      averageTurnaroundDays: 5,
      qualityRating: 4.2,
      paymentTerms: 15,
    },
    {
      code: 'DV-003',
      name: 'Premium Color House',
      contactPerson: 'Imran Khan',
      phone: '0300-5555555',
      city: 'Faisalabad',
      averageTurnaroundDays: 10,
      qualityRating: 4.8,
      paymentTerms: 45,
    },
  ];

  for (const vendor of vendors) {
    await prisma.dyeingVendor.upsert({
      where: { code: vendor.code },
      update: {},
      create: vendor,
    });
  }
  console.log(`Created/verified ${vendors.length} dyeing vendors`);

  // 3. Get or create a machine
  let machine = await prisma.machine.findFirst();
  if (!machine) {
    console.log('Creating a test machine...');
    machine = await prisma.machine.create({
      data: {
        machineNumber: 'M-001',
        name: 'Knitting Machine 1',
        type: 'CIRCULAR',
        status: 'ACTIVE',
        diameter: 30,
        gauge: 24,
      },
    });
  }
  console.log(`Using machine: ${machine.machineNumber}`);

  // 4. Create Rolls in GREY_STOCK status
  console.log('Creating grey stock rolls...');
  const rollsToCreate = [
    { rollNumber: 'ROLL-TEST-001', fabricType: 'Single Jersey', greyWeight: 25.5 },
    { rollNumber: 'ROLL-TEST-002', fabricType: 'Single Jersey', greyWeight: 28.0 },
    { rollNumber: 'ROLL-TEST-003', fabricType: 'Rib 1x1', greyWeight: 22.3 },
    { rollNumber: 'ROLL-TEST-004', fabricType: 'Rib 1x1', greyWeight: 24.8 },
    { rollNumber: 'ROLL-TEST-005', fabricType: 'Interlock', greyWeight: 30.2 },
    { rollNumber: 'ROLL-TEST-006', fabricType: 'Interlock', greyWeight: 27.5 },
    { rollNumber: 'ROLL-TEST-007', fabricType: 'Fleece', greyWeight: 35.0 },
    { rollNumber: 'ROLL-TEST-008', fabricType: 'Fleece', greyWeight: 32.8 },
  ];

  const createdRolls = [];
  for (const rollData of rollsToCreate) {
    const existingRoll = await prisma.roll.findUnique({
      where: { rollNumber: rollData.rollNumber },
    });

    if (!existingRoll) {
      const roll = await prisma.roll.create({
        data: {
          ...rollData,
          machineId: machine.id,
          status: 'GREY_STOCK',
          grade: 'A',
          producedAt: new Date(),
        },
      });
      createdRolls.push(roll);
    } else {
      createdRolls.push(existingRoll);
    }
  }
  console.log(`Created/verified ${createdRolls.length} rolls`);

  // 5. Get dyeing vendor
  const dyeingVendor = await prisma.dyeingVendor.findFirst();
  if (!dyeingVendor) {
    console.log('No dyeing vendor found!');
    return;
  }

  // 6. Create Dyeing Orders with rolls
  console.log('Creating dyeing orders...');

  // Get rolls that are in GREY_STOCK (not already sent)
  const availableRolls = await prisma.roll.findMany({
    where: { status: 'GREY_STOCK' },
    take: 6,
  });

  if (availableRolls.length < 2) {
    console.log('Not enough rolls in GREY_STOCK to create dyeing orders');
    return;
  }

  // Create Order 1 - SENT status (2 rolls)
  const order1Rolls = availableRolls.slice(0, 2);
  const order1Weight = order1Rolls.reduce((sum, r) => sum + Number(r.greyWeight), 0);

  const existingOrder1 = await prisma.dyeingOrder.findFirst({
    where: { orderNumber: 'DYE-TEST-001' },
  });

  if (!existingOrder1) {
    const order1 = await prisma.dyeingOrder.create({
      data: {
        orderNumber: 'DYE-TEST-001',
        vendorId: dyeingVendor.id,
        colorCode: 'CLR-001',
        colorName: 'Navy Blue',
        processType: 'Reactive',
        sentWeight: order1Weight,
        ratePerKg: 150,
        totalAmount: order1Weight * 150,
        sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        status: 'SENT',
        items: {
          create: order1Rolls.map((roll) => ({
            rollId: roll.id,
            sentWeight: roll.greyWeight,
          })),
        },
      },
    });

    // Update roll status
    await prisma.roll.updateMany({
      where: { id: { in: order1Rolls.map((r) => r.id) } },
      data: { status: 'SENT_FOR_DYEING' },
    });

    console.log(`Created order: ${order1.orderNumber} with ${order1Rolls.length} rolls (SENT)`);
  }

  // Create Order 2 - READY status (2 rolls)
  const order2Rolls = availableRolls.slice(2, 4);
  if (order2Rolls.length >= 2) {
    const order2Weight = order2Rolls.reduce((sum, r) => sum + Number(r.greyWeight), 0);

    const existingOrder2 = await prisma.dyeingOrder.findFirst({
      where: { orderNumber: 'DYE-TEST-002' },
    });

    if (!existingOrder2) {
      const order2 = await prisma.dyeingOrder.create({
        data: {
          orderNumber: 'DYE-TEST-002',
          vendorId: dyeingVendor.id,
          colorCode: 'CLR-002',
          colorName: 'Black',
          processType: 'Disperse',
          sentWeight: order2Weight,
          ratePerKg: 140,
          totalAmount: order2Weight * 140,
          sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          status: 'READY',
          items: {
            create: order2Rolls.map((roll) => ({
              rollId: roll.id,
              sentWeight: roll.greyWeight,
            })),
          },
        },
      });

      // Update roll status
      await prisma.roll.updateMany({
        where: { id: { in: order2Rolls.map((r) => r.id) } },
        data: { status: 'SENT_FOR_DYEING' },
      });

      console.log(`Created order: ${order2.orderNumber} with ${order2Rolls.length} rolls (READY)`);
    }
  }

  // Create Order 3 - IN_PROCESS status (2 rolls)
  const order3Rolls = availableRolls.slice(4, 6);
  if (order3Rolls.length >= 2) {
    const order3Weight = order3Rolls.reduce((sum, r) => sum + Number(r.greyWeight), 0);

    const existingOrder3 = await prisma.dyeingOrder.findFirst({
      where: { orderNumber: 'DYE-TEST-003' },
    });

    if (!existingOrder3) {
      const order3 = await prisma.dyeingOrder.create({
        data: {
          orderNumber: 'DYE-TEST-003',
          vendorId: dyeingVendor.id,
          colorCode: 'CLR-004',
          colorName: 'Red',
          processType: 'Vat',
          sentWeight: order3Weight,
          ratePerKg: 180,
          totalAmount: order3Weight * 180,
          sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          status: 'IN_PROCESS',
          items: {
            create: order3Rolls.map((roll) => ({
              rollId: roll.id,
              sentWeight: roll.greyWeight,
            })),
          },
        },
      });

      // Update roll status
      await prisma.roll.updateMany({
        where: { id: { in: order3Rolls.map((r) => r.id) } },
        data: { status: 'SENT_FOR_DYEING' },
      });

      console.log(`Created order: ${order3.orderNumber} with ${order3Rolls.length} rolls (IN_PROCESS)`);
    }
  }

  console.log('');
  console.log('==============================================');
  console.log('=== Test Data Created Successfully ===');
  console.log('==============================================');
  console.log('');
  console.log('CUSTOMERS (5):');
  console.log('  - Fashion House Pvt Ltd (CUST-001)');
  console.log('  - Textile Traders (CUST-002)');
  console.log('  - Global Garments (CUST-003)');
  console.log('  - Premium Exports (CUST-004)');
  console.log('  - City Cloth House (CUST-005)');
  console.log('');
  console.log('YARN VENDORS (3):');
  console.log('  - Ideal Spinning Mills (YV-001)');
  console.log('  - Pakistan Yarn Corporation (YV-002)');
  console.log('  - Quality Threads Ltd (YV-003)');
  console.log('');
  console.log('GENERAL SUPPLIERS (3):');
  console.log('  - Office Supplies Co (GS-001)');
  console.log('  - Machine Parts Hub (GS-002)');
  console.log('  - Packaging Solutions (GS-003)');
  console.log('');
  console.log('DYEING VENDORS (3):');
  console.log('  - Ali Dyeing Mills (DV-001)');
  console.log('  - Bismillah Dyeing (DV-002)');
  console.log('  - Premium Color House (DV-003)');
  console.log('');
  console.log('COLORS (8): Navy Blue, Black, White, Red, Grey, Maroon, Olive Green, Royal Blue');
  console.log('');
  console.log('DYEING ORDERS (3):');
  console.log('  - DYE-TEST-001 (SENT) - 2 rolls');
  console.log('  - DYE-TEST-002 (READY) - 2 rolls');
  console.log('  - DYE-TEST-003 (IN_PROCESS) - 2 rolls');
  console.log('');
  console.log('You can now test:');
  console.log('  1. /finance/customers - View customers');
  console.log('  2. /finance/vendors - View vendors');
  console.log('  3. /dyeing - View dyeing orders');
  console.log('  4. /dyeing/receive - Receive orders with color assignment');
  console.log('');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
