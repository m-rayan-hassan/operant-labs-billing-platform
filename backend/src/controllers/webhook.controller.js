import Stripe from 'stripe';
import { db } from "../db/db.js";
import { invoices, payments } from "../db/schema.js";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // req.body should be a Buffer here (raw body)
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      const stripeSessionId = session.id;
      
      if (stripeSessionId) {
        // Find the invoice and update status to PAID
        const updatedInvoices = await db.update(invoices)
            .set({ status: 'PAID' })
            .where(eq(invoices.stripeSessionId, stripeSessionId))
            .returning();
            
        if (updatedInvoices.length > 0) {
           const invoice = updatedInvoices[0];
           // Record the payment — stripeEventId dedupes webhook retries
           await db.insert(payments).values({
               invoiceId: invoice.id,
               amount: invoice.total.toString(),
               method: 'CREDIT_CARD',
               stripeEventId: event.id,
           }).onConflictDoNothing({ target: payments.stripeEventId });
           console.log(`Invoice ${invoice.id} marked as PAID via webhook`);
        }
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
};
