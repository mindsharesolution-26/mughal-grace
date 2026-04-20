import { PrismaClient } from '@prisma/client';
import { ChatIntent } from './IntentClassifier';

/**
 * Query result structure
 */
export interface QueryResult {
  success: boolean;
  data: any;
  summary?: string;
  count?: number;
  error?: string;
}

/**
 * Query Executor Service
 * Executes database queries based on chat intents
 */
class QueryExecutorClass {
  /**
   * Execute query based on intent
   */
  async execute(
    intent: ChatIntent,
    prisma: PrismaClient,
    params: Record<string, any> = {}
  ): Promise<QueryResult> {
    try {
      switch (intent) {
        // Yarn queries
        case 'yarn.stock':
          return await this.getYarnStock(prisma);
        case 'yarn.vendor':
          return await this.getYarnVendors(prisma);
        case 'yarn.consumption':
          return await this.getYarnConsumption(prisma);

        // Production queries
        case 'production.summary':
          return await this.getProductionSummary(prisma);
        case 'production.machine':
          return await this.getMachineStatus(prisma);
        case 'production.downtime':
          return await this.getDowntimeLogs(prisma);

        // Rolls queries
        case 'rolls.grey_stock':
          return await this.getGreyStock(prisma);
        case 'rolls.dyeing':
          return await this.getDyeingStatus(prisma);
        case 'rolls.finished':
          return await this.getFinishedStock(prisma);

        // Sales queries
        case 'sales.customer':
          return await this.getCustomers(prisma);
        case 'sales.balance':
          return await this.getCustomerBalances(prisma);

        // Finance queries
        case 'finance.receivables':
          return await this.getReceivables(prisma);
        case 'finance.payables':
          return await this.getPayables(prisma);
        case 'finance.cheques':
          return await this.getCheques(prisma, params);

        // Inventory queries
        case 'inventory.stock':
          return await this.getInventoryStock(prisma);
        case 'inventory.alerts':
          return await this.getInventoryAlerts(prisma);

        // Needle queries
        case 'needles.status':
          return await this.getNeedleStatus(prisma);
        case 'needles.damage':
          return await this.getNeedleDamage(prisma);

        // Non-data intents
        case 'greeting':
        case 'help':
        case 'unknown':
          return { success: true, data: null };

        default:
          return { success: false, data: null, error: 'Unknown intent' };
      }
    } catch (error: any) {
      console.error('Query execution error:', error);
      return {
        success: false,
        data: null,
        error: error.message || 'Query failed',
      };
    }
  }

  // ==================== YARN QUERIES ====================

  private async getYarnStock(prisma: PrismaClient): Promise<QueryResult> {
    // Get yarn types with their latest ledger balance
    const yarnTypes = await (prisma as any).yarnType.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        brandName: true,
        color: true,
        isActive: true,
        ledgerEntries: {
          select: {
            runningBalance: true,
          },
          orderBy: { id: 'desc' },
          take: 1,
        },
      },
      where: { isActive: true },
      orderBy: { name: 'asc' },
      take: 20,
    });

    // Process to add stock from latest ledger entry
    const yarnWithStock = yarnTypes.map((y: any) => ({
      ...y,
      currentStock: y.ledgerEntries[0]?.runningBalance || 0,
    }));

    const totalStock = yarnWithStock.reduce(
      (sum: number, y: any) => sum + Number(y.currentStock || 0),
      0
    );

    return {
      success: true,
      data: yarnWithStock,
      count: yarnWithStock.length,
      summary: `Total: ${totalStock.toLocaleString()} kg across ${yarnWithStock.length} yarn types.`,
    };
  }

  private async getYarnVendors(prisma: PrismaClient): Promise<QueryResult> {
    const vendors = await (prisma as any).yarnVendor.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        contactPerson: true,
        phone: true,
        creditLimit: true,
        isActive: true,
      },
      where: { isActive: true },
      orderBy: { name: 'asc' },
      take: 15,
    });

    return {
      success: true,
      data: vendors,
      count: vendors.length,
      summary: `${vendors.length} active yarn vendors`,
    };
  }

  private async getYarnConsumption(prisma: PrismaClient): Promise<QueryResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const consumption = await (prisma as any).yarnOutward.findMany({
      where: {
        outwardDate: { gte: today },
      },
      select: {
        id: true,
        quantity: true,
        outwardDate: true,
        yarnType: {
          select: { code: true, name: true },
        },
      },
      take: 20,
    });

    const totalConsumed = consumption.reduce(
      (sum: number, c: any) => sum + Number(c.quantity || 0),
      0
    );

    return {
      success: true,
      data: consumption,
      count: consumption.length,
      summary: `Today's consumption: ${totalConsumed.toLocaleString()} kg from ${consumption.length} transactions`,
    };
  }

  // ==================== PRODUCTION QUERIES ====================

  private async getProductionSummary(prisma: PrismaClient): Promise<QueryResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await (prisma as any).productionLog.findMany({
      where: {
        productionDate: { gte: today },
      },
      select: {
        id: true,
        machineId: true,
        shiftId: true,
        actualWeight: true,
        rollsProduced: true,
        efficiency: true,
        machine: {
          select: { machineNumber: true },
        },
      },
    });

    const totalOutput = logs.reduce(
      (sum: number, l: any) => sum + Number(l.actualWeight || 0),
      0
    );
    const totalRolls = logs.reduce(
      (sum: number, l: any) => sum + Number(l.rollsProduced || 0),
      0
    );
    const avgEfficiency =
      logs.length > 0
        ? logs.reduce((sum: number, l: any) => sum + Number(l.efficiency || 0), 0) /
          logs.length
        : 0;

    return {
      success: true,
      data: logs,
      count: logs.length,
      summary: `Today: ${totalOutput.toLocaleString()} kg output, ${totalRolls} rolls, ${avgEfficiency.toFixed(1)}% avg efficiency from ${logs.length} production logs`,
    };
  }

  private async getMachineStatus(prisma: PrismaClient): Promise<QueryResult> {
    const machines = await (prisma as any).machine.findMany({
      select: {
        id: true,
        machineNumber: true,
        name: true,
        status: true,
        machineType: true,
        lastMaintenanceAt: true,
      },
      orderBy: { machineNumber: 'asc' },
    });

    const statusCounts = machines.reduce((acc: any, m: any) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    }, {});

    return {
      success: true,
      data: machines,
      count: machines.length,
      summary: `${machines.length} machines: ${statusCounts.OPERATIONAL || 0} operational, ${statusCounts.MAINTENANCE || 0} in maintenance, ${statusCounts.BREAKDOWN || 0} breakdown`,
    };
  }

  private async getDowntimeLogs(prisma: PrismaClient): Promise<QueryResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const logs = await (prisma as any).downtimeLog.findMany({
      where: {
        startTime: { gte: today },
      },
      select: {
        id: true,
        machineId: true,
        startTime: true,
        endTime: true,
        reason: true,
        durationMinutes: true,
        machine: {
          select: { machineNumber: true },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 20,
    });

    const totalMinutes = logs.reduce(
      (sum: number, l: any) => sum + Number(l.durationMinutes || 0),
      0
    );

    return {
      success: true,
      data: logs,
      count: logs.length,
      summary: `Today: ${logs.length} downtime events, total ${totalMinutes} minutes (${(totalMinutes / 60).toFixed(1)} hours)`,
    };
  }

  // ==================== ROLLS QUERIES ====================

  private async getGreyStock(prisma: PrismaClient): Promise<QueryResult> {
    const rolls = await (prisma as any).roll.findMany({
      where: { status: 'GREY_STOCK' },
      select: {
        id: true,
        rollNumber: true,
        greyWeight: true,
        createdAt: true,
        machine: {
          select: { machineNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const totalWeight = rolls.reduce(
      (sum: number, r: any) => sum + Number(r.greyWeight || 0),
      0
    );

    return {
      success: true,
      data: rolls,
      count: rolls.length,
      summary: `${rolls.length} grey rolls in stock, total weight: ${totalWeight.toLocaleString()} kg`,
    };
  }

  private async getDyeingStatus(prisma: PrismaClient): Promise<QueryResult> {
    const orders = await (prisma as any).dyeingOrder.findMany({
      where: {
        status: { in: ['SENT', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        orderNumber: true,
        sentDate: true,
        expectedReturnDate: true,
        totalWeight: true,
        status: true,
        vendor: {
          select: { name: true },
        },
      },
      orderBy: { sentDate: 'desc' },
      take: 20,
    });

    const totalWeight = orders.reduce(
      (sum: number, o: any) => sum + Number(o.totalWeight || 0),
      0
    );

    return {
      success: true,
      data: orders,
      count: orders.length,
      summary: `${orders.length} dyeing orders in progress, ${totalWeight.toLocaleString()} kg at vendors`,
    };
  }

  private async getFinishedStock(prisma: PrismaClient): Promise<QueryResult> {
    const rolls = await (prisma as any).roll.findMany({
      where: { status: 'FINISHED_STOCK' },
      select: {
        id: true,
        rollNumber: true,
        finishedWeight: true,
        grade: true,
        color: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });

    const totalWeight = rolls.reduce(
      (sum: number, r: any) => sum + Number(r.finishedWeight || 0),
      0
    );

    return {
      success: true,
      data: rolls,
      count: rolls.length,
      summary: `${rolls.length} finished rolls ready to sell, total: ${totalWeight.toLocaleString()} kg`,
    };
  }

  // ==================== SALES QUERIES ====================

  private async getCustomers(prisma: PrismaClient): Promise<QueryResult> {
    const customers = await (prisma as any).customer.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        contactPerson: true,
        phone: true,
        creditLimit: true,
        isActive: true,
      },
      where: { isActive: true },
      orderBy: { name: 'asc' },
      take: 30,
    });

    return {
      success: true,
      data: customers,
      count: customers.length,
      summary: `${customers.length} active customers`,
    };
  }

  private async getCustomerBalances(prisma: PrismaClient): Promise<QueryResult> {
    // Get customers with their ledger entries to calculate balances
    const customers = await (prisma as any).customer.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        creditLimit: true,
        ledgerEntries: {
          select: {
            debit: true,
            credit: true,
          },
        },
      },
      where: { isActive: true },
      take: 30,
    });

    // Calculate balance for each customer
    const customersWithBalance = customers
      .map((c: any) => {
        const balance = c.ledgerEntries.reduce(
          (sum: number, e: any) => sum + Number(e.debit || 0) - Number(e.credit || 0),
          0
        );
        return { ...c, currentBalance: balance };
      })
      .filter((c: any) => c.currentBalance > 0)
      .sort((a: any, b: any) => b.currentBalance - a.currentBalance)
      .slice(0, 20);

    const totalReceivable = customersWithBalance.reduce(
      (sum: number, c: any) => sum + Number(c.currentBalance || 0),
      0
    );

    return {
      success: true,
      data: customersWithBalance,
      count: customersWithBalance.length,
      summary: `${customersWithBalance.length} customers with outstanding balance. Total receivable: Rs. ${totalReceivable.toLocaleString()}`,
    };
  }

  // ==================== FINANCE QUERIES ====================

  private async getReceivables(prisma: PrismaClient): Promise<QueryResult> {
    const receivables = await (prisma as any).customerLedgerEntry.findMany({
      where: {
        balance: { gt: 0 },
      },
      select: {
        id: true,
        entryDate: true,
        debit: true,
        credit: true,
        balance: true,
        description: true,
        customer: {
          select: { code: true, name: true },
        },
      },
      orderBy: { balance: 'desc' },
      take: 30,
    });

    const totalReceivable = receivables.reduce(
      (sum: number, r: any) => sum + Number(r.balance || 0),
      0
    );

    return {
      success: true,
      data: receivables,
      count: receivables.length,
      summary: `Total receivables: Rs. ${totalReceivable.toLocaleString()} from ${receivables.length} entries`,
    };
  }

  private async getPayables(prisma: PrismaClient): Promise<QueryResult> {
    // Get vendor ledger entries to calculate payables
    const vendors = await (prisma as any).yarnVendor.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        ledgerEntries: {
          select: {
            debit: true,
            credit: true,
          },
        },
      },
      where: { isActive: true },
      take: 30,
    });

    // Calculate balance for each vendor (credit - debit = what we owe)
    const vendorsWithBalance = vendors
      .map((v: any) => {
        const balance = v.ledgerEntries.reduce(
          (sum: number, e: any) => sum + Number(e.credit || 0) - Number(e.debit || 0),
          0
        );
        return { ...v, currentBalance: balance };
      })
      .filter((v: any) => v.currentBalance > 0)
      .sort((a: any, b: any) => b.currentBalance - a.currentBalance)
      .slice(0, 20);

    const totalPayable = vendorsWithBalance.reduce(
      (sum: number, v: any) => sum + Number(v.currentBalance || 0),
      0
    );

    return {
      success: true,
      data: vendorsWithBalance,
      count: vendorsWithBalance.length,
      summary: `Total payables: Rs. ${totalPayable.toLocaleString()} to ${vendorsWithBalance.length} vendors`,
    };
  }

  private async getCheques(
    prisma: PrismaClient,
    params: Record<string, any> = {}
  ): Promise<QueryResult> {
    const status = params.status || 'PENDING';

    const cheques = await (prisma as any).cheque.findMany({
      where: { status },
      select: {
        id: true,
        chequeNumber: true,
        amount: true,
        chequeDate: true,
        bank: true,
        status: true,
        payee: true,
        chequeType: true,
      },
      orderBy: { chequeDate: 'asc' },
      take: 30,
    });

    const totalAmount = cheques.reduce(
      (sum: number, c: any) => sum + Number(c.amount || 0),
      0
    );

    return {
      success: true,
      data: cheques,
      count: cheques.length,
      summary: `${cheques.length} ${status.toLowerCase()} cheques worth Rs. ${totalAmount.toLocaleString()}`,
    };
  }

  // ==================== INVENTORY QUERIES ====================

  private async getInventoryStock(prisma: PrismaClient): Promise<QueryResult> {
    const items = await (prisma as any).stockItem.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        minStockLevel: true,
        maxStockLevel: true,
        category: {
          select: { name: true },
        },
        primaryUnit: {
          select: { name: true, symbol: true },
        },
        stockLevels: {
          select: {
            quantityOnHand: true,
            quantityAvailable: true,
          },
        },
      },
      where: { isActive: true },
      orderBy: { name: 'asc' },
      take: 30,
    });

    // Calculate totals and add currentStock
    const itemsWithStock = items.map((i: any) => {
      const currentStock = i.stockLevels.reduce(
        (sum: number, sl: any) => sum + Number(sl.quantityOnHand || 0),
        0
      );
      return { ...i, currentStock };
    });

    const lowStockItems = itemsWithStock.filter(
      (i: any) => i.minStockLevel && Number(i.currentStock) < Number(i.minStockLevel)
    );

    return {
      success: true,
      data: itemsWithStock,
      count: itemsWithStock.length,
      summary: `${itemsWithStock.length} stock items. ${lowStockItems.length} below minimum level.`,
    };
  }

  private async getInventoryAlerts(prisma: PrismaClient): Promise<QueryResult> {
    const alerts = await (prisma as any).stockAlert.findMany({
      where: {
        isResolved: false,
      },
      select: {
        id: true,
        alertType: true,
        message: true,
        severity: true,
        createdAt: true,
        stockItem: {
          select: { code: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const criticalCount = alerts.filter((a: any) => a.severity === 'HIGH').length;

    return {
      success: true,
      data: alerts,
      count: alerts.length,
      summary: `${alerts.length} active alerts. ${criticalCount} critical.`,
    };
  }

  // ==================== NEEDLE QUERIES ====================

  private async getNeedleStatus(prisma: PrismaClient): Promise<QueryResult> {
    const allocations = await (prisma as any).needleMachineAllocation.findMany({
      where: { isActive: true },
      select: {
        id: true,
        quantity: true,
        installedDate: true,
        machine: {
          select: { machineNumber: true, name: true },
        },
        needleType: {
          select: { name: true, gauge: true },
        },
      },
      orderBy: { installedDate: 'desc' },
      take: 30,
    });

    const totalNeedles = allocations.reduce(
      (sum: number, a: any) => sum + Number(a.quantity || 0),
      0
    );

    return {
      success: true,
      data: allocations,
      count: allocations.length,
      summary: `${totalNeedles.toLocaleString()} needles allocated across ${allocations.length} machines`,
    };
  }

  private async getNeedleDamage(prisma: PrismaClient): Promise<QueryResult> {
    const damages = await (prisma as any).needleDamage.findMany({
      where: {
        resolutionStatus: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        quantity: true,
        damageType: true,
        reportedDate: true,
        resolutionStatus: true,
        machine: {
          select: { machineNumber: true },
        },
        needleType: {
          select: { name: true },
        },
      },
      orderBy: { reportedDate: 'desc' },
      take: 20,
    });

    const totalDamaged = damages.reduce(
      (sum: number, d: any) => sum + Number(d.quantity || 0),
      0
    );

    return {
      success: true,
      data: damages,
      count: damages.length,
      summary: `${totalDamaged} damaged needles in ${damages.length} reports pending resolution`,
    };
  }
}

// Export singleton instance
export const QueryExecutor = new QueryExecutorClass();
