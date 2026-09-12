/**
 * Demo data seed.
 *
 * Unlike `seed.ts`, this script NEVER deletes anything — it only adds. Every
 * insert is keyed on a unique code and skips rows that already exist, so it is
 * safe to run repeatedly against a database that already holds real work.
 *
 *   pnpm --filter @mughal-grace/api db:seed:demo
 *
 * Re-running is incremental: master data is upserted by code, and a day that
 * already has production logs is skipped wholesale, so a second run only fills
 * in days that have elapsed since the last one.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- deterministic pseudo-random -------------------------------------------
let seed = 20260910;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = <T>(items: readonly T[]): T => items[Math.floor(rnd() * items.length)];
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const dec = (min: number, max: number, places = 2) =>
  Number((min + rnd() * (max - min)).toFixed(places));

// --- dates ------------------------------------------------------------------
// Everything is built at UTC midnight. Prisma stores a `@db.Date` column from
// the UTC date part of the value, so a local-midnight Date east of Greenwich
// (e.g. 00:00 PKT = 19:00Z the day before) would silently land a day early and
// leave "today" empty.
const DAY_MS = 86_400_000;
const now = new Date();
const TODAY = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * DAY_MS);
const at = (day: Date, hour: number, minute = 0) =>
  new Date(day.getTime() + hour * 3_600_000 + minute * 60_000);

const pad = (n: number, width: number) => String(n).padStart(width, '0');

async function main() {
  console.log('Seeding demo data (additive — nothing is deleted)\n');

  // ---------------------------------------------------------------- masters
  const departments = [
    { code: 'DEPT-001', name: 'Knitting', managerName: 'Imran Sheikh' },
    { code: 'DEPT-002', name: 'Dyeing', managerName: 'Nadia Rahim' },
    { code: 'DEPT-003', name: 'Finishing', managerName: 'Kashif Butt' },
  ];
  for (const d of departments) {
    await prisma.department.upsert({ where: { code: d.code }, update: {}, create: d });
  }
  const deptByName = Object.fromEntries(
    (await prisma.department.findMany()).map((d) => [d.name, d.id])
  );
  console.log(`departments        ${departments.length}`);

  const groups = [
    { code: 'GRP-001', name: 'Single Jersey', departmentId: deptByName['Knitting'] },
    { code: 'GRP-002', name: 'Rib & Interlock', departmentId: deptByName['Knitting'] },
    { code: 'GRP-003', name: 'Fleece', departmentId: deptByName['Knitting'] },
    { code: 'GRP-004', name: 'Reactive Dyed', departmentId: deptByName['Dyeing'] },
    { code: 'GRP-005', name: 'Disperse Dyed', departmentId: deptByName['Dyeing'] },
    { code: 'GRP-006', name: 'Compacted', departmentId: deptByName['Finishing'] },
  ];
  for (const g of groups) {
    await prisma.group.upsert({ where: { code: g.code }, update: {}, create: g });
  }
  const groupRows = await prisma.group.findMany();
  console.log(`groups             ${groups.length}`);

  const brands = [
    { code: 'BRD-001', name: 'Mughal Premium', city: 'Faisalabad', country: 'Pakistan' },
    { code: 'BRD-002', name: 'Grace Classic', city: 'Lahore', country: 'Pakistan' },
    { code: 'BRD-003', name: 'Shahi Knit', city: 'Karachi', country: 'Pakistan' },
    { code: 'BRD-004', name: 'Indus Textile', city: 'Multan', country: 'Pakistan' },
    { code: 'BRD-005', name: 'Ravi Mills', city: 'Faisalabad', country: 'Pakistan' },
  ];
  for (const b of brands) {
    await prisma.brand.upsert({ where: { code: b.code }, update: {}, create: b });
  }
  const brandRows = await prisma.brand.findMany();
  console.log(`brands             ${brands.length}`);

  const colors = [
    { code: 'CLR-001', name: 'Optical White', hexCode: '#F8F8FF' },
    { code: 'CLR-002', name: 'Jet Black', hexCode: '#0B0B0B' },
    { code: 'CLR-003', name: 'Navy Blue', hexCode: '#1B2A49' },
    { code: 'CLR-004', name: 'Charcoal Grey', hexCode: '#4A4A4A' },
    { code: 'CLR-005', name: 'Maroon', hexCode: '#7B1F2B' },
    { code: 'CLR-006', name: 'Bottle Green', hexCode: '#12503C' },
    { code: 'CLR-007', name: 'Mustard', hexCode: '#D4A017' },
    { code: 'CLR-008', name: 'Sky Blue', hexCode: '#6FB3D9' },
    { code: 'CLR-009', name: 'Beige', hexCode: '#D8CBB3' },
    { code: 'CLR-010', name: 'Rust', hexCode: '#A64B2A' },
  ];
  for (const c of colors) {
    await prisma.color.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  const colorRows = await prisma.color.findMany();
  console.log(`colors             ${colors.length}`);

  const grades = [
    { code: 'GRD-A', name: 'A Grade', level: 1, description: 'First quality, no visible defects' },
    { code: 'GRD-B', name: 'B Grade', level: 2, description: 'Minor defects, saleable' },
    { code: 'GRD-C', name: 'C Grade', level: 3, description: 'Seconds / reprocess' },
  ];
  for (const g of grades) {
    await prisma.grade.upsert({ where: { code: g.code }, update: {}, create: g });
  }
  const gradeRows = await prisma.grade.findMany();
  console.log(`grades             ${grades.length}`);

  const fabricTypes = [
    { code: 'FT-001', name: 'Single Jersey' },
    { code: 'FT-002', name: 'Double Jersey' },
    { code: 'FT-003', name: '1x1 Rib' },
    { code: 'FT-004', name: 'Interlock' },
    { code: 'FT-005', name: 'Fleece' },
    { code: 'FT-006', name: 'Pique' },
  ];
  for (const f of fabricTypes) {
    await prisma.fabricType.upsert({ where: { code: f.code }, update: {}, create: f });
  }
  const fabricTypeRows = await prisma.fabricType.findMany();
  console.log(`fabric types       ${fabricTypes.length}`);

  const compositions = [
    { code: 'FC-001', name: '100% Cotton' },
    { code: 'FC-002', name: '95% Cotton / 5% Elastane' },
    { code: 'FC-003', name: '60% Cotton / 40% Polyester' },
    { code: 'FC-004', name: '100% Polyester' },
    { code: 'FC-005', name: '50/50 Cotton/Polyester' },
    { code: 'FC-006', name: '65% Polyester / 35% Viscose' },
  ];
  for (const c of compositions) {
    await prisma.fabricComposition.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  const compositionRows = await prisma.fabricComposition.findMany();
  console.log(`compositions       ${compositions.length}`);

  const materials = [
    { code: 'MAT-001', name: '30/1 Combed Cotton', grade: 'AAA' },
    { code: 'MAT-002', name: '20/1 Carded Cotton', grade: 'AA' },
    { code: 'MAT-003', name: '150/48/2 FD Polyester', grade: 'A' },
    { code: 'MAT-004', name: '70/24/1 RW Polyester', grade: 'AA' },
    { code: 'MAT-005', name: '40/1 Compact Cotton', grade: 'AAA' },
    { code: 'MAT-006', name: '30/1 CVC Blend', grade: 'A' },
  ];
  for (const m of materials) {
    await prisma.material.upsert({ where: { code: m.code }, update: {}, create: m });
  }
  const materialRows = await prisma.material.findMany();
  console.log(`materials          ${materials.length}`);

  // --------------------------------------------------------------- machines
  const machineDefs = [
    { n: 'KM-01', name: 'Mayer & Cie MV4', brand: 'Mayer & Cie', gauge: 24, diameter: 30, feeders: 96, status: 'OPERATIONAL' },
    { n: 'KM-02', name: 'Mayer & Cie MV4', brand: 'Mayer & Cie', gauge: 24, diameter: 30, feeders: 96, status: 'OPERATIONAL' },
    { n: 'KM-03', name: 'Terrot S296', brand: 'Terrot', gauge: 28, diameter: 34, feeders: 102, status: 'OPERATIONAL' },
    { n: 'KM-04', name: 'Terrot S296', brand: 'Terrot', gauge: 28, diameter: 34, feeders: 102, status: 'OPERATIONAL' },
    { n: 'KM-05', name: 'Fukuhara V-XC4', brand: 'Fukuhara', gauge: 20, diameter: 26, feeders: 72, status: 'OPERATIONAL' },
    { n: 'KM-06', name: 'Fukuhara V-XC4', brand: 'Fukuhara', gauge: 20, diameter: 26, feeders: 72, status: 'MAINTENANCE' },
    { n: 'KM-07', name: 'Pailung PL-XS3', brand: 'Pailung', gauge: 24, diameter: 32, feeders: 90, status: 'OPERATIONAL' },
    { n: 'KM-08', name: 'Pailung PL-XS3', brand: 'Pailung', gauge: 24, diameter: 32, feeders: 90, status: 'OPERATIONAL' },
    { n: 'KM-09', name: 'Orizio JCF', brand: 'Orizio', gauge: 18, diameter: 30, feeders: 60, status: 'IDLE' },
    { n: 'KM-10', name: 'Orizio JCF', brand: 'Orizio', gauge: 18, diameter: 30, feeders: 60, status: 'OPERATIONAL' },
    { n: 'KM-11', name: 'Mayer & Cie Relanit', brand: 'Mayer & Cie', gauge: 28, diameter: 34, feeders: 108, status: 'OPERATIONAL' },
    { n: 'KM-12', name: 'Mayer & Cie Relanit', brand: 'Mayer & Cie', gauge: 28, diameter: 34, feeders: 108, status: 'BREAKDOWN' },
    { n: 'KM-13', name: 'Terrot UCC572', brand: 'Terrot', gauge: 24, diameter: 30, feeders: 96, status: 'OPERATIONAL' },
    { n: 'KM-14', name: 'Terrot UCC572', brand: 'Terrot', gauge: 24, diameter: 30, feeders: 96, status: 'OPERATIONAL' },
  ] as const;

  for (const [i, m] of machineDefs.entries()) {
    await prisma.machine.upsert({
      where: { machineNumber: m.n },
      update: {},
      create: {
        machineNumber: m.n,
        name: m.name,
        brand: m.brand,
        model: m.name.split(' ').slice(-1)[0],
        machineType: 'CIRCULAR_KNITTING',
        gauge: m.gauge,
        diameter: m.diameter,
        feeders: m.feeders,
        location: i < 7 ? 'Hall A' : 'Hall B',
        position: `${i < 7 ? 'A' : 'B'}-${pad((i % 7) + 1, 2)}`,
        status: m.status,
        needleGauge: m.gauge,
        cylinderNeedles: m.gauge * m.diameter * 3,
        installationDate: daysAgo(int(400, 1800)),
        lastMaintenanceAt: daysAgo(int(5, 60)),
        nextMaintenanceAt: daysAgo(-int(10, 60)),
      },
    });
  }
  const machines = await prisma.machine.findMany({ orderBy: { machineNumber: 'asc' } });
  const runningMachines = machines.filter((m) => m.status === 'OPERATIONAL');
  console.log(`machines           ${machineDefs.length}`);

  // ---------------------------------------------------------------- fabrics
  const fabricDefs = [
    { name: '30/1 Single Jersey 180 GSM', type: 'Single Jersey', comp: '100% Cotton', gsm: 180, width: 72 },
    { name: '30/1 Single Jersey 160 GSM', type: 'Single Jersey', comp: '100% Cotton', gsm: 160, width: 68 },
    { name: '20/1 Single Jersey 220 GSM', type: 'Single Jersey', comp: '100% Cotton', gsm: 220, width: 74 },
    { name: '1x1 Rib 240 GSM', type: '1x1 Rib', comp: '95% Cotton / 5% Elastane', gsm: 240, width: 36 },
    { name: '1x1 Rib 200 GSM', type: '1x1 Rib', comp: '100% Cotton', gsm: 200, width: 34 },
    { name: 'Interlock 260 GSM', type: 'Interlock', comp: '100% Cotton', gsm: 260, width: 66 },
    { name: 'Interlock 220 GSM CVC', type: 'Interlock', comp: '60% Cotton / 40% Polyester', gsm: 220, width: 64 },
    { name: 'Fleece 320 GSM Brushed', type: 'Fleece', comp: '65% Polyester / 35% Viscose', gsm: 320, width: 70 },
    { name: 'Fleece 280 GSM', type: 'Fleece', comp: '50/50 Cotton/Polyester', gsm: 280, width: 68 },
    { name: 'Pique 200 GSM', type: 'Pique', comp: '100% Cotton', gsm: 200, width: 70 },
    { name: 'Double Jersey 300 GSM', type: 'Double Jersey', comp: '100% Polyester', gsm: 300, width: 62 },
    { name: 'Double Jersey 240 GSM', type: 'Double Jersey', comp: '60% Cotton / 40% Polyester', gsm: 240, width: 60 },
  ];

  for (const [i, f] of fabricDefs.entries()) {
    const code = `FAB${pad(i + 1, 6)}`;
    const group = pick(groupRows.filter((g) => g.departmentId === deptByName['Knitting']));
    await prisma.fabric.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: f.name,
        qrPayload: `FABRIC|${code}`,
        qrGeneratedAt: new Date(),
        departmentId: deptByName['Knitting'],
        groupId: group.id,
        materialId: pick(materialRows).id,
        brandId: pick(brandRows).id,
        colorId: pick(colorRows).id,
        machineId: pick(runningMachines).id,
        gradeId: gradeRows.find((g) => g.code === 'GRD-A')!.id,
        fabricTypeId: fabricTypeRows.find((t) => t.name === f.type)?.id,
        fabricCompositionId: compositionRows.find((c) => c.name === f.comp)?.id,
        type: f.type,
        composition: f.comp,
        gsm: f.gsm,
        width: f.width,
        widthUnit: 'inch',
        isTube: f.width < 40,
        currentStock: dec(200, 4000, 3),
        sortOrder: i,
      },
    });
  }
  const fabrics = await prisma.fabric.findMany({ orderBy: { code: 'asc' } });
  console.log(`fabrics            ${fabricDefs.length}`);

  // --------------------------------------------------------------- vendors
  const yarnVendors = [
    { code: 'YV-001', name: 'Sitara Spinning Mills', contactPerson: 'Adnan Qureshi', phone: '+92 300 8451120', city: 'Faisalabad', creditLimit: 8_000_000, rating: 5 },
    { code: 'YV-002', name: 'Nishat Yarn Traders', contactPerson: 'Bilal Anwar', phone: '+92 321 4470913', city: 'Lahore', creditLimit: 5_000_000, rating: 4 },
    { code: 'YV-003', name: 'Crescent Fibres', contactPerson: 'Sana Iqbal', phone: '+92 333 2298764', city: 'Karachi', creditLimit: 6_500_000, rating: 4 },
    { code: 'YV-004', name: 'Ravi Cotton Supply', contactPerson: 'Tariq Mehmood', phone: '+92 301 7739812', city: 'Multan', creditLimit: 3_000_000, rating: 3 },
  ];
  for (const v of yarnVendors) {
    await prisma.yarnVendor.upsert({ where: { code: v.code }, update: {}, create: v });
  }
  console.log(`yarn vendors       ${yarnVendors.length}`);

  const dyeingVendors = [
    { code: 'DV-001', name: 'Alkaram Dyeing House', contactPerson: 'Rizwan Ali', phone: '+92 300 2214498', city: 'Faisalabad', averageTurnaroundDays: 7, qualityRating: 4.6, paymentTerms: 45 },
    { code: 'DV-002', name: 'Chenab Processing', contactPerson: 'Hina Malik', phone: '+92 322 6640173', city: 'Faisalabad', averageTurnaroundDays: 10, qualityRating: 4.1, paymentTerms: 30 },
    { code: 'DV-003', name: 'Sapphire Finishing', contactPerson: 'Usman Zafar', phone: '+92 345 9081266', city: 'Lahore', averageTurnaroundDays: 6, qualityRating: 4.8, paymentTerms: 60 },
  ];
  for (const v of dyeingVendors) {
    await prisma.dyeingVendor.upsert({ where: { code: v.code }, update: {}, create: v });
  }
  console.log(`dyeing vendors     ${dyeingVendors.length}`);

  // -------------------------------------------------------------- customers
  const customerDefs = [
    { code: 'CUS-001', name: 'Gul Ahmed Apparel', city: 'Karachi', type: 'WHOLESALE', credit: 12_000_000 },
    { code: 'CUS-002', name: 'Khaadi Sourcing', city: 'Karachi', type: 'WHOLESALE', credit: 9_000_000 },
    { code: 'CUS-003', name: 'Outfitters Ltd', city: 'Lahore', type: 'REGULAR', credit: 5_500_000 },
    { code: 'CUS-004', name: 'Breakout Garments', city: 'Lahore', type: 'REGULAR', credit: 4_000_000 },
    { code: 'CUS-005', name: 'Ideas by Gul Ahmed', city: 'Karachi', type: 'RETAIL', credit: 2_500_000 },
    { code: 'CUS-006', name: 'Almirah Textiles', city: 'Faisalabad', type: 'REGULAR', credit: 3_800_000 },
    { code: 'CUS-007', name: 'Levis Pakistan Sourcing', city: 'Lahore', type: 'EXPORT', credit: 20_000_000 },
    { code: 'CUS-008', name: 'Bonanza Satrangi', city: 'Karachi', type: 'WHOLESALE', credit: 7_200_000 },
    { code: 'CUS-009', name: 'Sapphire Retail', city: 'Lahore', type: 'RETAIL', credit: 6_000_000 },
    { code: 'CUS-010', name: 'Al-Karam Exports', city: 'Sialkot', type: 'EXPORT', credit: 15_000_000 },
  ] as const;

  for (const c of customerDefs) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: {},
      create: {
        code: c.code,
        name: c.name,
        businessName: `${c.name} (Pvt) Ltd`,
        contactPerson: pick(['Faisal Nadeem', 'Ayesha Siddiqui', 'Omar Farooq', 'Zainab Haider', 'Shahid Aslam']),
        phone: `+92 3${int(0, 4)}${int(0, 9)} ${int(1000000, 9999999)}`,
        email: `orders@${c.name.toLowerCase().replace(/[^a-z]+/g, '')}.com.pk`,
        city: c.city,
        ntn: `${int(1000000, 9999999)}-${int(1, 9)}`,
        creditLimit: c.credit,
        paymentTerms: pick([30, 45, 60]),
        customerType: c.type,
      },
    });
  }
  const customers = await prisma.customer.findMany({ orderBy: { code: 'asc' } });
  console.log(`customers          ${customerDefs.length}`);

  // ------------------------------------------------------- production logs
  const shifts = await prisma.shift.findMany({ orderBy: { id: 'asc' } });
  const PRODUCTION_DAYS = 21;
  let logsCreated = 0;

  for (let dayOffset = PRODUCTION_DAYS - 1; dayOffset >= 0; dayOffset--) {
    const day = daysAgo(dayOffset);
    if (day.getUTCDay() === 0) continue; // Sunday off

    // Skip the whole day if it already has production. A per-(machine, shift)
    // check is not enough: the shift lottery below lands on different
    // combinations each run, so an already-seeded day would keep accreting new
    // logs on every invocation.
    const dayAlreadySeeded = await prisma.productionLog.findFirst({
      where: { productionDate: day },
      select: { id: true },
    });
    if (dayAlreadySeeded) continue;

    for (const machine of runningMachines) {
      // Not every machine runs every shift.
      for (const shift of shifts) {
        if (rnd() > 0.62) continue;

        const fabric = pick(fabrics);
        const actual = dec(180, 480, 3);
        const target = Number((actual * dec(0.9, 1.15, 3)).toFixed(3));
        const startHour = Number(shift.startTime.split(':')[0]);

        await prisma.productionLog.create({
          data: {
            machineId: machine.id,
            shiftId: shift.id,
            productionDate: day,
            fabricType: fabric.name,
            targetWeight: target,
            actualWeight: actual,
            rollsProduced: int(4, 12),
            efficiency: dec(72, 98),
            defectCount: int(0, 4),
            startTime: at(day, startHour),
            endTime: at(day, (startHour + 8) % 24),
            totalHours: 8,
            notes: rnd() > 0.85 ? pick(['Yarn breakage on feeder 14', 'Slow start after lubrication', 'Operator changeover mid-shift']) : null,
          },
        });
        logsCreated++;
      }
    }
  }
  const totalLogs = await prisma.productionLog.count();
  console.log(`production logs    ${logsCreated} new (${totalLogs} total)`);

  // ------------------------------------------------------------------ rolls
  const rollStatuses = [
    'GREY_STOCK', 'GREY_STOCK', 'GREY_STOCK',
    'SENT_FOR_DYEING', 'AT_DYEING', 'DYEING_COMPLETE',
    'FINISHED_STOCK', 'FINISHED_STOCK', 'SOLD',
  ] as const;

  // Only logs that have no rolls yet. Roll numbers are generated from a running
  // counter, so revisiting a log that already has rolls would mint a fresh batch
  // under new numbers instead of colliding and being skipped.
  const logsAwaitingRolls = await prisma.productionLog.findMany({
    where: { rolls: { none: {} } },
    orderBy: { id: 'asc' },
  });

  const rollData = [];
  let rollSeq = await prisma.roll.count();
  for (const log of logsAwaitingRolls) {
    for (let r = 0; r < log.rollsProduced; r++) {
      rollSeq++;
      const number = `R${pad(rollSeq, 6)}`;
      const fabric = fabrics.find((f) => f.name === log.fabricType) ?? pick(fabrics);
      const status = pick(rollStatuses);
      const grey = dec(18, 42, 3);
      rollData.push({
        rollNumber: number,
        qrCode: `ROLL|${number}`,
        productionLogId: log.id,
        machineId: log.machineId,
        fabricType: log.fabricType,
        fabricId: fabric.id,
        width: fabric.width,
        gsm: fabric.gsm ? Number(fabric.gsm) : null,
        greyWeight: grey,
        finishedWeight: status === 'FINISHED_STOCK' || status === 'SOLD' ? Number((grey * dec(0.93, 0.99, 3)).toFixed(3)) : null,
        greyLength: dec(40, 110),
        grade: pick(['A', 'A', 'A', 'B', 'B', 'C']),
        status,
        colorId: status === 'GREY_STOCK' || status === 'SENT_FOR_DYEING' ? null : pick(colorRows).id,
        currentLocation: status === 'AT_DYEING' ? pick(dyeingVendors).name : pick(['Hall A Rack 1', 'Hall A Rack 2', 'Hall B Rack 1', 'Grey Store', 'Finished Store']),
        producedAt: at(log.productionDate, int(7, 21), int(0, 59)),
      });
    }
  }
  const rollsInserted = await prisma.roll.createMany({ data: rollData, skipDuplicates: true });
  console.log(`rolls              ${rollsInserted.count} new`);

  // --------------------------------------------------- grey stock summary
  const greySummaries = [];
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const day = daysAgo(dayOffset);
    for (const type of ['Single Jersey', 'Interlock', 'Fleece', '1x1 Rib']) {
      const openingRolls = int(40, 160);
      const producedRolls = int(8, 30);
      const sentRolls = int(5, 25);
      const openingWeight = dec(openingRolls * 22, openingRolls * 30, 3);
      const producedWeight = dec(producedRolls * 22, producedRolls * 30, 3);
      const sentWeight = dec(sentRolls * 22, sentRolls * 30, 3);
      greySummaries.push({
        fabricType: type,
        recordDate: day,
        openingRolls,
        openingWeight,
        producedRolls,
        producedWeight,
        sentForDyeing: sentRolls,
        sentWeight,
        closingRolls: openingRolls + producedRolls - sentRolls,
        closingWeight: Number((openingWeight + producedWeight - sentWeight).toFixed(3)),
      });
    }
  }
  const greyInserted = await prisma.greyStockSummary.createMany({ data: greySummaries, skipDuplicates: true });
  console.log(`grey stock rows    ${greyInserted.count} new`);

  // ----------------------------------------------------------- sales orders
  const soldRolls = await prisma.roll.findMany({ where: { status: 'SOLD' }, take: 120 });
  let soldCursor = 0;
  let ordersCreated = 0;

  for (let i = 1; i <= 18; i++) {
    const orderNumber = `SO-2026-${pad(i, 4)}`;
    const existing = await prisma.salesOrder.findUnique({ where: { orderNumber }, select: { id: true } });
    if (existing) continue;

    const customer = pick(customers);
    const orderDate = daysAgo(int(1, 45));
    const items = [];
    for (let n = 0; n < int(2, 5); n++) {
      const roll = soldRolls[soldCursor++ % Math.max(soldRolls.length, 1)];
      const weight = roll ? Number(roll.finishedWeight ?? roll.greyWeight) : dec(20, 40, 3);
      const rate = dec(620, 980);
      items.push({
        rollId: roll?.id ?? null,
        fabricType: roll?.fabricType ?? pick(fabrics).name,
        color: pick(colorRows).name,
        weight,
        length: dec(40, 110),
        ratePerKg: rate,
        amount: Number((weight * rate).toFixed(2)),
      });
    }

    const subtotal = Number(items.reduce((s, it) => s + it.amount, 0).toFixed(2));
    const discount = Number((subtotal * dec(0, 0.05, 4)).toFixed(2));
    const taxAmount = Number(((subtotal - discount) * 0.18).toFixed(2));
    const totalAmount = Number((subtotal - discount + taxAmount).toFixed(2));
    const paymentStatus = pick(['UNPAID', 'PARTIAL', 'PAID', 'PAID', 'OVERDUE'] as const);
    const paidAmount =
      paymentStatus === 'PAID' ? totalAmount
      : paymentStatus === 'PARTIAL' ? Number((totalAmount * dec(0.2, 0.7, 3)).toFixed(2))
      : 0;

    await prisma.salesOrder.create({
      data: {
        orderNumber,
        customerId: customer.id,
        orderDate,
        deliveryDate: new Date(orderDate.getTime() + int(5, 21) * 86_400_000),
        subtotal,
        discount,
        taxAmount,
        totalAmount,
        paidAmount,
        balanceAmount: Number((totalAmount - paidAmount).toFixed(2)),
        paymentStatus,
        status: pick(['CONFIRMED', 'PROCESSING', 'READY', 'DISPATCHED', 'DELIVERED'] as const),
        invoiceNumber: `INV-2026-${pad(i, 4)}`,
        invoicedAt: orderDate,
        items: { create: items },
      },
    });
    ordersCreated++;
  }
  console.log(`sales orders       ${ordersCreated} new`);

  // ----------------------------------------------------------------- HR
  const designationDefs = [
    { code: 'DSG-001', name: 'Knitting Operator', nameUrdu: 'نٹنگ آپریٹر', department: 'Knitting', baseSalary: 45000, level: 1 },
    { code: 'DSG-002', name: 'Senior Knitting Operator', nameUrdu: 'سینئر نٹنگ آپریٹر', department: 'Knitting', baseSalary: 58000, level: 2 },
    { code: 'DSG-003', name: 'Shift Supervisor', nameUrdu: 'شفٹ سپروائزر', department: 'Knitting', baseSalary: 85000, level: 3 },
    { code: 'DSG-004', name: 'Quality Inspector', nameUrdu: 'کوالٹی انسپکٹر', department: 'Finishing', baseSalary: 52000, level: 2 },
    { code: 'DSG-005', name: 'Machine Mechanic', nameUrdu: 'مشین مکینک', department: 'Maintenance', baseSalary: 65000, level: 2 },
    { code: 'DSG-006', name: 'Store Keeper', nameUrdu: 'اسٹور کیپر', department: 'Store', baseSalary: 48000, level: 2 },
    { code: 'DSG-007', name: 'Production Manager', nameUrdu: 'پروڈکشن مینیجر', department: 'Knitting', baseSalary: 150000, level: 5 },
    { code: 'DSG-008', name: 'Accounts Officer', nameUrdu: 'اکاؤنٹس آفیسر', department: 'Finance', baseSalary: 70000, level: 3 },
    { code: 'DSG-009', name: 'Helper', nameUrdu: 'ہیلپر', department: 'Knitting', baseSalary: 32000, level: 1 },
    { code: 'DSG-010', name: 'Dyeing Coordinator', nameUrdu: 'ڈائینگ کوآرڈینیٹر', department: 'Dyeing', baseSalary: 62000, level: 3 },
  ];
  for (const d of designationDefs) {
    await prisma.designation.upsert({ where: { code: d.code }, update: {}, create: d });
  }
  const designations = await prisma.designation.findMany({ orderBy: { code: 'asc' } });
  console.log(`designations       ${designationDefs.length}`);

  const firstNames = ['Muhammad', 'Ali', 'Ahmed', 'Usman', 'Bilal', 'Hamza', 'Fahad', 'Kashif', 'Imran', 'Zeeshan', 'Adnan', 'Waqar', 'Saad', 'Noman', 'Tariq', 'Rashid', 'Junaid', 'Salman', 'Asad', 'Danish', 'Farhan', 'Shoaib', 'Yasir', 'Nadeem', 'Arslan', 'Ayesha', 'Fatima', 'Sana', 'Hina', 'Maryam'];
  const lastNames = ['Aslam', 'Khan', 'Butt', 'Sheikh', 'Malik', 'Chaudhry', 'Qureshi', 'Ansari', 'Raza', 'Iqbal', 'Hussain', 'Javed', 'Akram', 'Nawaz', 'Rafiq'];
  const cities = ['Faisalabad', 'Lahore', 'Jhang', 'Toba Tek Singh', 'Chiniot', 'Sargodha'];

  const employeeCount = 32;
  for (let i = 1; i <= employeeCount; i++) {
    const code = `EMP-${pad(i, 4)}`;
    const designation = designations[i % designations.length];
    const base = Number(designation.baseSalary ?? 45000);
    const joining = daysAgo(int(60, 2200));
    await prisma.employee.upsert({
      where: { code },
      update: {},
      create: {
        code,
        fullName: `${pick(firstNames)} ${pick(lastNames)}`,
        fatherName: `${pick(firstNames)} ${pick(lastNames)}`,
        cnic: `33${int(100, 999)}-${int(1000000, 9999999)}-${int(1, 9)}`,
        phone: `+92 3${int(0, 4)}${int(0, 9)} ${int(1000000, 9999999)}`,
        emergencyPhone: `+92 3${int(0, 4)}${int(0, 9)} ${int(1000000, 9999999)}`,
        address: `House ${int(1, 400)}, Street ${int(1, 40)}, ${pick(['Gulberg', 'Madina Town', 'Peoples Colony', 'Ghulam Muhammad Abad'])}`,
        city: pick(cities),
        designationId: designation.id,
        department: designation.department,
        joiningDate: joining,
        confirmationDate: new Date(joining.getTime() + 90 * 86_400_000),
        salaryType: designation.level >= 3 ? 'MONTHLY' : pick(['MONTHLY', 'MONTHLY', 'DAILY'] as const),
        baseSalary: base,
        dailyRate: Number((base / 26).toFixed(2)),
        hourlyRate: Number((base / 26 / 8).toFixed(2)),
        overtimeRate: Number(((base / 26 / 8) * 1.5).toFixed(2)),
        bankName: pick(['Meezan Bank', 'HBL', 'UBL', 'Bank Alfalah', 'Allied Bank']),
        bankAccountNo: `PK${int(10, 99)}MEZN${int(10000000, 99999999)}${int(1000, 9999)}`,
        status: i % 17 === 0 ? 'ON_LEAVE' : i % 23 === 0 ? 'PROBATION' : 'ACTIVE',
      },
    });
  }
  const employees = await prisma.employee.findMany({ orderBy: { code: 'asc' } });
  console.log(`employees          ${employeeCount}`);

  const leaveTypes = [
    { code: 'LV-CAS', name: 'Casual Leave', nameUrdu: 'اتفاقی چھٹی', annualAllowance: 10, isPaid: true },
    { code: 'LV-SICK', name: 'Sick Leave', nameUrdu: 'بیماری کی چھٹی', annualAllowance: 8, isPaid: true },
    { code: 'LV-ANN', name: 'Annual Leave', nameUrdu: 'سالانہ چھٹی', annualAllowance: 14, isPaid: true },
    { code: 'LV-UNP', name: 'Unpaid Leave', nameUrdu: 'بلا معاوضہ چھٹی', annualAllowance: 0, isPaid: false },
    { code: 'LV-HAJJ', name: 'Hajj Leave', nameUrdu: 'حج کی چھٹی', annualAllowance: 30, isPaid: false },
  ];
  for (const t of leaveTypes) {
    await prisma.leaveType.upsert({ where: { code: t.code }, update: {}, create: t });
  }
  const leaveTypeRows = await prisma.leaveType.findMany();
  console.log(`leave types        ${leaveTypes.length}`);

  // Attendance for the last 30 days.
  const attendanceRows = [];
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const day = daysAgo(dayOffset);
    const sunday = day.getUTCDay() === 0;
    for (const emp of employees) {
      if (sunday) {
        attendanceRows.push({ employeeId: emp.id, date: day, status: 'HOLIDAY' as const, hoursWorked: 0 });
        continue;
      }
      const roll = rnd();
      if (roll > 0.94) {
        attendanceRows.push({ employeeId: emp.id, date: day, status: 'ABSENT' as const, hoursWorked: 0 });
      } else if (roll > 0.90) {
        attendanceRows.push({ employeeId: emp.id, date: day, status: 'LEAVE' as const, hoursWorked: 0 });
      } else {
        const late = roll > 0.82;
        const checkIn = at(day, 8, late ? int(20, 55) : int(0, 12));
        const overtime = rnd() > 0.78 ? dec(1, 3, 1) : 0;
        const hours = Number((8 + overtime).toFixed(2));
        attendanceRows.push({
          employeeId: emp.id,
          date: day,
          checkIn,
          checkOut: new Date(checkIn.getTime() + (hours + 1) * 3_600_000),
          breakMinutes: 60,
          hoursWorked: hours,
          overtimeHours: overtime,
          status: late ? ('LATE' as const) : ('PRESENT' as const),
        });
      }
    }
  }
  const attendanceInserted = await prisma.attendance.createMany({ data: attendanceRows, skipDuplicates: true });
  console.log(`attendance         ${attendanceInserted.count} new`);

  // A handful of leave requests.
  let leavesCreated = 0;
  for (const emp of employees.slice(0, 14)) {
    const already = await prisma.leave.findFirst({ where: { employeeId: emp.id }, select: { id: true } });
    if (already) continue;
    const start = daysAgo(int(-20, 40));
    const days = int(1, 5);
    await prisma.leave.create({
      data: {
        employeeId: emp.id,
        leaveTypeId: pick(leaveTypeRows).id,
        startDate: start,
        endDate: new Date(start.getTime() + (days - 1) * 86_400_000),
        days,
        reason: pick(['Family function', 'Medical appointment', 'Village visit', 'Personal work', 'Child illness']),
        status: pick(['PENDING', 'APPROVED', 'APPROVED', 'REJECTED'] as const),
      },
    });
    leavesCreated++;
  }
  console.log(`leaves             ${leavesCreated} new`);

  // Payroll for the two previous months.
  const salaryRows = [];
  for (const offset of [1, 2]) {
    const ref = new Date(TODAY.getFullYear(), TODAY.getMonth() - offset, 1);
    const month = ref.getMonth() + 1;
    const year = ref.getFullYear();
    for (const emp of employees) {
      const base = Number(emp.baseSalary);
      const presentDays = int(22, 26);
      const absentDays = int(0, 2);
      const leaveDays = int(0, 2);
      const overtimeHours = dec(0, 24, 1);
      const overtimeAmount = Number((overtimeHours * Number(emp.overtimeRate ?? 0)).toFixed(2));
      const allowances = Number((base * 0.1).toFixed(2));
      const bonus = rnd() > 0.8 ? Number((base * 0.05).toFixed(2)) : 0;
      const grossSalary = Number((base + overtimeAmount + allowances + bonus).toFixed(2));
      const eobi = 370;
      const advances = rnd() > 0.75 ? int(2000, 12000) : 0;
      const totalDeductions = Number((eobi + advances).toFixed(2));
      salaryRows.push({
        employeeId: emp.id,
        month,
        year,
        baseSalary: base,
        overtimeAmount,
        allowances,
        bonus,
        grossSalary,
        advances,
        eobi,
        totalDeductions,
        netSalary: Number((grossSalary - totalDeductions).toFixed(2)),
        workingDays: 26,
        presentDays,
        absentDays,
        leaveDays,
        overtimeHours,
        status: offset === 1 ? ('APPROVED' as const) : ('PAID' as const),
        paymentMethod: 'BANK_TRANSFER',
        paidAt: offset === 2 ? new Date(year, month, 3) : null,
      });
    }
  }
  const salariesInserted = await prisma.salary.createMany({ data: salaryRows, skipDuplicates: true });
  console.log(`salaries           ${salariesInserted.count} new`);

  console.log('\nDemo data seed complete.');
}

main()
  .catch((e) => {
    console.error('Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
