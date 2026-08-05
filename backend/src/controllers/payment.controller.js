import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/db.js";
import { payments, invoices } from "../db/schema.js";

const recordPaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  method: z.string().max(50).optional(),
});

// POST /invoices/:id/payments — record a manual payment
export async function recordPayment(req, res, next) {
  try {
    const { id } = req.params;
    const body = recordPaymentSchema.parse(req.body);

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      columns: { id: true, status: true, total: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.status === "DRAFT") {
      return res.status(409).json({ error: "Cannot record payment on a DRAFT invoice" });
    }
    if (invoice.status === "CANCELLED") {
      return res.status(409).json({ error: "Cannot record payment on a CANCELLED invoice" });
    }

    const [payment] = await db
      .insert(payments)
      .values({
        invoiceId: id,
        amount: String(body.amount),
        method: body.method || "manual",
      })
      .returning();

    // Check if total payments >= invoice total → mark PAID
    const totalPaid = await db
      .select({ sum: sql`COALESCE(SUM(amount), 0)` })
      .from(payments)
      .where(eq(payments.invoiceId, id));

    const paidAmount = parseFloat(totalPaid[0]?.sum ?? 0);
    const invoiceTotal = parseFloat(invoice.total);

    if (paidAmount >= invoiceTotal && invoice.status !== "PAID") {
      await db
        .update(invoices)
        .set({ status: "PAID" })
        .where(eq(invoices.id, id));
    }

    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
}

// GET /invoices/:id/payments — list payments for an invoice
export async function listPayments(req, res, next) {
  try {
    const { id } = req.params;

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      columns: { id: true },
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const data = await db
      .select()
      .from(payments)
      .where(eq(payments.invoiceId, id))
      .orderBy(payments.paidAt);

    res.json(data);
  } catch (err) {
    next(err);
  }
}
