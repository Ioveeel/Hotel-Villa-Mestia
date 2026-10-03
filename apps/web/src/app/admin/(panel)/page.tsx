import type { Metadata } from "next";
import { LogoutButton } from "@/components/admin/logout-button";
import { requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminHomePage() {
  const admin = await requireAdmin();

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Hello, {admin.name ?? admin.email}
      </h1>
      <LogoutButton />
    </div>
  );
}
