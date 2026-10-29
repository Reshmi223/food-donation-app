"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8 || !/[0-9]/.test(password)) {
      toast.error("Password must be at least 8 characters and include a number.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        json: { token, password, confirmPassword },
      });
      toast.success("Password updated — sign in with your new password.");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Invalid reset link</CardTitle>
          <CardDescription>This link is missing its reset token.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full"><Link href="/forgot-password">Request a new link</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Choose a new password</CardTitle>
        <CardDescription>At least 8 characters, including a number.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="np">New password</Label>
            <Input id="np" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cp">Confirm password</Label>
            <Input id="cp" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
