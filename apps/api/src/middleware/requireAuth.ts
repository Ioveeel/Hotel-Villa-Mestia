import { eq } from "drizzle-orm";
import type { RequestHandler } from "express";
import { db } from "../db/index.js";
import { admins, sessions } from "../db/schema.js";
import { getSessionToken, hashSessionToken } from "../lib/auth.js";
import { HttpError } from "./errorHandler.js";

export type AuthAdmin = { id: number; email: string; name: string | null };

declare global {
  namespace Express {
    interface Request {
      admin?: AuthAdmin;
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = getSessionToken(req);
  if (!token) throw new HttpError(401, "Unauthorized");

  const sessionId = hashSessionToken(token);
  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      id: admins.id,
      email: admins.email,
      name: admins.name,
    })
    .from(sessions)
    .innerJoin(admins, eq(admins.id, sessions.adminId))
    .where(eq(sessions.id, sessionId));

  if (!row) throw new HttpError(401, "Unauthorized");

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    throw new HttpError(401, "Unauthorized");
  }

  req.admin = { id: row.id, email: row.email, name: row.name };
  next();
};
