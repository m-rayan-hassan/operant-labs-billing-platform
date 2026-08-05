import { z } from "zod";
import { eq, ilike, sql, and } from "drizzle-orm";
import { db } from "../db/db.js";
import { clients, contacts, invoices } from "../db/schema.js";

// ─── Validation Schemas ─────────────────────────────────────────────────────

const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(255),
  country: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  industry: z.string().max(100).optional(),
  email: z.string().email("Valid email is required").optional(),
});

const updateClientSchema = createClientSchema.partial();

const createContactSchema = z.object({
  name: z.string().min(1, "Contact name is required").max(255),
  email: z.string().email("Valid email is required"),
});

// ─── Controllers ────────────────────────────────────────────────────────────

// GET /clients — list clients with optional search and pagination
export async function listClients(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search?.trim();

    const conditions = [];
    if (search) {
      conditions.push(ilike(clients.name, `%${search}%`));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [data, countResult] = await Promise.all([
      db.query.clients.findMany({
        where,
        with: { contacts: true },
        limit,
        offset,
        orderBy: (clients, { desc }) => [desc(clients.createdAt)],
      }),
      db.select({ count: sql`count(*)::int` }).from(clients).where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    res.json({
      data,
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

// POST /clients — create a new client
export async function createClient(req, res, next) {
  try {
    const body = createClientSchema.parse(req.body);

    const clientData = {
      name: body.name,
      country: body.country,
      address: body.address,
      industry: body.industry,
    };

    const [client] = await db.insert(clients).values(clientData).returning();

    if (body.email) {
      await db.insert(contacts).values({
        clientId: client.id,
        name: body.name,
        email: body.email,
      });
    }

    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
}

// GET /clients/:id — fetch one client with contacts and invoice history
export async function getClient(req, res, next) {
  try {
    const { id } = req.params;

    const client = await db.query.clients.findFirst({
      where: eq(clients.id, id),
      with: {
        contacts: true,
        invoices: {
          orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
        },
      },
    });

    if (!client) return res.status(404).json({ error: "Client not found" });

    res.json(client);
  } catch (err) {
    next(err);
  }
}

// PUT /clients/:id — update client details
export async function updateClient(req, res, next) {
  try {
    const { id } = req.params;
    const body = updateClientSchema.parse(req.body);

    if (Object.keys(body).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    const [updated] = await db
      .update(clients)
      .set(body)
      .where(eq(clients.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "Client not found" });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /clients/:id — delete a client (blocks if invoices exist)
export async function deleteClient(req, res, next) {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(clients)
      .where(eq(clients.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ error: "Client not found" });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// POST /clients/:id/contacts — add a contact under a client
export async function addContact(req, res, next) {
  try {
    const { id } = req.params;
    const body = createContactSchema.parse(req.body);

    // Verify client exists
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, id),
      columns: { id: true },
    });
    if (!client) return res.status(404).json({ error: "Client not found" });

    const [contact] = await db
      .insert(contacts)
      .values({ ...body, clientId: id })
      .returning();

    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
}

// GET /clients/:id/contacts — list a client's contacts
export async function listContacts(req, res, next) {
  try {
    const { id } = req.params;

    // Verify client exists
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, id),
      columns: { id: true },
    });
    if (!client) return res.status(404).json({ error: "Client not found" });

    const data = await db
      .select()
      .from(contacts)
      .where(eq(contacts.clientId, id));

    res.json(data);
  } catch (err) {
    next(err);
  }
}