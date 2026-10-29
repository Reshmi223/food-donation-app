import type { Metadata } from "next";
import { ShieldCheck, AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";

export const metadata: Metadata = { title: "Food Safety Policy" };

const RULES = [
  { icon: Clock, t: "Time & temperature honesty", d: "Listings must state the real preparation time and how food has been stored since. Pickup windows exceeding safe holding periods for the food type are rejected at submission." },
  { icon: FileText, t: "Full disclosure", d: "Storage conditions, packaging and known allergens must be declared. Missing safety information marks a listing as 'incomplete' and it is excluded from default search results." },
  { icon: CheckCircle2, t: "Donor confirmation gate", d: "Nothing goes live until the donor explicitly confirms their declaration is accurate. A form submission alone never certifies safety." },
  { icon: AlertTriangle, t: "Expiry & reporting", d: "Listings auto-expire when their pickup deadline passes. Anyone can report unsafe or misstated listings; reports immediately flag the item for administrator review and possible removal." },
  { icon: ShieldCheck, t: "No AI certification", d: "AI features may help categorize food or suggest allergen fields, but AI can never certify food as safe, and its suggestions always require human review." },
];

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-4xl font-bold tracking-tight">Food Safety Policy</h1>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        Food safety is a core platform requirement — not a feature. These rules apply to every donor,
        recipient organization and administrator on REMEAL. They complement (never replace) applicable
        food-safety regulations from the Food Safety and Standards Authority of India (FSSAI) and local
        authorities.
      </p>
      <div className="mt-10 space-y-4">
        {RULES.map((r) => (
          <div key={r.t} className="flex gap-4 rounded-xl border bg-card p-5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <r.icon className="h-5 w-5 text-primary" aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold">{r.t}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.d}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm leading-relaxed text-muted-foreground">
        <p className="font-medium text-destructive">If you suspect unsafe food is being distributed</p>
        <p className="mt-1">
          Report it from the listing page or the help center immediately. Administrators can remove listings,
          cancel claims and suspend accounts — every action is recorded. For immediate health risks, contact
          your local food safety authority first.
        </p>
      </div>
    </div>
  );
}
