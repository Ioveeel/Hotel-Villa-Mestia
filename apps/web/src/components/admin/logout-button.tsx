"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function onClick() {
    setPending(true);
    setError(false);
    try {
      await logout();
      router.replace("/admin/login");
    } catch {
      setError(true);
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={onClick} disabled={pending}>
        {pending ? <Loader2 aria-hidden className="animate-spin" /> : <LogOut aria-hidden />}
        Log out
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Could not log out. Please try again.
        </p>
      )}
    </div>
  );
}
