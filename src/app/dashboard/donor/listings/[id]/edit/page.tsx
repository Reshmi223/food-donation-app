import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ListingForm } from "@/components/dashboard/listing-form";
import { parseJSON } from "@/lib/listing-utils";

export const metadata = { title: "Edit Listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCurrentUser();
  if (!result) redirect("/login");
  const { user } = result;

  const listing = await db.foodListing.findUnique({ where: { id } });
  if (!listing) notFound();
  if (listing.donorId !== user.id && user.role !== "ADMIN") redirect("/dashboard/donor");
  if (!["DRAFT", "AVAILABLE"].includes(listing.status)) redirect("/dashboard/donor/history");

  // Pass raw ISO timestamps; the client form converts to browser-local display.
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit listing</h1>
        <p className="text-sm text-muted-foreground">Update &ldquo;{listing.title}&rdquo;. Changes apply immediately after saving.</p>
      </div>
      <ListingForm
        mode="edit"
        listingId={listing.id}
        initial={{
          title: listing.title,
          description: listing.description,
          category: listing.category,
          dietary: listing.dietary,
          quantity: String(listing.quantity),
          unit: listing.unit,
          servings: listing.servings ? String(listing.servings) : "",
          preparedAt: listing.status === "DRAFT" ? "" : new Date(listing.preparedAt).toISOString(),
          pickupStartAt: listing.status === "DRAFT" ? "" : new Date(listing.pickupStartAt).toISOString(),
          pickupDeadline: listing.status === "DRAFT" ? "" : new Date(listing.pickupDeadline).toISOString(),
          storage: listing.storage,
          allergens: parseJSON<string[]>(listing.allergens, []),
          packaging: listing.packaging ?? "",
          pickupAddress: listing.pickupAddress,
          pickupLocality: listing.pickupLocality,
          district: listing.district,
          contactInstructions: listing.contactInstructions ?? "",
          images: parseJSON<string[]>(listing.images, []),
          notes: listing.notes ?? "",
          donorConfirmed: listing.donorConfirmed,
        }}
      />
    </div>
  );
}
