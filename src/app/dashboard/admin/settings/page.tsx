"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Settings, Save, ToggleLeft, ToggleRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { api, formatDateTime } from "@/lib/api-client";
import { labelFor, FOOD_CATEGORIES } from "@/lib/constants";

type Setting = { key: string; value: string; updatedAt: string };
type Category = { key: string; label: string; active: boolean; sortOrder: number };
type Message = { id: string; name: string; email: string; subject: string; message: string; status: string; createdAt: string };

export default function AdminSettingsPage() {
  const { data, isLoading, mutate } = useSWR<{ settings: Setting[]; categories: Category[]; messages: Message[] }>("/api/admin/settings");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function saveSetting(key: string) {
    const value = edits[key];
    if (value === undefined) return;
    setBusy(true);
    try {
      await api("/api/admin/settings", { method: "PUT", json: { setting: { key, value } } });
      toast.success(`Setting "${key}" updated.`);
      setEdits((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(key: string, active: boolean) {
    try {
      await api("/api/admin/settings", { method: "PUT", json: { category: { key, active } } });
      toast.success(`Category ${active ? "enabled" : "disabled"}.`);
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    }
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const SETTING_LABELS: Record<string, { label: string; hint?: string }> = {
    co2_conversion_enabled: { label: "CO₂ conversion (documented methodology)", hint: "When enabled, environmental estimates use the factor below and are always labeled as estimates." },
    co2_kg_per_kg_food: { label: "CO₂ kg avoided per kg food (factor)" },
    meals_per_kg_estimate: { label: "Meals per kg (conversion estimate)" },
    support_email: { label: "Support email (shown on Contact page)" },
    support_phone: { label: "Support phone" },
    service_radius_default_km: { label: "Default service radius (km)" },
    reservation_expiry_hours: { label: "Reservation expiry (hours)" },
    max_upload_mb: { label: "Max upload size (MB)" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Platform settings</h1>
        <p className="text-sm text-muted-foreground">Configuration, food categories and support messages. Changes are audited.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4.5 w-4.5 text-primary" aria-hidden /> Configuration
            </CardTitle>
            <CardDescription>Platform rules used across the rescue workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.settings.map((s) => {
              const meta = SETTING_LABELS[s.key] ?? { label: s.key };
              const dirty = edits[s.key] !== undefined && edits[s.key] !== s.value;
              return (
                <div key={s.key} className="grid gap-1.5">
                  <Label htmlFor={`set-${s.key}`}>{meta.label}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`set-${s.key}`}
                      value={edits[s.key] ?? s.value}
                      onChange={(e) => setEdits((ed) => ({ ...ed, [s.key]: e.target.value }))}
                    />
                    {dirty && (
                      <Button size="icon" variant="outline" disabled={busy} onClick={() => saveSetting(s.key)} aria-label={`Save ${meta.label}`}>
                        <Save className="h-4 w-4" aria-hidden />
                      </Button>
                    )}
                  </div>
                  {meta.hint && <p className="text-xs text-muted-foreground">{meta.hint}</p>}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Food categories</CardTitle>
            <CardDescription>Disabled categories stop appearing in new listing forms.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.categories.map((c) => (
              <div key={c.key} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">{labelFor(FOOD_CATEGORIES, c.key)}</span>
                <button
                  className="flex items-center gap-1.5 text-xs font-medium"
                  onClick={() => toggleCategory(c.key, !c.active)}
                  aria-pressed={c.active}
                >
                  {c.active ? (
                    <><ToggleRight className="h-5 w-5 text-primary" aria-hidden /> <Badge variant="outline" className="bg-primary/5 text-primary">Active</Badge></>
                  ) : (
                    <><ToggleLeft className="h-5 w-5 text-muted-foreground" aria-hidden /> <Badge variant="outline">Disabled</Badge></>
                  )}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4.5 w-4.5 text-primary" aria-hidden /> Support messages
          </CardTitle>
          <CardDescription>Messages from the public contact form.</CardDescription>
        </CardHeader>
        <CardContent>
          {data.messages.length === 0 ? (
            <EmptyState icon={Mail} title="No messages" description="Contact form submissions appear here." className="py-8" />
          ) : (
            <ul className="max-h-96 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
              {data.messages.map((m) => (
                <li key={m.id} className="rounded-lg border p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{m.subject}</p>
                    <Badge variant={m.status === "NEW" ? "outline" : "secondary"} className={m.status === "NEW" ? "border-primary/40 text-primary" : ""}>
                      {m.status.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{m.name} · {m.email} · {formatDateTime(m.createdAt)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
