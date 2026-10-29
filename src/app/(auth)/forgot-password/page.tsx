"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        json: { email },
      });
      setSent(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>We&rsquo;ll issue a reset link valid for one hour.</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="rounded-lg bg-primary/5 p-4 text-sm text-muted-foreground">{sent}</p>
            <p className="text-xs text-muted-foreground">
              Note: in this deployment no email provider is configured, so no email is actually delivered — the reset link is printed in the server logs.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4" noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="fp-email">Email address</Label>
              <Input id="fp-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
              {loading ? "Requesting…" : "Request reset link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Remembered it? <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
