import { eq, sql, and, gte, lte } from "drizzle-orm";
import { db } from "../db/db.js";
import { invoices, payments } from "../db/schema.js";

// GET /dashboard/stats — aggregate KPIs for the dashboard top cards
export async function getStats(req, res, next) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Monthly revenue: sum of invoices created this month that are PAID
    const [monthlyRevResult] = await db
      .select({ sum: sql`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(
        and(
          gte(payments.paidAt, startOfMonth),
          lte(payments.paidAt, now),
        ),
      );

    // Annual recurring: sum of payments in the last 12 months
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const [annualResult] = await db
      .select({ sum: sql`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(
        and(
          gte(payments.paidAt, twelveMonthsAgo),
          lte(payments.paidAt, now),
        ),
      );

    // Previous calendar month, for the "vs last month" delta
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [prevMonthRevenueResult] = await db
      .select({ sum: sql`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(
        and(
          gte(payments.paidAt, startOfPrevMonth),
          lte(payments.paidAt, startOfThisMonth),
        ),
      );

    // Previous 12-month window, for the "vs last year" delta
    const twentyFourMonthsAgo = new Date(now);
    twentyFourMonthsAgo.setFullYear(twentyFourMonthsAgo.getFullYear() - 2);
    const [prevYearRecurringResult] = await db
      .select({ sum: sql`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(
        and(
          gte(payments.paidAt, twentyFourMonthsAgo),
          lte(payments.paidAt, twelveMonthsAgo),
        ),
      );

    // Outstanding: total of PENDING + OVERDUE invoices
    const [outstandingResult] = await db
      .select({ sum: sql`COALESCE(SUM(total), 0)` })
      .from(invoices)
      .where(
        sql`${invoices.status} IN ('PENDING', 'OVERDUE')`,
      );

    // Overdue count + invoice count
    const [overdueResult] = await db
      .select({ count: sql`count(*)::int` })
      .from(invoices)
      .where(eq(invoices.status, "OVERDUE"));

    const [pendingResult] = await db
      .select({ count: sql`count(*)::int` })
      .from(invoices)
      .where(eq(invoices.status, "PENDING"));

    // Collected MTD (payments this month)
    const collectedMTD = parseFloat(monthlyRevResult.sum);

    // Total collected all time
    const [totalCollectedResult] = await db
      .select({ sum: sql`COALESCE(SUM(amount), 0)` })
      .from(payments);

    // Total invoices count
    const [totalInvoicesResult] = await db
      .select({ count: sql`count(*)::int` })
      .from(invoices);

    // Status breakdown
    const statusCounts = await db
      .select({
        status: invoices.status,
        count: sql`count(*)::int`,
      })
      .from(invoices)
      .groupBy(invoices.status);

    const counts = { DRAFT: 0, PENDING: 0, PAID: 0, OVERDUE: 0, CANCELLED: 0 };
    for (const row of statusCounts) {
      counts[row.status] = row.count;
    }

    res.json({
      monthlyRevenue: parseFloat(monthlyRevResult.sum),
      prevMonthRevenue: parseFloat(prevMonthRevenueResult.sum),
      annualRecurring: parseFloat(annualResult.sum),
      prevYearRecurring: parseFloat(prevYearRecurringResult.sum),
      outstanding: parseFloat(outstandingResult.sum),
      collectedMTD,
      totalCollected: parseFloat(totalCollectedResult.sum),
      overdueCount: overdueResult.count,
      pendingCount: pendingResult.count,
      totalInvoices: totalInvoicesResult.count,
      statusCounts: counts,
    });
  } catch (err) {
    next(err);
  }
}

// GET /dashboard/cashflow — weekly aggregated data for cashflow chart
export async function getCashflow(req, res, next) {
  try {
    const now = new Date();
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

    // Weekly inflow (payments received)
    const inflow = await db
      .select({
        week: sql`date_trunc('week', ${payments.paidAt})`,
        total: sql`COALESCE(SUM(amount), 0)`,
      })
      .from(payments)
      .where(gte(payments.paidAt, eightWeeksAgo))
      .groupBy(sql`date_trunc('week', ${payments.paidAt})`)
      .orderBy(sql`date_trunc('week', ${payments.paidAt})`);

    // Weekly billed (invoices created)
    const billed = await db
      .select({
        week: sql`date_trunc('week', ${invoices.createdAt})`,
        total: sql`COALESCE(SUM(total), 0)`,
      })
      .from(invoices)
      .where(gte(invoices.createdAt, eightWeeksAgo))
      .groupBy(sql`date_trunc('week', ${invoices.createdAt})`)
      .orderBy(sql`date_trunc('week', ${invoices.createdAt})`);

    res.json({
      inflow: inflow.map((r) => ({ week: r.week, amount: parseFloat(r.total) })),
      billed: billed.map((r) => ({ week: r.week, amount: parseFloat(r.total) })),
    });
  } catch (err) {
    next(err);
  }
}
