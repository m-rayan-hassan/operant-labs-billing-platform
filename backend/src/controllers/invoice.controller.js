import { z } from "zod";
import { eq, ilike, sql, and, desc } from "drizzle-orm";
import { db } from "../db/db.js";
import { invoices, invoiceItems, clients, payments } from "../db/schema.js";
import Stripe from 'stripe';
import { Resend } from 'resend';
import PDFDocument from 'pdfkit';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

// ─── Validation Schemas ─────────────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  rate: z.number().min(0, "Rate must be non-negative"),
});

const createInvoiceSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  issueDate: z.string().or(z.date()),
  dueDate: z.string().or(z.date()),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  currency: z.string().max(3).default("USD"),
  notes: z.string().optional(),
  service: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

const updateInvoiceSchema = z.object({
  clientId: z.string().min(1).optional(),
  issueDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional(),
  discount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  currency: z.string().max(3).optional(),
  notes: z.string().optional(),
  service: z.string().optional(),
  items: z.array(lineItemSchema).min(1).optional(),
});

// Valid status transitions: from -> [allowed targets]
const STATUS_TRANSITIONS = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PAID", "CANCELLED"],
  PAID: ["CANCELLED"],
  CANCELLED: [],
};

const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELLED"]),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

// Generate the next invoice number: INV-0001, INV-0002, etc.
async function generateInvoiceNumber() {
  const result = await db
    .select({ number: invoices.number })
    .from(invoices)
    .orderBy(desc(invoices.createdAt))
    .limit(1);

  if (result.length === 0) return "INV-0001";

  const lastNumber = result[0].number; // e.g. "INV-0042"
  const numPart = parseInt(lastNumber.replace("INV-", ""), 10);
  const next = numPart + 1;
  return `INV-${String(next).padStart(4, "0")}`;
}

function calculateTotals(items, discount = 0, tax = 0) {
  const subtotal = items.reduce((sum, item) => {
    return sum + item.quantity * item.rate;
  }, 0);
  const total = subtotal - discount + tax;
  return {
    subtotal: subtotal.toFixed(2),
    discount: discount.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
  };
}

// ─── Controllers ────────────────────────────────────────────────────────────

// GET /invoices — list invoices with optional status filter, search, and pagination
export async function listInvoices(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const search = req.query.search?.trim();

    const conditions = [];
    if (status) {
      conditions.push(eq(invoices.status, status));
    }
    if (search) {
      conditions.push(ilike(invoices.number, `%${search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult, statusCounts] = await Promise.all([
      db.query.invoices.findMany({
        where,
        with: {
          client: { columns: { id: true, name: true, country: true, industry: true } },
          items: true,
        },
        limit,
        offset,
        orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
      }),
      db.select({ count: sql`count(*)::int` }).from(invoices).where(where),
      // Get counts per status for the tab badges in the UI
      db
        .select({
          status: invoices.status,
          count: sql`count(*)::int`,
        })
        .from(invoices)
        .groupBy(invoices.status),
    ]);

    const total = countResult[0]?.count ?? 0;

    // Build status counts map: { DRAFT: 1, PENDING: 2, ... }
    const counts = { ALL: 0, DRAFT: 0, PENDING: 0, PAID: 0, OVERDUE: 0, CANCELLED: 0 };
    for (const row of statusCounts) {
      counts[row.status] = row.count;
      counts.ALL += row.count;
    }

    res.json({
      data,
      statusCounts: counts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /invoices — create a new invoice as DRAFT with nested line items
export async function createInvoice(req, res, next) {
  try {
    const body = createInvoiceSchema.parse(req.body);

    // Verify client exists
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, body.clientId),
      columns: { id: true },
    });
    if (!client) return res.status(404).json({ error: "Client not found" });

    // Calculate line item amounts and totals
    const itemsWithAmounts = body.items.map((item) => ({
      ...item,
      amount: (item.quantity * item.rate).toFixed(2),
    }));
    const totals = calculateTotals(body.items, body.discount, body.tax);

    const number = await generateInvoiceNumber();

    // Insert invoice
    const [invoice] = await db
      .insert(invoices)
      .values({
        number,
        clientId: body.clientId,
        status: "DRAFT",
        issueDate: new Date(body.issueDate),
        dueDate: new Date(body.dueDate),
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        currency: body.currency,
        notes: body.notes,
        service: body.service,
      })
      .returning();

    // Insert line items
    if (itemsWithAmounts.length > 0) {
      await db.insert(invoiceItems).values(
        itemsWithAmounts.map((item) => ({
          invoiceId: invoice.id,
          description: item.description,
          quantity: String(item.quantity),
          rate: String(item.rate),
          amount: item.amount,
        })),
      );
    }

    // Return the full invoice with items
    const full = await db.query.invoices.findFirst({
      where: eq(invoices.id, invoice.id),
      with: {
        client: true,
        items: true,
      },
    });

    res.status(201).json(full);
  } catch (err) {
    next(err);
  }
}

// GET /invoices/:id — fetch one invoice with client, line items, and payment history
export async function getInvoice(req, res, next) {
  try {
    const { id } = req.params;

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        client: {
          with: { contacts: true },
        },
        items: true,
        payments: {
          orderBy: (payments, { desc }) => [desc(payments.paidAt)],
        },
      },
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

// PUT /invoices/:id — edit an invoice (only if DRAFT)
export async function updateInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const body = updateInvoiceSchema.parse(req.body);

    // Fetch existing invoice
    const existing = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
    });
    if (!existing) return res.status(404).json({ error: "Invoice not found" });
    if (existing.status !== "DRAFT") {
      return res.status(409).json({ error: "Only DRAFT invoices can be edited" });
    }

    // If clientId is being changed, verify new client exists
    if (body.clientId) {
      const client = await db.query.clients.findFirst({
        where: eq(clients.id, body.clientId),
        columns: { id: true },
      });
      if (!client) return res.status(404).json({ error: "Client not found" });
    }

    // Build the update payload
    const updateData = {};
    if (body.clientId !== undefined) updateData.clientId = body.clientId;
    if (body.issueDate !== undefined) updateData.issueDate = new Date(body.issueDate);
    if (body.dueDate !== undefined) updateData.dueDate = new Date(body.dueDate);
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.service !== undefined) updateData.service = body.service;

    // If items are provided, replace all items and recalculate totals
    if (body.items) {
      const discount = body.discount ?? parseFloat(existing.discount);
      const tax = body.tax ?? parseFloat(existing.tax);
      const totals = calculateTotals(body.items, discount, tax);

      updateData.subtotal = totals.subtotal;
      updateData.discount = totals.discount;
      updateData.tax = totals.tax;
      updateData.total = totals.total;

      // Delete old items, insert new ones
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await db.insert(invoiceItems).values(
        body.items.map((item) => ({
          invoiceId: id,
          description: item.description,
          quantity: String(item.quantity),
          rate: String(item.rate),
          amount: (item.quantity * item.rate).toFixed(2),
        })),
      );
    } else if (body.discount !== undefined || body.tax !== undefined) {
      // Recalculate totals with new discount/tax but existing items
      const existingItems = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id));

      const items = existingItems.map((i) => ({
        quantity: parseFloat(i.quantity),
        rate: parseFloat(i.rate),
      }));

      const discount = body.discount ?? parseFloat(existing.discount);
      const tax = body.tax ?? parseFloat(existing.tax);
      const totals = calculateTotals(items, discount, tax);

      updateData.subtotal = totals.subtotal;
      updateData.discount = totals.discount;
      updateData.tax = totals.tax;
      updateData.total = totals.total;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(invoices).set(updateData).where(eq(invoices.id, id));
    }

    // Return the full updated invoice
    const updated = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: { client: true, items: true, payments: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PUT /invoices/:id/status — manually change invoice status
export async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status: newStatus } = updateStatusSchema.parse(req.body);

    const existing = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      columns: { id: true, status: true },
    });
    if (!existing) return res.status(404).json({ error: "Invoice not found" });

    const allowed = STATUS_TRANSITIONS[existing.status] || [];
    if (!allowed.includes(newStatus)) {
      return res.status(409).json({
        error: `Cannot transition from ${existing.status} to ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`,
      });
    }

    const [updated] = await db
      .update(invoices)
      .set({ status: newStatus })
      .where(eq(invoices.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /invoices/:id — delete an invoice (only if DRAFT)
export async function deleteInvoice(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      columns: { id: true, status: true },
    });
    if (!existing) return res.status(404).json({ error: "Invoice not found" });
    if (existing.status !== "DRAFT") {
      return res.status(409).json({ error: "Only DRAFT invoices can be deleted" });
    }

    await db.delete(invoices).where(eq(invoices.id, id));

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─── PDF & Finalize ────────────────────────────────────────────────────────

function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    // Explicitly using A4 size for standard invoice proportions
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // --- Design Theme ---
    const colorPrimary = '#2c3e50'; // Dark modern blue
    const colorDark = '#333333';    // Dark gray for headings
    const colorGray = '#666666';    // Medium gray for standard text
    const colorLightGray = '#f4f6f8'; // Light background for tables
    const colorBorder = '#e1e5e8';  // Soft border color

    // Grid coordinates
    const rightAlignX = 350;
    const rightAlignWidth = 195; // Keeps text inside the right margin

    // --- 1. Header Section ---
    // Company Name (Operant Labs)
    doc.fillColor(colorPrimary)
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('Operant Labs', 50, 50);

    // Invoice Title
    doc.fillColor(colorDark)
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('INVOICE', rightAlignX, 50, { width: rightAlignWidth, align: 'right' });

    // Invoice Details
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(colorGray);
    
    doc.text(`Invoice Number: ${invoice.number}`, rightAlignX, 80, { width: rightAlignWidth, align: 'right' });
    doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, rightAlignX, 95, { width: rightAlignWidth, align: 'right' });
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, rightAlignX, 110, { width: rightAlignWidth, align: 'right' });

    // Header Divider Line
    doc.moveTo(50, 135)
       .lineTo(545, 135)
       .lineWidth(1)
       .strokeColor(colorBorder)
       .stroke();

    // --- 2. Client Info ---
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor(colorDark)
       .text('Billed To:', 50, 155);
    
    doc.font('Helvetica')
       .fillColor(colorGray)
       .text(invoice.client.name, 50, 170);
    
    if (invoice.client.address) {
      doc.text(invoice.client.address, 50, 185);
    }

    // --- 3. Line Items ---
    let y = 230; // Starting Y coordinate for table
    
    // Table Header Background
    doc.rect(50, y, 495, 25).fillColor(colorLightGray).fill();
    
    // Table Header Text
    doc.font('Helvetica-Bold')
       .fillColor(colorDark)
       .fontSize(10);
    
    doc.text('Description', 60, y + 8);
    doc.text('Qty', 330, y + 8, { width: 50, align: 'right' });
    doc.text('Price', 390, y + 8, { width: 60, align: 'right' });
    doc.text('Amount', 460, y + 8, { width: 75, align: 'right' });
    
    y += 25;

    // Table Rows
    doc.font('Helvetica').fillColor(colorGray);
    
    if (invoice.items && invoice.items.length > 0) {
      for (const item of invoice.items) {
        doc.text(item.description, 60, y + 8);
        doc.text(item.quantity.toString(), 330, y + 8, { width: 50, align: 'right' });
        doc.text(parseFloat(item.rate).toFixed(2), 390, y + 8, { width: 60, align: 'right' });
        
        const amount = (item.quantity * item.rate).toFixed(2);
        doc.text(amount, 460, y + 8, { width: 75, align: 'right' });
        
        y += 25;
        
        // Subtle row divider line
        doc.moveTo(50, y)
           .lineTo(545, y)
           .lineWidth(0.5)
           .strokeColor(colorBorder)
           .stroke();
      }
    } else {
      y += 25; // Add space if no items exist
    }
    
    y += 15;
    
    // --- 4. Totals ---
    // Highlighted Total Box
    doc.rect(345, y, 200, 30).fillColor(colorLightGray).fill();
    
    doc.font('Helvetica-Bold')
       .fillColor(colorDark)
       .fontSize(12);
       
    doc.text('Total:', 360, y + 9, { width: 50, align: 'left' });
    doc.text(`${invoice.currency} ${invoice.total}`, 410, y + 9, { width: 125, align: 'right' });

    // --- 5. Footer ---
    doc.fontSize(10)
       .font('Helvetica')
       .fillColor(colorGray)
       .text('Thank you for your business!', 50, 750, { align: 'center', width: 495 });

    doc.end();
  });
}

const finalizeSchema = z.object({
  subject: z.string().min(1, "Email subject is required"),
  message: z.string().min(1, "Email message is required"),
});

// POST /invoices/:id/finalize — finalize a draft invoice, send email, and generate checkout URL
export async function finalizeInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const body = finalizeSchema.parse(req.body);

    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: { client: { with: { contacts: true } }, items: true }
    });

    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    if (invoice.status !== "DRAFT") return res.status(409).json({ error: "Only DRAFT invoices can be finalized" });

    // 1. Generate PDF
    const pdfBuffer = await generateInvoicePDF(invoice);

    // 2. Generate Stripe Checkout URL
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: invoice.currency.toLowerCase(),
          product_data: {
            name: `Invoice ${invoice.number}`,
            description: `Services for ${invoice.client.name}`,
          },
          unit_amount: Math.round(parseFloat(invoice.total) * 100), // Stripe expects cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://operantlabs.io`,
      cancel_url: `https://operantlabs.io`,
      metadata: { invoiceId: invoice.id },
      client_reference_id: invoice.clientId,
      customer_email: invoice.client.contacts?.[0]?.email || undefined,
    });

    // 3. Send Email via Resend
    // Find a recipient email (fallback to a dummy one if no contacts exist)
    const toEmail = invoice.client.contacts?.[0]?.email
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'; 

    // Include the checkout URL in the email body
const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Import Inter font for email clients that support web fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #fdfdfd;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Dark Mode Support for modern email clients (Apple Mail, iOS, etc.) */
    @media (prefers-color-scheme: dark) {
      body, .email-wrapper { background-color: #0a0f0f !important; }
      .email-card { 
        background-color: #131a1a !important; 
        border-color: rgba(255, 255, 255, 0.08) !important; 
      }
      .text-main { color: #f4f7f8 !important; }
      .text-variant { color: #a1b5b6 !important; }
      .divider { border-bottom-color: rgba(255, 255, 255, 0.08) !important; }
    }
  </style>
</head>
<body>
  <!-- Background Wrapper (Light Mode default: var(--background)) -->
  <div class="email-wrapper" style="background-color: #fdfdfd; font-family: 'Inter', Helvetica, Arial, sans-serif; padding: 40px 20px;">
    
    <!-- Glass Card Mimic (Light Mode default: var(--card)) -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-card" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 16px; border-collapse: separate;">
      <tr>
        <td style="padding: 40px;">
          
          <!-- Header (Operant Labs) -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="divider" style="padding-bottom: 24px; border-bottom: 1px solid rgba(0, 0, 0, 0.08);">
                <h2 class="text-main" style="margin: 0; font-size: 20px; font-weight: 600; color: #000000; letter-spacing: -0.02em;">
                  Operant Labs
                </h2>
              </td>
            </tr>
          </table>
          
          <!-- Message Body -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="text-main" style="padding: 32px 0; font-size: 16px; line-height: 1.6; color: #000000;">
                ${body.message.replace(/\n/g, '<br>')}
              </td>
            </tr>
          </table>
          
          <!-- Footer / Sign-off -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="text-variant" style="font-size: 14px; color: #5a6b6c; font-weight: 500;">
                Thank you for your business!
              </td>
            </tr>
          </table>
          
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

    try {
        await resend.emails.send({
          from: fromEmail,
          to: [toEmail],
          subject: body.subject,
          html: emailHtml,
          attachments: [
            {
              filename: `${invoice.number}.pdf`,
              content: pdfBuffer,
            }
          ]
        });
    } catch (e) {
        console.error("Failed to send email, but proceeding with finalize", e);
        // We'll proceed even if email fails in dev without proper keys
    }

    // 4. Update Database
    const [updated] = await db
      .update(invoices)
      .set({ 
        status: "PENDING",
        stripeSessionId: session.id 
      })
      .where(eq(invoices.id, id))
      .returning();

    res.json({ ...updated, checkoutUrl: session.url });
  } catch (err) {
    next(err);
  }
}