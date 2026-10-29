"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Clock, MapPin, Package, ShieldCheck, AlertTriangle, UtensilsCrossed,
  Users, Thermometer, Boxes, Building2, Phone, Flag, Info, BadgeCheck, CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FoodImage } from "@/components/shared/food-image";
import { ListingStatusBadge, VerificationBadge } from "@/components/shared/status-badge";
import { useSession } from "@/hooks/use-session";
import { api, formatDateTime } from "@/lib/api-client";
import { labelFor, FOOD_CATEGORIES, DIETARY_TYPES, STORAGE_CONDITIONS, ALLERGENS, QUANTITY_UNITS } from "@/lib/constants";

type DetailListing = {
  id: string;
  title: string;
  description: string;
  category: string;
  dietary: string;
  quantity: number;
  remainingQuantity: number;
  unit: string;
  servings?: number | null;
  preparedAt: string;
  pickupStartAt: string;
  pickupDeadline: string;
  pickupLocality: string;
  district: string;
  storage: string;
  allergens?: string | null;
  images?: string | null;
  status: string;
  safetyReview: string;
  donorVerified: boolean;
  donorOrganization?: string | null;
  donorPhone?: string | null;
  pickupAddress?: string | null;
  contactInstructions?: string | null;
  hoursLeft: number;
};

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const [listing, setListing] = useState<DetailListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimQty, setClaimQty] = useState("");
  const [peopleToServe, setPeopleToServe] = useState("");
  const [intendedPickup, setIntendedPickup] = useState("");
  const [collectionNotes, setCollectionNotes] = useState("");
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportCategory, setReportCategory] = useState("SPOILED_FOOD");
  const [reportText, setReportText] = useState("");

  useEffect(() => {
    setLoading(true);
    api<{ listing: DetailListing }>(`/api/listings/${params.id}`)
      .then((res) => {
        setListing(res.listing);
        setClaimQty(res.listing.remainingQuantity > 0 ? String(res.listing.remainingQuantity) : "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load listing"))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function submitClaim() {
    if (!listing) return;
    const qty = Number(claimQty);
    if (!qty || qty <= 0) {
      toast.error("Enter the quantity you can collect.");
      return;
    }
    if (qty > listing.remainingQuantity) {
      toast.error(`Only ${listing.remainingQuantity} ${listing.unit} are available.`);
      return;
    }
    setClaimSubmitting(true);
    try {
      await api("/api/claims", {
        method: "POST",
        json: {
          listingId: listing.id,
          requestedQuantity: qty,
          peopleToServe: peopleToServe ? Number(peopleToServe) : null,
          intendedPickupAt: intendedPickup ? new Date(intendedPickup).toISOString() : null,
          collectionNotes: collectionNotes || null,
        },
      });
      toast.success("Claim request submitted — the donor will review it shortly.");
      setClaimOpen(false);
      router.push("/dashboard/ngo/claims");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit claim.");
    } finally {
      setClaimSubmitting(false);
    }
  }

  async function submitReport() {
    if (!listing) return;
    if (reportText.trim().length < 15) {
      toast.error("Describe the issue in at least 15 characters.");
      return;
    }
    try {
      await api("/api/safety-reports", {
        method: "POST",
        json: { listingId: listing.id, category: reportCategory, description: reportText },
      });
      toast.success("Report submitted — our safety team will review it.");
      setReportOpen(false);
      setReportText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit report.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-6 h-80 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <CircleAlert className="mx-auto mb-4 h-10 w-10 text-destructive" aria-hidden />
        <h1 className="text-xl font-semibold">{error ?? "Listing not found"}</h1>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/explore"><ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back to Explore</Link>
        </Button>
      </div>
    );
  }

  const allergens: string[] = listing.allergens ? JSON.parse(listing.allergens) : [];
  const images: string[] = listing.images ? JSON.parse(listing.images) : [];
  const isExpired = listing.hoursLeft <= 0 || !["AVAILABLE", "PARTIALLY_RESERVED", "FULLY_RESERVED"].includes(listing.status);
  const canClaim = user?.role === "NGO" && !isExpired;
  const isVerifiedNgo = user?.role === "NGO" && user.verificationStatus === "VERIFIED";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Button asChild variant="ghost" size="sm" className="mb-5 -ml-2">
        <Link href="/explore"><ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back to Explore</Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden py-0">
            <div className="relative h-60 bg-muted sm:h-72">
              <FoodImage
                category={listing.category}
                imageId={images[0]}
                alt={listing.title}
                className="h-60 w-full object-cover sm:h-72"
              />
              <div className="absolute left-3 top-3 flex gap-2">
                <ListingStatusBadge status={listing.status} />
                {listing.donorVerified && (
                  <Badge className="gap-1 border-transparent bg-card/90 text-primary">
                    <BadgeCheck className="h-3 w-3" aria-hidden /> Verified donor
                  </Badge>
                )}
              </div>
            </div>
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{listing.title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {labelFor(FOOD_CATEGORIES, listing.category)} · {labelFor(DIETARY_TYPES, listing.dietary)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary tabular-nums">{listing.remainingQuantity}</p>
                  <p className="text-xs text-muted-foreground">{labelFor(QUANTITY_UNITS, listing.unit)} available</p>
                </div>
              </div>

              {listing.hoursLeft <= 4 && listing.hoursLeft > 0 && (
                <Alert className="mt-4 border-destructive/40 bg-destructive/5">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <AlertDescription>
                    Pickup deadline is in about {listing.hoursLeft} hour{listing.hoursLeft === 1 ? "" : "s"} — claim quickly if you can collect.
                  </AlertDescription>
                </Alert>
              )}

              <Separator className="my-5" />
              <p className="leading-relaxed text-muted-foreground">{listing.description}</p>

              <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dt className="font-medium">Prepared</dt>
                    <dd className="text-muted-foreground">{formatDateTime(listing.preparedAt)}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dt className="font-medium">Pickup window</dt>
                    <dd className="text-muted-foreground">
                      {formatDateTime(listing.pickupStartAt)} → {formatDateTime(listing.pickupDeadline)}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dt className="font-medium">Pickup area</dt>
                    <dd className="text-muted-foreground">{listing.pickupLocality}, {listing.district}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Thermometer className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dt className="font-medium">Storage</dt>
                    <dd className="text-muted-foreground">{labelFor(STORAGE_CONDITIONS, listing.storage)}</dd>
                  </div>
                </div>
                {listing.servings ? (
                  <div className="flex items-start gap-2.5">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <div>
                      <dt className="font-medium">Servings</dt>
                      <dd className="text-muted-foreground">~{listing.servings} people</dd>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-start gap-2.5">
                  <Boxes className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dt className="font-medium">Original quantity</dt>
                    <dd className="text-muted-foreground">{listing.quantity} {labelFor(QUANTITY_UNITS, listing.unit)}</dd>
                  </div>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4.5 w-4.5 text-primary" aria-hidden /> Food safety information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {listing.safetyReview === "DONOR_CONFIRMED" ? (
                <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <p className="text-muted-foreground">
                    The donor confirmed the declared details (preparation time, storage, packaging) are accurate.
                    Always verify condition on collection before accepting food.
                  </p>
                </div>
              ) : (
                <Alert className="border-[oklch(0.83_0.09_90)] bg-[oklch(0.83_0.09_90/0.15)]">
                  <AlertTriangle className="h-4 w-4 text-[oklch(0.45_0.09_70)]" />
                  <AlertTitle className="text-sm">Safety details not yet confirmed</AlertTitle>
                  <AlertDescription className="text-xs">
                    The donor has not confirmed the safety declaration for this listing. Review carefully on collection.
                  </AlertDescription>
                </Alert>
              )}
              <div>
                <p className="font-medium">Allergen declarations</p>
                {allergens.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {allergens.map((a) => (
                      <Badge key={a} variant="outline">{labelFor(ALLERGENS, a)}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">No allergens declared — confirm with the donor if you serve people with allergies.</p>
                )}
              </div>
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Food safety cannot be certified by AI or by this platform. Use qualified local guidance and your own judgment before distributing food.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="lg:sticky lg:top-24">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4.5 w-4.5 text-primary" aria-hidden /> Donor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Organization</span>
                <span className="font-medium">{listing.donorOrganization ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Donor status</span>
                <VerificationBadge status={listing.donorVerified ? "VERIFIED" : "PENDING"} />
              </div>
              {listing.pickupAddress && (
                <>
                  <Separator />
                  <div>
                    <p className="font-medium">Pickup address</p>
                    <p className="mt-1 text-muted-foreground">{listing.pickupAddress}</p>
                  </div>
                </>
              )}
              {listing.donorPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-muted-foreground">{listing.donorPhone}</span>
                </div>
              )}
              {listing.contactInstructions && (
                <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Contact instructions</p>
                  <p className="mt-1">{listing.contactInstructions}</p>
                </div>
              )}

              <Separator />

              {!user ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Sign in as a verified NGO to claim this food.</p>
                  <Button asChild className="w-full">
                    <Link href="/login">Sign in to claim</Link>
                  </Button>
                </div>
              ) : canClaim ? (
                isVerifiedNgo ? (
                  <Button className="w-full gap-1.5" onClick={() => setClaimOpen(true)}>
                    <UtensilsCrossed className="h-4 w-4" aria-hidden /> Request claim
                  </Button>
                ) : (
                  <Alert className="border-[oklch(0.83_0.09_90)] bg-[oklch(0.83_0.09_90/0.12)]">
                    <AlertTriangle className="h-4 w-4 text-[oklch(0.45_0.09_70)]" />
                    <AlertDescription className="text-xs">
                      Your organization is not verified yet. <Link href="/dashboard/ngo/profile" className="font-medium underline">Submit verification documents</Link> to claim food.
                    </AlertDescription>
                  </Alert>
                )
              ) : isExpired ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CircleAlert className="h-3.5 w-3.5" aria-hidden /> This listing is no longer accepting claims.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Claims are available to verified NGO accounts. You are signed in as {user.role.toLowerCase()}.
                </p>
              )}

              {user && (
                <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground" onClick={() => setReportOpen(true)}>
                  <Flag className="h-3.5 w-3.5" aria-hidden /> Report this listing
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request claim</DialogTitle>
            <DialogDescription>
              Tell the donor what you can collect from &ldquo;{listing.title}&rdquo;. The donor reviews every request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="claim-qty">Quantity to collect ({listing.unit.toLowerCase()})</Label>
              <Input
                id="claim-qty"
                type="number"
                min={1}
                max={listing.remainingQuantity}
                value={claimQty}
                onChange={(e) => setClaimQty(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{listing.remainingQuantity} {listing.unit.toLowerCase()} currently available.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="claim-people">Estimated people to serve</Label>
              <Input
                id="claim-people"
                type="number"
                min={0}
                value={peopleToServe}
                onChange={(e) => setPeopleToServe(e.target.value)}
                placeholder="e.g. 80"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="claim-time">Intended collection time</Label>
              <Input
                id="claim-time"
                type="datetime-local"
                value={intendedPickup}
                onChange={(e) => setIntendedPickup(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="claim-notes">Collection notes (optional)</Label>
              <Textarea
                id="claim-notes"
                value={collectionNotes}
                onChange={(e) => setCollectionNotes(e.target.value)}
                placeholder="Vehicle, team size, anything the donor should know…"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimOpen(false)}>Cancel</Button>
            <Button onClick={submitClaim} disabled={claimSubmitting}>
              {claimSubmitting ? "Submitting…" : "Submit claim request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Report this listing</DialogTitle>
            <DialogDescription>
              Report inaccurate or potentially unsafe listings. Our safety team reviews every report.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Issue type</Label>
              <Select value={reportCategory} onValueChange={setReportCategory}>
                <SelectTrigger aria-label="Report category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SPOILED_FOOD">Spoiled / unsafe food</SelectItem>
                  <SelectItem value="WRONG_INFO">Inaccurate information</SelectItem>
                  <SelectItem value="HYGIENE_CONCERN">Hygiene concern</SelectItem>
                  <SelectItem value="ALLERGEN_MISSING">Missing allergen info</SelectItem>
                  <SelectItem value="SUSPICIOUS">Suspicious activity</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-text">What happened?</Label>
              <Textarea
                id="report-text"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={4}
                placeholder="Describe the issue clearly…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitReport}>Submit report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
