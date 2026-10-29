"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { Search, SlidersHorizontal, X, MapPin, Sparkles, Loader2, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ListingCard, type PublicListing } from "@/components/shared/listing-card";
import { api, formatDateTime } from "@/lib/api-client";
import { FOOD_CATEGORIES, DIETARY_TYPES, TAMIL_NADU_DISTRICTS, QUANTITY_UNITS } from "@/lib/constants";
import { useSession } from "@/hooks/use-session";

type Filters = {
  q: string; categories: string[]; dietary: string[]; districts: string[];
  minQuantity: string; pickupWindow: string; sort: string;
};

const DEFAULTS: Filters = { q: "", categories: [], dietary: [], districts: [], minQuantity: "", pickupWindow: "any", sort: "deadline" };

export default function NgoBrowsePage() {
  const { user } = useSession();
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [claimFor, setClaimFor] = useState<PublicListing | null>(null);
  const [qty, setQty] = useState("");
  const [people, setPeople] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 400);
    return () => clearTimeout(t);
  }, [filters.q]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (filters.categories.length) p.set("categories", filters.categories.join(","));
    if (filters.dietary.length) p.set("dietary", filters.dietary.join(","));
    if (filters.districts.length) p.set("districts", filters.districts.join(","));
    if (filters.minQuantity) p.set("minQuantity", filters.minQuantity);
    if (filters.pickupWindow !== "any") p.set("pickupWindow", filters.pickupWindow);
    p.set("sort", filters.sort);
    p.set("page", String(page));
    p.set("pageSize", "12");
    return p.toString();
  }, [debouncedQ, filters, page]);

  const { data, isLoading, error } = useSWR<{ listings: PublicListing[]; total: number; pages: number }>(`/api/listings?${params}`);

  function openClaim(l: PublicListing) {
    setClaimFor(l);
    setQty(String(l.remainingQuantity));
    setPeople("");
    setTime("");
    setNotes("");
  }

  async function submitClaim() {
    if (!claimFor) return;
    const q = Number(qty);
    if (!q || q <= 0) return toast.error("Enter the quantity you can collect.");
    if (q > claimFor.remainingQuantity) return toast.error(`Only ${claimFor.remainingQuantity} ${claimFor.unit} available.`);
    setSubmitting(true);
    try {
      await api("/api/claims", {
        method: "POST",
        json: {
          listingId: claimFor.id,
          requestedQuantity: q,
          peopleToServe: people ? Number(people) : null,
          intendedPickupAt: time ? new Date(time).toISOString() : null,
          collectionNotes: notes || null,
        },
      });
      toast.success("Claim submitted — track it under My Claims.");
      setClaimFor(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit claim.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggle(list: string[], v: string): string[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  const filterControls = (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-semibold">Category</Label>
        <div className="mt-2.5 space-y-2">
          {FOOD_CATEGORIES.map((c) => (
            <label key={c.value} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox checked={filters.categories.includes(c.value)} onCheckedChange={() => setFilters((f) => ({ ...f, categories: toggle(f.categories, c.value) }))} />
              {c.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-sm font-semibold">Dietary</Label>
        <div className="mt-2.5 space-y-2">
          {DIETARY_TYPES.filter((d) => d.value !== "UNKNOWN").map((d) => (
            <label key={d.value} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox checked={filters.dietary.includes(d.value)} onCheckedChange={() => setFilters((f) => ({ ...f, dietary: toggle(f.dietary, d.value) }))} />
              {d.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-sm font-semibold">District</Label>
        <div className="mt-2.5 max-h-44 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          {TAMIL_NADU_DISTRICTS.map((d) => (
            <label key={d} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox checked={filters.districts.includes(d)} onCheckedChange={() => setFilters((f) => ({ ...f, districts: toggle(f.districts, d) }))} />
              {d}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor="nq">Min quantity</Label>
          <Input id="nq" type="number" min={0} value={filters.minQuantity} onChange={(e) => setFilters((f) => ({ ...f, minQuantity: e.target.value }))} />
        </div>
        <div className="grid gap-1.5">
          <Label>Pickup by</Label>
          <Select value={filters.pickupWindow} onValueChange={(v) => setFilters((f) => ({ ...f, pickupWindow: v }))}>
            <SelectTrigger aria-label="Pickup window"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="today">Before tonight</SelectItem>
              <SelectItem value="tomorrow">Within 24h</SelectItem>
              <SelectItem value="week">This week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="w-full" onClick={() => setFilters(DEFAULTS)}>
        <X className="mr-1 h-3.5 w-3.5" /> Clear filters
      </Button>
    </div>
  );

  const listings = data?.listings ?? [];
  const verified = user?.verificationStatus === "VERIFIED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Browse available food</h1>
        <p className="text-sm text-muted-foreground">Search listings near you and claim what you can collect.</p>
      </div>

      {!verified && (
        <p className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          You can browse everything, but claiming requires verification.{" "}
          <Link href="/dashboard/ngo/profile" className="font-medium text-primary underline">Submit documents</Link>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-xl border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-1.5 font-semibold">
              <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
            </h2>
            {filterControls}
          </div>
        </aside>

        <div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} placeholder="Search food, locality…" aria-label="Search listings" className="pl-9" />
            </div>
            <Select value={filters.sort} onValueChange={(v) => setFilters((f) => ({ ...f, sort: v }))}>
              <SelectTrigger className="w-full sm:w-52" aria-label="Sort"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Deadline soonest</SelectItem>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="quantity">Largest quantity</SelectItem>
              </SelectContent>
            </Select>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-1.5 lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                {filterControls}
              </SheetContent>
            </Sheet>
          </div>

          <p className="mt-4 text-sm text-muted-foreground" role="status">
            {isLoading ? "Loading…" : `${data?.total ?? 0} listing${data?.total === 1 ? "" : "s"} found`}
          </p>

          {error ? (
            <EmptyState icon={Search} title="Could not load listings" description="Please try again in a moment." className="mt-4" actionLabel="Retry" onAction={() => window.location.reload()} />
          ) : isLoading ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
            </div>
          ) : listings.length === 0 ? (
            <EmptyState icon={MapPin} title="Nothing matches right now" description="New listings arrive throughout the day — try widening your filters." className="mt-4" actionLabel="Clear filters" onAction={() => setFilters(DEFAULTS)} />
          ) : (
            <>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
              {(data?.pages ?? 1) > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {page} of {data?.pages}</span>
                  <Button variant="outline" size="sm" disabled={page >= (data?.pages ?? 1)} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* Claim dialog */}
      <Dialog open={!!claimFor} onOpenChange={(o) => !o && setClaimFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request claim</DialogTitle>
            <DialogDescription>
              &ldquo;{claimFor?.title}&rdquo; — {claimFor?.remainingQuantity} {claimFor && QUANTITY_UNITS.find((u) => u.value === claimFor.unit)?.label.toLowerCase()} available. Pickup by {claimFor && formatDateTime(claimFor.pickupDeadline)}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="c-qty">Quantity to collect</Label>
              <Input id="c-qty" type="number" min={1} max={claimFor?.remainingQuantity} value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-people">Estimated people to serve</Label>
              <Input id="c-people" type="number" min={0} value={people} onChange={(e) => setPeople(e.target.value)} placeholder="e.g. 60" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-time">Intended collection time</Label>
              <Input id="c-time" type="datetime-local" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c-notes">Collection notes (optional)</Label>
              <Textarea id="c-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Vehicle, team size…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimFor(null)}>Cancel</Button>
            <Button onClick={submitClaim} disabled={submitting || !verified}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UtensilsCrossed className="h-4 w-4" aria-hidden />}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
