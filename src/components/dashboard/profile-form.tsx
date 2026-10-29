"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck, BadgeCheck, Bike, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VerificationBadge } from "@/components/shared/status-badge";
import { api, formatDate } from "@/lib/api-client";
import {
  TAMIL_NADU_DISTRICTS, DONOR_TYPES, NGO_TYPES, FOOD_CATEGORIES,
} from "@/lib/constants";
import type { SessionUser } from "@/hooks/use-session";

type Profile = {
  id: string; email: string; role: string; displayName: string; organizationName: string | null;
  organizationType: string | null; phone: string | null; address: string | null; locality: string | null;
  district: string | null; state: string | null; verificationStatus: string; emailVerified: boolean;
  preferredCategories: string | null; capacityPerPickup: number | null; available: boolean; createdAt: string;
};

export function ProfileForm({ user, children }: { user: SessionUser; children?: React.ReactNode }) {
  const { data, isLoading, mutate } = useSWR<{ profile: Profile }>("/api/profile");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});

  if (isLoading || !data) {
    return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Loading profile…</CardContent></Card>;
  }

  const p = data.profile;
  const merged = { ...p, ...form };
  const orgTypes = user.role === "DONOR" ? DONOR_TYPES : NGO_TYPES;
  const preferred: string[] = p.preferredCategories ? JSON.parse(p.preferredCategories) : [];

  async function save() {
    setSaving(true);
    try {
      await api("/api/profile", {
        method: "PATCH",
        json: {
          displayName: merged.displayName,
          organizationName: merged.organizationName,
          organizationType: merged.organizationType,
          phone: merged.phone,
          address: merged.address,
          locality: merged.locality,
          district: merged.district,
          state: merged.state,
          capacityPerPickup: merged.capacityPerPickup ?? null,
          available: merged.available,
        },
      });
      toast.success("Profile updated.");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof Profile, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile details</CardTitle>
          <CardDescription>Your email and verification status can&rsquo;t be edited here.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="p-name">{user.role === "VOLUNTEER" ? "Full name" : "Contact person"}</Label>
              <Input id="p-name" value={merged.displayName ?? ""} onChange={(e) => set("displayName", e.target.value)} />
            </div>
            {user.role !== "VOLUNTEER" && (
              <div className="grid gap-1.5">
                <Label htmlFor="p-org">Organization name</Label>
                <Input id="p-org" value={merged.organizationName ?? ""} onChange={(e) => set("organizationName", e.target.value)} />
              </div>
            )}
          </div>
          {user.role !== "VOLUNTEER" && (
            <div className="grid gap-1.5">
              <Label>Organization type</Label>
              <Select value={merged.organizationType ?? undefined} onValueChange={(v) => set("organizationType", v)}>
                <SelectTrigger aria-label="Organization type"><SelectValue placeholder="Select type…" /></SelectTrigger>
                <SelectContent>{orgTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="p-phone">Contact number</Label>
              <Input id="p-phone" type="tel" value={merged.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-email">Email (read-only)</Label>
              <Input id="p-email" value={p.email} disabled />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="p-address">Address</Label>
            <Textarea id="p-address" rows={2} value={merged.address ?? ""} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="p-locality">Locality</Label>
              <Input id="p-locality" value={merged.locality ?? ""} onChange={(e) => set("locality", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>District</Label>
              <Select value={merged.district ?? undefined} onValueChange={(v) => set("district", v)}>
                <SelectTrigger aria-label="District"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent className="max-h-60">{TAMIL_NADU_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="p-state">State</Label>
              <Input id="p-state" value={merged.state ?? "Tamil Nadu"} onChange={(e) => set("state", e.target.value)} />
            </div>
          </div>

          {user.role === "NGO" && (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="p-capacity">Serving capacity per pickup (people)</Label>
                <Input
                  id="p-capacity" type="number" min={0}
                  value={merged.capacityPerPickup ?? ""}
                  onChange={(e) => set("capacityPerPickup", e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Food preferences (used for matching & alerts)</Label>
                <div className="flex flex-wrap gap-2">
                  {FOOD_CATEGORIES.map((c) => {
                    const active = preferred.includes(c.value);
                    return (
                      <button
                        key={c.value}
                        type="button"
                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/50"}`}
                        onClick={() => {
                          const next = active ? preferred.filter((x) => x !== c.value) : [...preferred, c.value];
                          setForm((f) => ({ ...f, preferredCategories: JSON.stringify(next) }));
                          api("/api/profile", { method: "PATCH", json: { preferredCategories: next } })
                            .then(() => mutate())
                            .catch(() => toast.error("Could not update preferences."));
                        }}
                      >
                        {active ? <BadgeCheck className="mr-1 inline h-3 w-3" aria-hidden /> : null}
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {user.role === "VOLUNTEER" && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium"><Bike className="h-4 w-4 text-primary" aria-hidden /> Available for deliveries</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Turn off to stop receiving new delivery assignments.</p>
              </div>
              <Switch checked={merged.available ?? true} onCheckedChange={(v) => set("available", v)} aria-label="Availability" />
            </div>
          )}

          <div>
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" aria-hidden /> Account status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Verification</span>
              <VerificationBadge status={p.verificationStatus} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email verified</span>
              {p.emailVerified ? <Badge className="bg-primary/10 text-primary"><BadgeCheck className="mr-1 h-3 w-3" aria-hidden /> Yes</Badge> : <Badge variant="outline">No</Badge>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Member since</span>
              <span>{formatDate(p.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium">{p.role.charAt(0) + p.role.slice(1).toLowerCase()}</span>
            </div>
          </CardContent>
        </Card>
        {children}
      </div>
    </div>
  );
}

export function VerificationPanel() {
  const { data, isLoading, mutate } = useSWR<{ verification: { id: string; reviewStatus: string; registrationNo: string; website: string | null; documentIds: string | null; reviewNotes: string | null; submittedAt: string } | null; accountStatus: string }>("/api/verifications");
  const [form, setForm] = useState({ registrationNo: "", website: "" });
  const [docs, setDocs] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading || !data) return null;

  const v = data.verification;

  async function uploadDocs(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 4 * 1024 * 1024) {
          toast.error(`${file.name} is over 4 MB.`);
          continue;
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res = await api<{ id: string }>("/api/uploads", {
          method: "POST",
          json: { data: dataUrl, purpose: "VERIFICATION_DOC", filename: file.name },
        });
        setDocs((d) => [...d, res.id]);
      }
      toast.success("Document uploaded (private).");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (form.registrationNo.trim().length < 4) {
      toast.error("Enter your registration number.");
      return;
    }
    if (docs.length === 0) {
      toast.error("Upload at least one verification document.");
      return;
    }
    setSubmitting(true);
    try {
      await api("/api/verifications", {
        method: "POST",
        json: { registrationNo: form.registrationNo, website: form.website || undefined, documentIds: docs },
      });
      toast.success("Verification request submitted.");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">NGO verification</CardTitle>
        <CardDescription>Verified organizations can claim food. Documents stay private.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {v ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Review status</span>
              <VerificationBadge status={v.reviewStatus === "APPROVED" ? "VERIFIED" : v.reviewStatus === "REJECTED" ? "REJECTED" : "PENDING"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Registration no.</span>
              <span className="font-medium">{v.registrationNo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Submitted</span>
              <span>{formatDate(v.submittedAt)}</span>
            </div>
            {v.reviewNotes && (
              <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">Reviewer notes: {v.reviewNotes}</p>
            )}
            {v.documentIds && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {JSON.parse(v.documentIds).map((id: string) => (
                  <a key={id} href={`/api/uploads/${id}`} target="_blank" rel="noreferrer" className="rounded-md border px-2 py-1 text-xs text-primary hover:bg-muted">
                    Document
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Submit your organization registration number and a scan/photo of your registration certificate.
            </p>
            <div className="grid gap-1.5">
              <Label htmlFor="v-reg">Registration number</Label>
              <Input id="v-reg" value={form.registrationNo} onChange={(e) => setForm({ ...form, registrationNo: e.target.value })} placeholder="e.g. TN/2020/0012345" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="v-web">Website (optional)</Label>
              <Input id="v-web" type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" />
            </div>
            <div>
              <Label>Documents</Label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {docs.map((id) => (
                  <span key={id} className="flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs">
                    Document
                    <button type="button" aria-label="Remove document" onClick={() => setDocs((d) => d.filter((x) => x !== id))}>
                      <X className="h-3 w-3 text-destructive" aria-hidden />
                    </button>
                  </span>
                ))}
                <label className="cursor-pointer rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">
                  {uploading ? <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden /> : null}
                  Upload document
                  <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple className="sr-only" onChange={(e) => uploadDocs(e.target.files)} />
                </label>
              </div>
            </div>
            <Button onClick={submit} disabled={submitting || uploading} className="w-full gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
              Submit for review
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
