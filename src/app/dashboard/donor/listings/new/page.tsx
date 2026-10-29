import type { Metadata } from "next";
import { ListingForm, EMPTY_LISTING } from "@/components/dashboard/listing-form";

export const metadata: Metadata = { title: "New Food Listing" };

export default function NewListingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create a food listing</h1>
        <p className="text-sm text-muted-foreground">
          Publish safe surplus food for verified NGOs to claim. Fields marked protected are never public.
        </p>
      </div>
      {/* Time fields prefill client-side (timezone-safe) after mount. */}
      <ListingForm mode="create" initial={EMPTY_LISTING} />
    </div>
  );
}
