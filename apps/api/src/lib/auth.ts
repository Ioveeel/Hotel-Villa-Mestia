import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import type { CookieOptions, Request } from "express";
import { db } from "../db/index.js";
import { sessions } from "../db/schema.js";

export const SESSION_COOKIE = "sid";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Used by both res.cookie and res.clearCookie: the browser only clears
// a cookie when path/sameSite/secure match the ones it was set with.
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export const sessionCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: SESSION_TTL_MS,
};

export const clearSessionCookieOptions = baseCookieOptions;

export const hashPassword = (password: string) =>
  argon2.hash(password, { type: argon2.argon2id });

export const verifyPassword = (hash: string, password: string) =>
  argon2.verify(hash, password);

// Verified against when the email is unknown, so both cases take similar time.
const dummyHashPromise = hashPassword(randomBytes(32).toString("hex"));

export async function verifyDummyPassword(password: string): Promise<void> {
  await argon2.verify(await dummyHashPromise, password);
}

export const hashSessionToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

// Only the hash is stored; the token goes to the client in the cookie.
export async function createSession(adminId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    id: hashSessionToken(token),
    adminId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
}

const TOKEN_FORMAT = /^[0-9a-f]{64}$/;

export function getSessionToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const eqIndex = part.indexOf("=");
    if (eqIndex === -1) continue;
    if (part.slice(0, eqIndex).trim() !== SESSION_COOKIE) continue;
    const value = part.slice(eqIndex + 1).trim();
    return TOKEN_FORMAT.test(value) ? value : null;
  }
  return null;
}
