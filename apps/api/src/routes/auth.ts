import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { admins } from "../db/schema.js";
import {
  clearSessionCookieOptions,
  createSession,
  deleteSession,
  getSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyDummyPassword,
  verifyPassword,
} from "../lib/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { loginRateLimit } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/requireAuth.js";

const INVALID_CREDENTIALS = "Invalid email or password";

const loginBody = z.object({
  email: z.string().trim().toLowerCase().min(1).max(254),
  password: z.string().min(1).max(1024),
});

export const authRouter = Router();

authRouter.post("/login", loginRateLimit, async (req, res) => {
  const parsed = loginBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, "email and password are required");
  const { email, password } = parsed.data;

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email));

  // Unknown email still runs argon2 so the response time doesn't reveal it.
  if (!admin) {
    await verifyDummyPassword(password);
    throw new HttpError(401, INVALID_CREDENTIALS);
  }
  if (!(await verifyPassword(admin.passwordHash, password))) {
    throw new HttpError(401, INVALID_CREDENTIALS);
  }

  // Drop any session the client already had (session fixation).
  const oldToken = getSessionToken(req);
  if (oldToken) await deleteSession(oldToken);

  const token = await createSession(admin.id);
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions);
  res.json({ id: admin.id, email: admin.email, name: admin.name });
});

authRouter.post("/logout", async (req, res) => {
  const token = getSessionToken(req);
  if (token) await deleteSession(token);
  res.clearCookie(SESSION_COOKIE, clearSessionCookieOptions);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.admin);
});
