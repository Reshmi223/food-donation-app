"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Search, SlidersHorizontal, Sparkles, X, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ListingCard, type PublicListing } from "@/components/shared/listing-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FOOD_CATEGORIES, DIETARY_TYPES, TAMIL_NADU_DISTRICTS, QUANTITY_UNITS } from "@/lib/constants";
import { api } from "@/lib/api-client";

type Filters = {
  q: string;
  categories: string[];
  dietary: string[];
  districts: string[];
  minQuantity: string;
  pickupWindow: string;
  verifiedOnly: boolean;
  safetyConfirmed: boolean;
  sort: string;
};

const DEFAULT_FILTERS: Filters = {
  q: "", categories: [], dietary: [], districts: [],
  minQuantity: "", pickupWindow: "any", verifiedOnly: false, safetyConfirmed: true, sort: "newest",
};

export default function ExplorePage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [nlQuery, setNlQuery] = useState("");
  const [nlResult, setNlResult] = useState<{ listings: PublicListing[]; note: string; filters: Record<string, unknown> } | null>(null);
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

  // Search debouncing (400ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 400);
    return () => clearTimeout(t);
  }, [filters.q]);

  useEffect(() => setPage(1), [filters]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedQ) p.set("q", debouncedQ);
    if (filters.categories.length) p.set("categories", filters.categories.join(","));
    if (filters.dietary.length) p.set("dietary", filters.dietary.join(","));
    if (filters.districts.length) p.set("districts", filters.districts.join(","));
    if (filters.minQuantity) p.set("minQuantity", filters.minQuantity);
    if (filters.pickupWindow !== "any") p.set("pickupWindow", filters.pickupWindow);
    if (filters.verifiedOnly) p.set("verifiedOnly", "true");
    if (!filters.safetyConfirmed) p.set("safetyConfirmed", "false");
    p.set("sort", filters.sort);
    p.set("page", String(page));
    p.set("pageSize", "12");
    return p.toString();
  }, [debouncedQ, filters, page]);

  const { data, isLoading, error } = useSWR<{ listings: PublicListing[]; total: number; pages: number }>(
    `/api/listings?${params}`
  );

  async function runNlSearch() {
    if (nlQuery.trim().length < 3) return;
    setNlLoading(true);
    setNlError(null);
    try {
      const res = await api<{ listings: PublicListing[]; note: string; filters: Record<string, unknown> }>(
        "/api/ai/search",
        { method: "POST", json: { query: nlQuery } }
      );
      setNlResult(res);
    } catch (e) {
      setNlError(e instanceof Error ? e.message : "Search failed. Try again.");
    } finally {
      setNlLoading(false);
    }
  }

  function toggle(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  const activeFilterCount =
    filters.categories.length + filters.dietary.length + filters.districts.length +
    (filters.minQuantity ? 1 : 0) + (filters.pickupWindow !== "any" ? 1 : 0) + (filters.verifiedOnly ? 1 : 0) +
    (filters.safetyConfirmed ? 0 : 1);

  const FilterControls = (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-semibold">Food category</Label>
        <div className="mt-2.5 space-y-2">
          {FOOD_CATEGORIES.map((c) => (
            <label key={c.value} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox
                checked={filters.categories.includes(c.value)}
                onCheckedChange={() => setFilters((f) => ({ ...f, categories: toggle(f.categories, c.value) }))}
              />
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
              <Checkbox
                checked={filters.dietary.includes(d.value)}
                onCheckedChange={() => setFilters((f) => ({ ...f, dietary: toggle(f.dietary, d.value) }))}
              />
              {d.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-sm font-semibold">District</Label>
        <div className="mt-2.5 max-h-48 space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          {TAMIL_NADU_DISTRICTS.map((d) => (
            <label key={d} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox
                checked={filters.districts.includes(d)}
                onCheckedChange={() => setFilters((f) => ({ ...f, districts: toggle(f.districts, d) }))}
              />
              {d}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="min-qty" className="text-sm font-semibold">Minimum quantity</Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="min-qty"
            type="number"
            min={0}
            placeholder="e.g. 10"
            value={filters.minQuantity}
            onChange={(e) => setFilters((f) => ({ ...f, minQuantity: e.target.value }))}
          />
          <Select value={filters.pickupWindow} onValueChange={(v) => setFilters((f) => ({ ...f, pickupWindow: v }))}>
            <SelectTrigger className="w-40" aria-label="Pickup time window">
              <SelectValue placeholder="Pickup time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any time</SelectItem>
              <SelectItem value="today">Before tonight</SelectItem>
              <SelectItem value="tomorrow">Within 24h</SelectItem>
              <SelectItem value="week">This week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox
            checked={filters.verifiedOnly}
            onCheckedChange={(v) => setFilters((f) => ({ ...f, verifiedOnly: Boolean(v) }))}
          />
          Verified donors only
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox
            checked={filters.safetyConfirmed}
            onCheckedChange={(v) => setFilters((f) => ({ ...f, safetyConfirmed: Boolean(v) }))}
          />
          Complete safety info only
        </label>
      </div>
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setFilters(DEFAULT_FILTERS)}>
          <X className="mr-1 h-3.5 w-3.5" /> Clear all filters
        </Button>
      )}
    </div>
  );

  const results = nlResult?.listings ?? data?.listings ?? [];
  const total = nlResult ? nlResult.listings.length : data?.total ?? 0;
  const pages = data?.pages ?? 1;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Explore available food</h1>
        <p className="text-muted-foreground">
          Live surplus food listings across Tamil Nadu. Localities are shown publicly — exact addresses are only
          shared with authorized claimants.
        </p>
      </div>

      {/* Natural language search */}
      <div className="mt-6 rounded-xl border bg-card p-4">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            runNlSearch();
          }}
        >
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden />
            <Input
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder='Try: "vegetarian meals available today near Coimbatore"'
              aria-label="Natural language food search"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={nlLoading || nlQuery.trim().length < 3} className="gap-1.5">
            <Sparkles className="h-4 w-4" aria-hidden /> {nlLoading ? "Understanding…" : "Smart search"}
          </Button>
        </form>
        {nlError && <p className="mt-2 text-sm text-destructive">{nlError}</p>}
        {nlResult && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1 bg-primary/5">
              <Sparkles className="h-3 w-3" aria-hidden /> AI-interpreted
            </Badge>
            <span>{nlResult.note}</span>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setNlResult(null)}>
              <X className="h-3 w-3" /> Clear smart search
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Desktop filters */}
        <aside className="hidden lg:block" aria-label="Listing filters">
          <div className="sticky top-24 rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-semibold">
                <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
                {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
              </h2>
            </div>
            {FilterControls}
          </div>
        </aside>

        <div>
          {/* Search + sort row */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                placeholder="Search food, locality or district…"
                aria-label="Search listings"
                className="pl-9"
              />
            </div>
            <Select value={filters.sort} onValueChange={(v) => setFilters((f) => ({ ...f, sort: v }))}>
              <SelectTrigger className="w-full sm:w-52" aria-label="Sort listings">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="deadline">Pickup deadline soonest</SelectItem>
                <SelectItem value="quantity">Largest quantity</SelectItem>
              </SelectContent>
            </Select>
            {/* Mobile filter trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-1.5 lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters
                  {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                {FilterControls}
              </SheetContent>
            </Sheet>
          </div>

          <p className="mt-4 text-sm text-muted-foreground" role="status">
            {isLoading ? "Loading listings…" : `${total} listing${total === 1 ? "" : "s"} found`}
          </p>

          {error ? (
            <EmptyState
              icon={Search}
              title="Could not load listings"
              description="Something went wrong while loading listings. Check your connection and try again."
              className="mt-4"
              actionLabel="Retry"
              onAction={() => window.location.reload()}
            />
          ) : isLoading ? (
            <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
            </div>
          ) : results.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No listings match your filters"
              description="Try widening your filters or clearing the search — new food is listed throughout the day."
              className="mt-4"
              actionLabel="Clear filters"
              onAction={() => {
                setFilters(DEFAULT_FILTERS);
                setNlResult(null);
              }}
            />
          ) : (
            <>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((l) => <ListingCard key={l.id} listing={l} />)}
              </div>
              {!nlResult && pages > 1 && (
                <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <span className="px-3 text-sm text-muted-foreground">Page {page} of {pages}</span>
                  <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
