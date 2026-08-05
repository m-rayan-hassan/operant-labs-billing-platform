# Operant Labs Billing Platform — Project Context

This file exists so any AI assistant working in this repo has full context without
re-explaining the project. Read this before generating code.

## What this project is

A billing/invoicing platform being built as an internship project (Elite Filing /
Operant Labs, NASTP Rawalpindi). There is **no pre-existing frontend codebase** —
only the main marketing site (operantlabs.io) and a static UI mockup (design
reference only, not real code) showing four screens: Dashboard, Invoice list,
Invoice detail, New Invoice form. This app is being built from scratch and will
live on `billing.operantlabs.io` (frontend) / `api.operantlabs.io` (backend).

## Tech stack

- **Backend**: Node.js + Express (plain JavaScript, not TypeScript)
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM (not Prisma — this was changed mid-project)
- **Auth**: JWT access tokens + opaque refresh tokens with rotation (custom-built,
  not a library like Passport/NextAuth)
- **Password hashing**: argon2 (argon2id)
- **Validation**: zod
- **PDF**: PDFKit (planned)
- **Email**: Resend (planned)
- **Payments**: Stripe Checkout (planned) — see payment flow below
- **Deployment**: Frontend on Vercel, backend on Railway/Render, Postgres managed,
  Cloudflare DNS, Let's Encrypt/managed SSL

## Folder structure (backend)

```
routes/          — Express routers, wiring ONLY (path -> controller function).
                   No req/res logic, no business logic here.
controllers/      — All request handling AND business logic lives here.
                   IMPORTANT: there is no separate services/ layer — this was
                   deliberately removed. Controllers talk to the DB directly.
middlewares/      — protect (auth guard), requireRole, rateLimiter (authLimiter), etc.
auth/             — tokens.js: JWT signing/verification, refresh token generation/
                   hashing, cookie config. Framework-agnostic, no Express types.
db/               — schema.js (Drizzle schema), client.js (Drizzle db instance)
```

Route file pattern to follow exactly (see `routes/auth.routes.js` for reference):
```js
import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import { someController } from "../controllers/x.controller.js";
const router = express.Router();
router.use(protect); // if the whole resource needs auth
router.get("/", someController);
export default router;
```

## Auth design (already built)

- Access token: JWT, 15 min expiry, payload `{ sub: userId, role }`, signed with
  `JWT_ACCESS_SECRET`.
- Refresh token: opaque random string (NOT a JWT), 30 day expiry, stored as a
  SHA-256 hash in the `refresh_tokens` table, sent via httpOnly/secure/sameSite=strict
  cookie scoped to `/auth/refresh`.
- **Rotation with reuse detection**: every `/auth/refresh` call revokes the old
  token and issues a new one in the same `familyId`. If a revoked token is
  presented again (replay), the entire family is revoked and the user must log
  in again.
- Login uses a constant-time-ish check (verifies against a dummy hash when the
  user doesn't exist) to avoid email enumeration via timing.
- `protect` middleware reads `Authorization: Bearer <token>`, verifies, sets
  `req.user = { sub, role }`.
- `requireRole('CEO')` / `requireRole('CEO','HR')` for role-gated routes.
- Auth routes (`/register`, `/login`, `/refresh`, `/logout`) deliberately do NOT
  use `protect` — you don't have a token yet when calling them. `logout`
  authenticates via the refresh cookie instead.
- Planned, not yet built: `GET /auth/me` (protected, returns current user).

## Roles

Currently just two: `CEO` and `HR`. Stored as **plain `text`, not a Postgres
enum** — deliberate choice so adding/renaming roles later is a data change, not
a schema migration. The allowed set is enforced in app code:
`ALLOWED_ROLES = ['CEO', 'HR']` in `db/schema.js`, and mirrored in the zod
`z.enum(['CEO','HR'])` in `auth.controller.js`. **Update both places** when a
role is added. Not finalized — may expand later.

## Database schema (Drizzle, see db/schema.js)

Tables: `users`, `refresh_tokens`, `clients`, `contacts`, `invoices`,
`invoice_items`, `payments`, `activity_logs`.

Invoice status enum (this one IS a pgEnum, unlike role):
`DRAFT | PENDING | PAID | OVERDUE | CANCELLED`

Status transitions:
- `DRAFT -> PENDING` on finalize/send
- `PENDING -> PAID` via Stripe webhook (`checkout.session.completed`) — never
  set directly from a client redirect/success page, only from the verified
  webhook
- `PENDING -> OVERDUE` via a daily cron comparing `dueDate` to now
- any -> `CANCELLED` manually

`invoices.stripeSessionId` and `payments.stripeEventId` (unique, for webhook
idempotency) already exist in the schema for this.

## Invoice → payment flow (planned, partly scaffolded)

1. Invoice created as `DRAFT`.
2. Finalize & send: generates PDF, emails client with PDF attached + Stripe
   Checkout link, status -> `PENDING`.
3. Client pays via Stripe Checkout (`metadata.invoiceId` links session to invoice).
4. Stripe webhook (`POST /webhooks/stripe`, no `protect` — verified by Stripe
   signature instead, needs raw body not JSON-parsed) fires
   `checkout.session.completed`.
5. Webhook handler creates a `Payment` row and sets `status = PAID`. Must be
   idempotent (check `stripeEventId` / current status before writing) since
   Stripe retries webhooks.
6. Manual "Record payment" button (in the mockup) also exists as a fallback —
   doesn't require Stripe.

## Full planned route map

### Auth `/auth` — no `protect`

| Endpoint | Description |
|---|---|
| `POST /register` | Creates a user (email + password + optional role), hashes password with argon2, issues an access + refresh token pair. |
| `POST /login` | Verifies credentials (constant-time-ish check to avoid email enumeration), issues a new access + refresh token pair. |
| `POST /refresh` | Reads the refresh cookie, validates + rotates it (old one revoked, new one issued in the same family), returns a new access token. Detects and punishes token reuse (replay attacks) by revoking the whole family. |
| `POST /logout` | Revokes the refresh token tied to the cookie and clears the cookie. |
| `GET /me` *(planned)* | Protected. Returns the currently authenticated user's id/email/role, for the frontend to hydrate auth state on load. |

### Clients `/clients` — `protect`

| Endpoint | Description |
|---|---|
| `GET /` | List clients, with search/filter support for the invoice-creation client picker. |
| `POST /` | Create a new client. |
| `GET /:id` | Fetch one client with its contacts and invoice history. |
| `PUT /:id` | Update client details. |
| `DELETE /:id` | Delete a client (should block or cascade carefully if invoices exist). |
| `POST /:id/contacts` | Add a contact (name/email) under a client. |
| `GET /:id/contacts` | List a client's contacts. |

### Invoices `/invoices` — `protect`

| Endpoint | Description |
|---|---|
| `GET /` | List invoices, filterable by status (Draft/Pending/Paid/Overdue/Cancelled) to power the tabs in the mockup. |
| `POST /` | Create a new invoice as `DRAFT`, with nested line items. |
| `GET /:id` | Fetch one invoice with its client, line items, and payment history. |
| `PUT /:id` | Edit an invoice's line items/dates/client while still in `DRAFT`. |
| `PUT /:id/status` | Manually change status (e.g. mark `CANCELLED`). Day-1 priority per the original brief. |
| `DELETE /:id` | Delete a draft invoice. |
| `POST /:id/finalize` | Locks the invoice, generates the PDF, emails it to the client with the Stripe pay link, moves status `DRAFT -> PENDING`. |
| `POST /:id/send` | Re-sends the invoice email (e.g. reminder) without changing status. |
| `GET /:id/pdf` | Streams/downloads the generated invoice PDF. |
| `POST /:id/checkout-session` | Creates a Stripe Checkout session for this invoice and returns the pay URL. |
| `POST /:id/payments` | Manually record a payment (the "Record payment" button in the mockup) — doesn't require Stripe. |
| `GET /:id/payments` | List all payments recorded against this invoice. |

### Stripe webhook — no `protect`

| Endpoint | Description |
|---|---|
| `POST /webhooks/stripe` | Receives Stripe events, verified by signature (needs the raw request body, not JSON-parsed). On `checkout.session.completed`, creates a `Payment` row and sets the invoice to `PAID`. Must be idempotent since Stripe retries on non-200 responses. |

### Dashboard `/dashboard` — `protect`

| Endpoint | Description |
|---|---|
| `GET /stats` | Aggregate KPIs for the top cards: monthly revenue, annual recurring, outstanding, collected (MTD). |
| `GET /cashflow` | Time-series data (inflow vs outflow, billed vs collected) for the dashboard charts. |

### Quotes `/quotes` — `protect`, not Day-1

| Endpoint | Description |
|---|---|
| `GET /` | List quotes. |
| `POST /` | Create a quote. |
| `GET /:id` | Fetch one quote. |
| `PUT /:id` | Edit a quote. |
| `POST /:id/convert-to-invoice` | Turns an accepted quote into a draft invoice, copying over client and line items. |

### Users `/users` — `protect`, mostly `requireRole('CEO')`

| Endpoint | Description |
|---|---|
| `GET /` | List all user accounts (CEO oversight of who has access). |
| `POST /` | CEO creates/invites an HR (or another CEO) account. |
| `PUT /:id/role` | Change a user's role. |
| `DELETE /:id` | Remove a user's access. |

### Activity logs `/activity-logs` — `protect`

| Endpoint | Description |
|---|---|
| `GET /` | List activity log entries, filterable by `entityId` — powers the invoice timeline panel ("Invoice created", "Sent to client", etc.) in the mockup. |

### Settings `/settings` — `protect`, `requireRole('CEO')`

| Endpoint | Description |
|---|---|
| `GET /` | Fetch company settings (name, default currency, invoice numbering scheme, etc.). |
| `PUT /` | Update company settings. |

**Priority order**: Auth -> Clients CRUD -> Invoices CRUD + status update ->
PDF generation -> Email -> Dashboard stats. Everything else (Quotes, Users,
Settings, Activity logs, Stripe) comes after those work end to end.

## Conventions to follow

- Plain JavaScript with ES modules (`import`/`export`), not TypeScript, not
  CommonJS `require`.
- Controllers export named async functions `(req, res, next)`, wrap logic in
  try/catch, call `next(err)` on error.
- zod for request body validation, schemas defined at the top of the
  controller file they're used in.
- No service layer — resist the urge to add one back in; business logic goes
  in controllers.
- Env vars needed: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `APP_URL`, `API_URL`,
  plus Resend/Stripe/storage keys once those are wired up.

## Not yet decided / open questions

- Whether non-admin (HR) users see all invoices or only their own.
- Whether Stripe gets built this sprint or deferred (their original doc marks
  payments as "future ready", not Day-1).
- Final shape of `settings` (company info, invoice numbering scheme, etc.).