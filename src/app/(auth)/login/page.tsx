"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, LogIn, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ redirect: string }>("/api/auth/login", {
        method: "POST",
        json: { email, password },
      });
      toast.success("Welcome back!");
      router.push(res.redirect);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign-in failed. Try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your REMEAL account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@organization.org"
              aria-invalid={!!error}
            />
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LogIn className="h-4 w-4" aria-hidden />}
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="mt-5 rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 font-medium text-foreground">
            <Leaf className="h-3.5 w-3.5 text-primary" aria-hidden /> Demo accounts (password: Demo@1234)
          </p>
          <ul className="mt-1.5 grid grid-cols-1 gap-0.5 sm:grid-cols-2">
            {[
              ["donor@demo.remeal.app", "Donor"],
              ["ngo@demo.remeal.app", "NGO"],
              ["volunteer@demo.remeal.app", "Volunteer"],
              ["admin@demo.remeal.app", "Admin"],
            ].map(([em, role]) => (
              <li key={em}>
                <button
                  type="button"
                  className="text-left underline decoration-dotted hover:text-primary"
                  onClick={() => {
                    setEmail(em);
                    setPassword("Demo@1234");
                  }}
                >
                  {em}
                </button>{" "}
                ({role})
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          New to REMEAL?{" "}
          <Link href={`/register${searchParams.get("next") ? `?next=${searchParams.get("next")}` : ""}`} className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
