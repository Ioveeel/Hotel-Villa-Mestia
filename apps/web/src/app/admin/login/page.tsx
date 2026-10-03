import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getCurrentAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Log in" };

export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <p className="font-heading text-xl font-semibold tracking-tight">Villa Mestia</p>
          <h1 className="text-muted-foreground">Admin login</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
