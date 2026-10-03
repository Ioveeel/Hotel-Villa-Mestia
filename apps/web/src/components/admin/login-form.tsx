"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, login } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

function errorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status === 401) return "Invalid email or password";
  if (err instanceof ApiError && err.status === 429) {
    return "Too many attempts. Please try again later.";
  }
  return "Something went wrong. Please try again.";
}

export function LoginForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setSubmitError(null);
    try {
      await login(values.email, values.password);
      router.replace("/admin");
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  }

  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="username"
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "login-email-error" : undefined}
          {...register("email")}
        />
        {emailError && (
          <p id="login-email-error" className="text-sm text-destructive">
            {emailError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "login-password-error" : undefined}
          {...register("password")}
        />
        {passwordError && (
          <p id="login-password-error" className="text-sm text-destructive">
            {passwordError}
          </p>
        )}
      </div>

      {submitError && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
        {isSubmitting ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
