import { z } from "zod";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { users, ALLOWED_ROLES } from "../db/schema.js";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["CEO", "HR"]),
});

const updateRoleSchema = z.object({
  role: z.enum(["CEO", "HR"]),
});

// GET /users — list all user accounts
export async function listUsers(req, res, next) {
  try {
    const data = await db.query.users.findMany({
      columns: { id: true, email: true, role: true, createdAt: true },
      orderBy: (users, { desc }) => [desc(users.createdAt)],
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// POST /users — CEO creates a new user account
export async function createUser(req, res, next) {
  try {
    const { email, password, role } = createUserSchema.parse(req.body);

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, role })
      .returning({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

// PUT /users/:id/role — change a user's role
export async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = updateRoleSchema.parse(req.body);

    const [updated] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, role: users.role, createdAt: users.createdAt });

    if (!updated) return res.status(404).json({ error: "User not found" });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /users/:id — remove a user (blocks self-deletion)
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    if (id === req.user.sub) {
      return res.status(409).json({ error: "Cannot delete your own account" });
    }

    const [deleted] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ error: "User not found" });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
