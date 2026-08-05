import { pgTable, text, timestamp, decimal, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// role is plain text, not a pgEnum — you're starting with 'CEO' / 'HR' but Postgres enums
// are painful to alter (can't drop/rename values easily), so keep new roles a data change,
// not a migration. Enforce the allowed set in app code (see ALLOWED_ROLES below) instead.
export const invoiceStatusEnum = pgEnum('invoice_status', ['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED']);

export const ALLOWED_ROLES = ['CEO', 'HR'];

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('HR'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// One row per issued refresh token. Rotation + reuse-detection live on this table.
export const refreshTokens = pgTable('refresh_tokens', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(), // sha256 of the raw token — raw value never stored
  familyId: text('family_id').notNull(),            // shared by a token and everything it rotates into
  revoked: boolean('revoked').notNull().default(false),
  replacedBy: text('replaced_by'),                  // id of the token this one was rotated into
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  userAgent: text('user_agent'),
  ip: text('ip'),
});

export const clients = pgTable('clients', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  country: text('country'),
  address: text('address'),
  industry: text('industry'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const contacts = pgTable('contacts', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
});

export const invoices = pgTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  number: text('number').notNull().unique(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  status: invoiceStatusEnum('status').notNull().default('DRAFT'),
  issueDate: timestamp('issue_date').notNull(),
  dueDate: timestamp('due_date').notNull(),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  discount: decimal('discount', { precision: 12, scale: 2 }).notNull().default('0'),
  tax: decimal('tax', { precision: 12, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  notes: text('notes'),
  service: text('service'),
  stripeSessionId: text('stripe_session_id'), 
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invoiceItems = pgTable('invoice_items', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
  rate: decimal('rate', { precision: 12, scale: 2 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
});

export const payments = pgTable('payments', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  method: text('method'),
  stripeEventId: text('stripe_event_id').unique(), // dedupe webhook retries
  paidAt: timestamp('paid_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Relations ──────────────────────────────────────────────────────────────

export const clientsRelations = relations(clients, ({ many }) => ({
  contacts: many(contacts),
  invoices: many(invoices),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  client: one(clients, { fields: [contacts.clientId], references: [clients.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, { fields: [payments.invoiceId], references: [invoices.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));