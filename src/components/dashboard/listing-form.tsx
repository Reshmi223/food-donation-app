"use client";

import { useState, useSyncExternalStore, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Wand2, ImagePlus, Trash2, ShieldCheck, AlertTriangle, Save, Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import {
  FOOD_CATEGORIES, DIETARY_TYPES, QUANTITY_UNITS, STORAGE_CONDITIONS, ALLERGENS,
  TAMIL_NADU_DISTRICTS, labelFor,
} from "@/lib/constants";

export type ListingFormValues = {
  title: string;
  description: string;
  category: string;
  dietary: string;
  quantity: string;
  unit: string;
  servings: string;
  preparedAt: string;
  pickupStartAt: string;
  pickupDeadline: string;
  storage: string;
  allergens: string[];
  packaging: string;
  pickupAddress: string;
  pickupLocality: string;
  district: string;
  contactInstructions: string;
  images: string[];
  notes: string;
  donorConfirmed: boolean;
};

export const EMPTY_LISTING: ListingFormValues = {
  title: "", description: "", category: "", dietary: "VEGETARIAN", quantity: "", unit: "MEALS",
  servings: "", preparedAt: "", pickupStartAt: "", pickupDeadline: "", storage: "AMBIENT",
  allergens: [], packaging: "", pickupAddress: "", pickupLocality: "", district: "Coimbatore",
  contactInstructions: "", images: [], notes: "", donorConfirmed: false,
};

function toLocalInput(date: Date | string): string {
  const d = new Date(date);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

/** Client-side image compression → base64 (max ~4MB after compression). */
async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function ListingForm({ mode, listingId, initial }: {
  mode: "create" | "edit";
  listingId?: string;
  initial?: Partial<ListingFormValues>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ListingFormValues>({ ...EMPTY_LISTING, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [assistantTips, setAssistantTips] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Hydration-safe mount flag (no setState-in-effect).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // Timezone-independent ISO state. Form stores ISO strings; datetime-local
  // inputs display browser-local values only after mount (never during SSR),
  // avoiding server/browser timezone drift entirely.
  const effForm = useMemo(() => {
    if (mounted && !form.preparedAt) {
      const now = Date.now();
      return {
        ...form,
        preparedAt: new Date(now - 3600000).toISOString(),
        pickupStartAt: new Date(now).toISOString(),
        pickupDeadline: new Date(now + 6 * 3600000).toISOString(),
      };
    }
    return form;
     
  }, [mounted, mode, form]);

  const toLocalInput = (iso: string): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const fromLocalInput = (value: string): string => (value ? new Date(value).toISOString() : "");

  const set = <K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function runCategorize() {
    if (form.title.trim().length < 4) {
      toast.error("Enter a title first — then AI can suggest details.");
      return;
    }
    setAiLoading(true);
    setAiNote(null);
    try {
      const res = await api<{ data: { category: string; dietary: string; suggestedAllergens: string[]; missingDetails: string[] }; source: string; note?: string }>(
        "/api/ai/categorize",
        { method: "POST", json: { title: form.title, description: form.description, hasImage: form.images.length > 0 } }
      );
      setForm((f) => ({
        ...f,
        category: res.data.category,
        dietary: res.data.dietary,
        allergens: [...new Set([...f.allergens, ...res.data.suggestedAllergens])],
      }));
      setAiNote(res.note ?? "AI suggestion applied — review before publishing.");
      if (res.data.missingDetails.length) setAssistantTips(res.data.missingDetails);
      toast.success("AI suggestions applied (estimate) — please review.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI assist unavailable.");
    } finally {
      setAiLoading(false);
    }
  }

  async function runAssistant() {
    if (form.title.trim().length < 4 || form.description.trim().length < 10) {
      toast.error("Add a title and short description first.");
      return;
    }
    setAssistantLoading(true);
    setAssistantTips([]);
    try {
      const res = await api<{ data: { improvedTitle?: string; improvedDescription?: string; tips: string[] }; note?: string }>(
        "/api/ai/assistant",
        { method: "POST", json: { title: form.title, description: form.description } }
      );
      if (res.data.improvedTitle) set("title", res.data.improvedTitle);
      if (res.data.improvedDescription) set("description", res.data.improvedDescription);
      setAssistantTips(res.data.tips ?? []);
      setAiNote(res.note ?? null);
      toast.success("AI draft applied (estimate) — verify every fact before publishing.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI assist unavailable.");
    } finally {
      setAssistantLoading(false);
    }
  }

  async function handleImages(files: FileList | null) {
    if (!files?.length) return;
    if (form.images.length + files.length > 6) {
      toast.error("Maximum 6 photos per listing.");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          toast.error(`${file.name}: use JPEG, PNG or WebP.`);
          continue;
        }
        const dataUrl = await compressImage(file);
        const res = await api<{ id: string }>("/api/uploads", {
          method: "POST",
          json: { data: dataUrl, purpose: "FOOD_PHOTO", filename: file.name },
        });
        setForm((f) => ({ ...f, images: [...f.images, res.id] }));
      }
      toast.success("Photo uploaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function validate(): boolean {
    const fe: Record<string, string> = {};
    if (effForm.title.trim().length < 4) fe.title = "Give the listing a descriptive title";
    if (effForm.description.trim().length < 20) fe.description = "Describe the food in at least 20 characters";
    if (!effForm.category) fe.category = "Select a food category";
    const qty = Number(effForm.quantity);
    if (!qty || qty <= 0) fe.quantity = "Quantity must be greater than zero";
    if (!effForm.preparedAt) fe.preparedAt = "Enter the preparation time";
    if (!effForm.pickupStartAt) fe.pickupStartAt = "Enter the pickup start time";
    if (!effForm.pickupDeadline) fe.pickupDeadline = "Enter the pickup deadline";
    const prepared = new Date(effForm.preparedAt).getTime();
    const start = new Date(effForm.pickupStartAt).getTime();
    const deadline = new Date(effForm.pickupDeadline).getTime();
    const now = Date.now();
    if (!Number.isNaN(prepared) && prepared > now + 3600000) fe.preparedAt = "Preparation time cannot be in the future";
    if (!Number.isNaN(deadline) && deadline <= now) fe.pickupDeadline = "Pickup deadline must be in the future";
    if (!Number.isNaN(start) && !Number.isNaN(deadline) && deadline <= start) fe.pickupDeadline = "Deadline must be after pickup start";
    if (!Number.isNaN(prepared) && !Number.isNaN(deadline) && deadline - prepared > 72 * 3600000) {
      fe.pickupDeadline = "Window exceeds 72h from preparation — cooked food is rarely safe this long";
    }
    if (effForm.pickupAddress.trim().length < 8) fe.pickupAddress = "Enter the pickup address (only shared with authorized claimants)";
    if (effForm.pickupLocality.trim().length < 2) fe.pickupLocality = "Enter the pickup locality";
    if (!effForm.donorConfirmed) fe.donorConfirmed = "You must confirm the safety declaration";
    setErrors(fe);
    return Object.keys(fe).length === 0;
  }

  async function submit(status: "DRAFT" | "AVAILABLE") {
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...effForm,
        quantity: Number(effForm.quantity),
        servings: effForm.servings ? Number(effForm.servings) : null,
        preparedAt: effForm.preparedAt,
        pickupStartAt: effForm.pickupStartAt,
        pickupDeadline: effForm.pickupDeadline,
        packaging: form.packaging || null,
        contactInstructions: form.contactInstructions || null,
        notes: form.notes || null,
        status,
      };
      if (mode === "create") {
        await api("/api/listings", { method: "POST", json: payload });
        toast.success(status === "AVAILABLE" ? "Listing published!" : "Draft saved.");
      } else {
        await api(`/api/listings/${listingId}`, { method: "PATCH", json: payload });
        toast.success("Listing updated.");
      }
      router.push("/dashboard/donor/history");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save listing.");
    } finally {
      setSaving(false);
    }
  }

  const deadlineSoon =
    effForm.preparedAt && effForm.pickupDeadline &&
    new Date(effForm.pickupDeadline).getTime() - new Date(effForm.preparedAt).getTime() > 24 * 3600000;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        {/* Basics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Food details</CardTitle>
            <CardDescription>Describe what you&rsquo;re donating. AI can help — always review its suggestions.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="l-title">Title</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary" onClick={runCategorize} disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Wand2 className="h-3.5 w-3.5" aria-hidden />}
                  AI suggest details
                </Button>
              </div>
              <Input id="l-title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Wedding lunch surplus — 120 vegetarian meals" aria-invalid={!!errors.title} />
              {errors.title && <p role="alert" className="text-xs text-destructive">{errors.title}</p>}
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="l-desc">Description</Label>
                <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs text-primary" onClick={runAssistant} disabled={assistantLoading}>
                  {assistantLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Lightbulb className="h-3.5 w-3.5" aria-hidden />}
                  AI improve draft
                </Button>
              </div>
              <Textarea id="l-desc" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What is the food, how was it prepared, how is it packed?" aria-invalid={!!errors.description} />
              {errors.description && <p role="alert" className="text-xs text-destructive">{errors.description}</p>}
            </div>
            {aiNote && (
              <p className="flex items-start gap-1.5 rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary">
                <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {aiNote}
              </p>
            )}
            {assistantTips.length > 0 && (
              <ul className="space-y-1 rounded-lg border border-dashed bg-muted/40 p-3 text-xs text-muted-foreground">
                {assistantTips.map((t, i) => <li key={i} className="flex gap-1.5"><span aria-hidden>•</span> {t}</li>)}
              </ul>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v)}>
                  <SelectTrigger aria-label="Category" aria-invalid={!!errors.category}><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{FOOD_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
                {errors.category && <p role="alert" className="text-xs text-destructive">{errors.category}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label>Dietary</Label>
                <Select value={form.dietary} onValueChange={(v) => set("dietary", v)}>
                  <SelectTrigger aria-label="Dietary"><SelectValue /></SelectTrigger>
                  <SelectContent>{DIETARY_TYPES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Storage condition</Label>
                <Select value={form.storage} onValueChange={(v) => set("storage", v)}>
                  <SelectTrigger aria-label="Storage"><SelectValue /></SelectTrigger>
                  <SelectContent>{STORAGE_CONDITIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="l-qty">Quantity</Label>
                <Input id="l-qty" type="number" min={1} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} aria-invalid={!!errors.quantity} />
                {errors.quantity && <p role="alert" className="text-xs text-destructive">{errors.quantity}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label>Unit</Label>
                <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                  <SelectTrigger aria-label="Unit"><SelectValue /></SelectTrigger>
                  <SelectContent>{QUANTITY_UNITS.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="l-servings">Servings (optional)</Label>
                <Input id="l-servings" type="number" min={0} value={form.servings} onChange={(e) => set("servings", e.target.value)} placeholder="~ people fed" />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Allergen declarations</Label>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((a) => (
                  <label key={a.value} className="cursor-pointer">
                    <Checkbox
                      className="peer sr-only"
                      checked={form.allergens.includes(a.value)}
                      onCheckedChange={(v) =>
                        set("allergens", v ? [...form.allergens, a.value] : form.allergens.filter((x) => x !== a.value))
                      }
                    />
                    <span className="inline-block rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary">
                      {a.label}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Declare all known allergens — leave empty only if none are present.</p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="l-packaging">Packaging (optional)</Label>
              <Input id="l-packaging" value={form.packaging} onChange={(e) => set("packaging", e.target.value)} placeholder="e.g. Sealed disposable meal boxes" />
            </div>
          </CardContent>
        </Card>

        {/* Logistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pickup logistics</CardTitle>
            <CardDescription>Exact address and contact details are only shared with authorized claimants.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="l-address">Pickup address (protected)</Label>
              <Input id="l-address" value={form.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} aria-invalid={!!errors.pickupAddress} placeholder="Building, street, landmarks…" />
              {errors.pickupAddress && <p role="alert" className="text-xs text-destructive">{errors.pickupAddress}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="l-locality">Locality (shown publicly)</Label>
                <Input id="l-locality" value={form.pickupLocality} onChange={(e) => set("pickupLocality", e.target.value)} aria-invalid={!!errors.pickupLocality} />
                {errors.pickupLocality && <p role="alert" className="text-xs text-destructive">{errors.pickupLocality}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label>District</Label>
                <Select value={form.district} onValueChange={(v) => set("district", v)}>
                  <SelectTrigger aria-label="District"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">{TAMIL_NADU_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="l-prepared">Prepared at</Label>
                <Input id="l-prepared" type="datetime-local" value={mounted ? toLocalInput(effForm.preparedAt) : ""} onChange={(e) => set("preparedAt", fromLocalInput(e.target.value))} aria-invalid={!!errors.preparedAt} />
                {errors.preparedAt && <p role="alert" className="text-xs text-destructive">{errors.preparedAt}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="l-start">Pickup starts</Label>
                <Input id="l-start" type="datetime-local" value={mounted ? toLocalInput(effForm.pickupStartAt) : ""} onChange={(e) => set("pickupStartAt", fromLocalInput(e.target.value))} aria-invalid={!!errors.pickupStartAt} />
                {errors.pickupStartAt && <p role="alert" className="text-xs text-destructive">{errors.pickupStartAt}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="l-deadline">Pickup deadline</Label>
                <Input id="l-deadline" type="datetime-local" value={mounted ? toLocalInput(effForm.pickupDeadline) : ""} onChange={(e) => set("pickupDeadline", fromLocalInput(e.target.value))} aria-invalid={!!errors.pickupDeadline} />
                {errors.pickupDeadline && <p role="alert" className="text-xs text-destructive">{errors.pickupDeadline}</p>}
              </div>
            </div>
            {deadlineSoon && !errors.pickupDeadline && (
              <Alert className="border-[oklch(0.83_0.09_90)] bg-[oklch(0.83_0.09_90/0.12)]">
                <AlertTriangle className="h-4 w-4 text-[oklch(0.45_0.09_70)]" />
                <AlertDescription className="text-xs">
                  The pickup deadline is more than 24 hours after preparation. Depending on the food type and storage, this may exceed safe holding times — shorten the window if needed.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="l-contact">Contact instructions (protected)</Label>
              <Input id="l-contact" value={form.contactInstructions} onChange={(e) => set("contactInstructions", e.target.value)} placeholder="Who to ask for on arrival" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="l-notes">Additional notes (optional)</Label>
              <Textarea id="l-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Photos</CardTitle>
            <CardDescription>Up to 6 photos, JPEG/PNG/WebP.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {form.images.map((id) => (
                <div key={id} className="group relative overflow-hidden rounded-lg border">
                  { }
                  <img src={`/api/uploads/${id}`} alt="Food photo" className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    className="absolute right-1 top-1 rounded-full bg-background/90 p-1 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={() => set("images", form.images.filter((i) => i !== id))}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden />
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <ImagePlus className="h-5 w-5" aria-hidden />}
                <span className="text-[11px]">Add photo</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => handleImages(e.target.files)} />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4.5 w-4.5 text-primary" aria-hidden /> Safety declaration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <Switch checked={form.donorConfirmed} onCheckedChange={(v) => set("donorConfirmed", v)} aria-label="Confirm safety declaration" />
              <span className="text-muted-foreground">
                I confirm the declared preparation time, storage conditions, packaging and allergen details are accurate, and this food is safe to redistribute under applicable food-safety rules.
              </span>
            </label>
            {errors.donorConfirmed && <p role="alert" className="text-xs text-destructive">{errors.donorConfirmed}</p>}
            <Alert className="border-primary/30 bg-primary/5">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                Listings can only be claimed after this confirmation. Incomplete safety info keeps your listing out of default search results.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="sticky top-20">
          <CardContent className="grid gap-2.5 p-4">
            <Button onClick={() => submit("AVAILABLE")} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              {mode === "create" ? "Publish listing" : "Save & publish"}
            </Button>
            <Button variant="outline" onClick={() => submit("DRAFT")} disabled={saving}>
              Save as draft
            </Button>
            {mode === "edit" && (
              <Badge variant="outline" className="justify-center border-dashed">Editing existing listing</Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { labelFor };
