import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ApiError, getMe } from "./api";
import type { Admin } from "./types";

// Server-side only. Server fetch doesn't carry the browser's cookies,
// so the session cookie is forwarded to the API by hand.
export async function sessionHeaders(): Promise<Record<string, string>> {
  const sid = (await cookies()).get("sid")?.value;
  return sid ? { Cookie: `sid=${sid}` } : {};
}

// Cached per request, so layout and page share one /auth/me call
export const getCurrentAdmin = cache(async (): Promise<Admin | null> => {
  try {
    return await getMe({ headers: await sessionHeaders(), cache: "no-store" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
});

// Call at the top of every protected admin page
export async function requireAdmin(): Promise<Admin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
