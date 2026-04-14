/**
 * WhatsApp Notification Service
 * Handles sending automated notifications for orders, payments, and daily reports
 */

import { PrismaClient } from '@prisma/client';
import { whatsappClient } from './client';
import { nluService } from './nlu';
import { logger } from '../../utils/logger';

// Notification types
export type NotificationType =
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'payment_received'
  | 'payment_reminder'
  | 'daily_report'
  | 'low_stock_alert';

// Notification payload interfaces
export interface OrderNotification {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  status: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  total?: number;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export interface PaymentNotification {
  customerName: string;
  customerPhone: string;
  amount: number;
  currency?: string;
  invoiceNumber?: string;
  dueDate?: string;
  balanceAfter?: number;
}

export interface DailyReportData {
  date: string;
  production: {
    totalRolls: number;
    totalWeight: number;
    machinesRunning: number;
    totalMachines: number;
    efficiency: number;
  };
  sales: {
    ordersReceived: number;
    orderValue: number;
    paymentsReceived: number;
  };
  inventory: {
    lowStockItems: Array<{ code: string; name: string; currentStock: number; minStock: number }>;
    criticalAlerts: number;
  };
}

/**
 * WhatsApp Notification Service
 */
class NotificationService {
  /**
   * Send order confirmation notification
   */
  async sendOrderConfirmation(data: OrderNotification): Promise<boolean> {
    try {
      const itemsList = data.items
        ?.map((i) => `• ${i.name} x${i.quantity} = PKR ${i.price.toLocaleString()}`)
        .join('\n') || '';

      const message = `✅ *Order Confirmed!*

Dear ${data.customerName},

Your order *${data.orderNumber}* has been confirmed.

${itemsList ? `*Items:*\n${itemsList}\n\n` : ''}*Total: PKR ${(data.total || 0).toLocaleString()}*

We'll notify you when your order is shipped.

Thank you for choosing Mughal Grace!`;

      await whatsappClient.sendTextMessage(data.customerPhone, message);

      logger.info(`Order confirmation sent for ${data.orderNumber} to ${data.customerPhone}`);
      return true;
    } catch (error) {
      logger.error('Failed to send order confirmation:', error);
      return false;
    }
  }

  /**
   * Send order shipped notification
   */
  async sendOrderShipped(data: OrderNotification): Promise<boolean> {
    try {
      const message = `📦 *Order Shipped!*

Dear ${data.customerName},

Great news! Your order *${data.orderNumber}* has been shipped.

${data.trackingNumber ? `*Tracking #:* ${data.trackingNumber}\n` : ''}${data.estimatedDelivery ? `*Expected Delivery:* ${data.estimatedDelivery}\n` : ''}

You'll receive another update when it's delivered.`;

      await whatsappClient.sendTextMessage(data.customerPhone, message);

      logger.info(`Order shipped notification sent for ${data.orderNumber}`);
      return true;
    } catch (error) {
      logger.error('Failed to send shipped notification:', error);
      return false;
    }
  }

  /**
   * Send payment received notification
   */
  async sendPaymentReceived(data: PaymentNotification): Promise<boolean> {
    try {
      const message = `💰 *Payment Received!*

Dear ${data.customerName},

We have received your payment of *${data.currency || 'PKR'} ${data.amount.toLocaleString()}*.

${data.invoiceNumber ? `Invoice: ${data.invoiceNumber}\n` : ''}${data.balanceAfter !== undefined ? `\nYour current balance: ${data.currency || 'PKR'} ${data.balanceAfter.toLocaleString()}` : ''}

Thank you for your payment!`;

      await whatsappClient.sendTextMessage(data.customerPhone, message);

      logger.info(`Payment received notification sent to ${data.customerPhone}`);
      return true;
    } catch (error) {
      logger.error('Failed to send payment notification:', error);
      return false;
    }
  }

  /**
   * Send payment reminder notification
   */
  async sendPaymentReminder(data: PaymentNotification): Promise<boolean> {
    try {
      const message = `🔔 *Payment Reminder*

Dear ${data.customerName},

This is a friendly reminder about your outstanding balance:

*Amount Due:* ${data.currency || 'PKR'} ${data.amount.toLocaleString()}
${data.dueDate ? `*Due Date:* ${data.dueDate}\n` : ''}${data.invoiceNumber ? `*Invoice:* ${data.invoiceNumber}\n` : ''}

Please arrange for payment at your earliest convenience.

For any queries, please contact us.

Mughal Grace Textiles`;

      await whatsappClient.sendTextMessage(data.customerPhone, message);

      logger.info(`Payment reminder sent to ${data.customerPhone}`);
      return true;
    } catch (error) {
      logger.error('Failed to send payment reminder:', error);
      return false;
    }
  }

  /**
   * Send daily report to factory owner
   */
  async sendDailyReport(
    recipientPhone: string,
    data: DailyReportData,
    language: 'en' | 'ur' = 'en'
  ): Promise<boolean> {
    try {
      let message: string;

      if (language === 'ur') {
        message = this.formatDailyReportUrdu(data);
      } else {
        message = this.formatDailyReportEnglish(data);
      }

      await whatsappClient.sendTextMessage(recipientPhone, message);

      logger.info(`Daily report sent to ${recipientPhone}`);
      return true;
    } catch (error) {
      logger.error('Failed to send daily report:', error);
      return false;
    }
  }

  /**
   * Format daily report in English
   */
  private formatDailyReportEnglish(data: DailyReportData): string {
    const { production, sales, inventory } = data;

    let message = `📊 *Daily Report - ${data.date}*

🏭 *Production Summary:*
• Rolls Produced: ${production.totalRolls.toLocaleString()}
• Total Weight: ${production.totalWeight.toLocaleString()} kg
• Machines: ${production.machinesRunning}/${production.totalMachines} running
• Efficiency: ${production.efficiency}%

💰 *Sales Summary:*
• Orders Received: ${sales.ordersReceived}
• Order Value: PKR ${sales.orderValue.toLocaleString()}
• Payments Received: PKR ${sales.paymentsReceived.toLocaleString()}`;

    if (inventory.lowStockItems.length > 0) {
      message += `\n\n⚠️ *Low Stock Alerts (${inventory.criticalAlerts}):*\n`;
      message += inventory.lowStockItems
        .slice(0, 5)
        .map((item) => `• ${item.code}: ${item.currentStock}/${item.minStock} ${item.name}`)
        .join('\n');

      if (inventory.lowStockItems.length > 5) {
        message += `\n...and ${inventory.lowStockItems.length - 5} more items`;
      }
    }

    message += '\n\n_Mughal Grace ERP System_';

    return message;
  }

  /**
   * Format daily report in Urdu
   */
  private formatDailyReportUrdu(data: DailyReportData): string {
    const { production, sales, inventory } = data;

    let message = `📊 *روزانہ رپورٹ - ${data.date}*

🏭 *پروڈکشن:*
• رولز: ${production.totalRolls.toLocaleString()}
• وزن: ${production.totalWeight.toLocaleString()} کلو
• مشینیں: ${production.machinesRunning}/${production.totalMachines}
• ایفیشنسی: ${production.efficiency}%

💰 *سیلز:*
• آرڈرز: ${sales.ordersReceived}
• قیمت: ${sales.orderValue.toLocaleString()} روپے
• وصولی: ${sales.paymentsReceived.toLocaleString()} روپے`;

    if (inventory.lowStockItems.length > 0) {
      message += `\n\n⚠️ *کم اسٹاک (${inventory.criticalAlerts}):*\n`;
      message += inventory.lowStockItems
        .slice(0, 5)
        .map((item) => `• ${item.code}: ${item.currentStock}/${item.minStock}`)
        .join('\n');
    }

    message += '\n\n_مغل گریس ERP_';

    return message;
  }

  /**
   * Send low stock alert
   */
  async sendLowStockAlert(
    recipientPhone: string,
    items: Array<{ code: string; name: string; currentStock: number; minStock: number }>,
    language: 'en' | 'ur' = 'en'
  ): Promise<boolean> {
    try {
      let message: string;

      if (language === 'ur') {
        message = `⚠️ *کم اسٹاک الرٹ*\n\nدرج ذیل آئٹمز کا اسٹاک کم ہے:\n\n`;
        message += items
          .map((item) => `• ${item.code}: ${item.currentStock}/${item.minStock}\n  ${item.name}`)
          .join('\n\n');
        message += '\n\nبراہ کرم آرڈر کریں۔';
      } else {
        message = `⚠️ *Low Stock Alert*\n\nThe following items are running low:\n\n`;
        message += items
          .map((item) => `• ${item.code}: ${item.currentStock}/${item.minStock}\n  ${item.name}`)
          .join('\n\n');
        message += '\n\nPlease arrange to reorder.';
      }

      await whatsappClient.sendTextMessage(recipientPhone, message);

      logger.info(`Low stock alert sent to ${recipientPhone}`);
      return true;
    } catch (error) {
      logger.error('Failed to send low stock alert:', error);
      return false;
    }
  }

  /**
   * Generate daily report data from database
   */
  async generateDailyReportData(prisma: PrismaClient, date?: Date): Promise<DailyReportData> {
    const reportDate = date || new Date();
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get production data
    const productionLogs = await prisma.productionLog.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const totalRolls = productionLogs.reduce((sum, log) => sum + (log.rollsProduced || 0), 0);
    const totalWeight = productionLogs.reduce((sum, log) => sum + Number(log.totalWeightKg || 0), 0);

    // Get machine count
    const machines = await prisma.machine.findMany({
      where: { isActive: true },
    });
    const runningMachines = machines.filter((m) => m.currentStatus === 'RUNNING').length;

    // Calculate efficiency
    const totalTargetRolls = productionLogs.reduce((sum, log) => sum + (log.targetRolls || 0), 0);
    const efficiency = totalTargetRolls > 0 ? Math.round((totalRolls / totalTargetRolls) * 100) : 0;

    // Get sales data
    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        orderDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const ordersReceived = salesOrders.length;
    const orderValue = salesOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

    // Get payments received
    const payments = await prisma.customerPayment.findMany({
      where: {
        paymentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
    const paymentsReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Get low stock items
    const yarnTypes = await prisma.yarnType.findMany({
      where: { isActive: true },
    });

    // For now, we'll simulate low stock check
    // In real implementation, this would check actual stock levels
    const lowStockItems: Array<{ code: string; name: string; currentStock: number; minStock: number }> = [];

    return {
      date: reportDate.toISOString().split('T')[0],
      production: {
        totalRolls,
        totalWeight,
        machinesRunning: runningMachines,
        totalMachines: machines.length,
        efficiency,
      },
      sales: {
        ordersReceived,
        orderValue,
        paymentsReceived,
      },
      inventory: {
        lowStockItems,
        criticalAlerts: lowStockItems.length,
      },
    };
  }

  /**
   * Process pending payment reminders
   */
  async processPendingPaymentReminders(prisma: PrismaClient): Promise<number> {
    // Find customers with outstanding balances
    const outstandingBalances = await prisma.outstandingBalance.findMany({
      where: {
        balanceAmount: { gt: 0 },
      },
      include: {
        customer: true,
      },
    });

    let sentCount = 0;

    for (const balance of outstandingBalances) {
      if (balance.customer.phone) {
        const sent = await this.sendPaymentReminder({
          customerName: balance.customer.name,
          customerPhone: balance.customer.phone,
          amount: Number(balance.balanceAmount),
        });

        if (sent) {
          sentCount++;
        }
      }
    }

    return sentCount;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
