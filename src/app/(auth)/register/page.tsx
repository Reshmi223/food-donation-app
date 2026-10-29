"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus, HandHeart, Building2, Bike, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { TAMIL_NADU_DISTRICTS, DONOR_TYPES, NGO_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "DONOR", label: "Food Donor", desc: "Restaurant, hotel, caterer, supermarket or event organizer with surplus food.", icon: HandHeart },
  { value: "NGO", label: "NGO / Charity", desc: "Verified organization that collects and distributes food to communities.", icon: Building2 },
  { value: "VOLUNTEER", label: "Volunteer", desc: "Individuals who help transport food from donors to organizations.", icon: Bike },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState(searchParams.get("role") ?? "DONOR");
  const [form, setForm] = useState({
    displayName: "", organizationName: "", organizationType: "", email: "",
    password: "", confirmPassword: "", phone: "", locality: "", district: "Coimbatore", state: "Tamil Nadu",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const orgTypes = role === "DONOR" ? DONOR_TYPES : NGO_TYPES;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation mirroring server rules
    const fe: Record<string, string> = {};
    if (form.displayName.trim().length < 2) fe.displayName = "Enter your full name";
    if ((role === "DONOR" || role === "NGO") && !form.organizationName.trim()) fe.organizationName = "Organization name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) fe.email = "Enter a valid email address";
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      fe.password = "At least 8 characters with a letter and a number";
    }
    if (form.password !== form.confirmPassword) fe.confirmPassword = "Passwords do not match";
    if (form.phone && !/^(\+91[\s-]?)?[6-9][0-9]{9}$/.test(form.phone.trim())) fe.phone = "Enter a valid Indian mobile number";
    if (!acceptTerms) fe.acceptTerms = "You must accept the terms";
    setFieldErrors(fe);
    if (Object.keys(fe).length) return;

    setLoading(true);
    try {
      const res = await api<{ redirect: string }>("/api/auth/register", {
        method: "POST",
        json: { role, ...form, acceptTerms: true },
      });
      toast.success("Account created — welcome to REMEAL!");
      router.push(res.redirect);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed. Try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>Join the intelligent food rescue network</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Role selection */}
        <div className="grid gap-2.5" role="radiogroup" aria-label="Account type">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={role === r.value}
              onClick={() => setRole(r.value)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all hover:border-primary/50",
                role === r.value && "border-primary bg-primary/5 ring-1 ring-primary"
              )}
            >
              <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", role === r.value ? "bg-primary text-primary-foreground" : "bg-muted")}>
                <r.icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold">{r.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{r.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-5 grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="displayName">Full name</Label>
            <Input id="displayName" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} aria-invalid={!!fieldErrors.displayName} />
            {fieldErrors.displayName && <p role="alert" className="text-xs text-destructive">{fieldErrors.displayName}</p>}
          </div>

          {role !== "VOLUNTEER" && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="orgName">Organization name</Label>
                <Input id="orgName" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} aria-invalid={!!fieldErrors.organizationName} />
                {fieldErrors.organizationName && <p role="alert" className="text-xs text-destructive">{fieldErrors.organizationName}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label>Organization type</Label>
                <Select value={form.organizationType} onValueChange={(v) => setForm({ ...form, organizationType: v })}>
                  <SelectTrigger aria-label="Organization type"><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    {orgTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="r-email">Email</Label>
              <Input id="r-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-invalid={!!fieldErrors.email} />
              {fieldErrors.email && <p role="alert" className="text-xs text-destructive">{fieldErrors.email}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="r-phone">Mobile (optional)</Label>
              <Input id="r-phone" type="tel" placeholder="98400 12345" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} aria-invalid={!!fieldErrors.phone} />
              {fieldErrors.phone && <p role="alert" className="text-xs text-destructive">{fieldErrors.phone}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="r-password">Password</Label>
              <Input id="r-password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} aria-invalid={!!fieldErrors.password} />
              {fieldErrors.password && <p role="alert" className="text-xs text-destructive">{fieldErrors.password}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="r-cpassword">Confirm password</Label>
              <Input id="r-cpassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} aria-invalid={!!fieldErrors.confirmPassword} />
              {fieldErrors.confirmPassword && <p role="alert" className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="r-locality">Locality (optional)</Label>
              <Input id="r-locality" value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>District</Label>
              <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                <SelectTrigger aria-label="District"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {TAMIL_NADU_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-sm">
            <Checkbox checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(Boolean(v))} className="mt-0.5" />
            <span className="text-muted-foreground">
              I accept the <Link href="/terms" className="text-primary underline" target="_blank">Terms of Service</Link> and{" "}
              <Link href="/privacy" className="text-primary underline" target="_blank">Privacy Policy</Link>.
            </span>
          </label>
          {fieldErrors.acceptTerms && <p role="alert" className="-mt-2 text-xs text-destructive">{fieldErrors.acceptTerms}</p>}

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
            {loading ? "Creating account…" : "Create account"}
          </Button>

          {role === "NGO" && (
            <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              NGO accounts start as &ldquo;pending verification&rdquo;. Submit your registration documents after signing up to become eligible to claim food.
            </p>
          )}
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
