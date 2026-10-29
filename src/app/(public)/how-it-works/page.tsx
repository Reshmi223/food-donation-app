import type { Metadata } from "next";
import Link from "next/link";
import { HandHeart, Building2, Bike, ShieldCheck, ArrowRight, ClipboardCheck, MapPin, BadgeCheck, Search, PackageCheck, FileCheck2, BarChart3, UserCog, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "How It Works" };

const WORKFLOWS = [
  {
    icon: HandHeart,
    role: "For food donors",
    color: "bg-primary/10 text-primary",
    steps: [
      { icon: FileCheck2, title: "Create your account", text: "Register your restaurant, hotel, caterer, supermarket or event operation and complete the organization profile." },
      { icon: ClipboardCheck, title: "List surplus food", text: "Describe the food, quantity, preparation time, storage, packaging, allergens and pickup window. Confirm the safety declaration to publish." },
      { icon: BadgeCheck, title: "Review claims", text: "Verified NGOs request quantities. You approve, adjust or reject — accepted quantities are reserved instantly so nothing is double-claimed." },
      { icon: PackageCheck, title: "Hand over & verify", text: "Share pickup instructions at the right time, confirm collection, and track the rescue to completion with a full history." },
    ],
    cta: { label: "Donate surplus food", href: "/register?role=DONOR" },
  },
  {
    icon: Building2,
    role: "For NGOs & community organizations",
    color: "bg-secondary/10 text-secondary",
    steps: [
      { icon: FileCheck2, title: "Get verified", text: "Register and submit registration documents. Our team reviews and verifies your organization — unverified accounts cannot claim." },
      { icon: Search, title: "Discover food", text: "Browse available listings filtered by district, quantity, dietary needs, storage and pickup deadline. Natural-language search is supported." },
      { icon: ClipboardCheck, title: "Claim & coordinate", text: "Request what you can collect, state how many people you serve, and agree a pickup time. You receive a collection code when approved." },
      { icon: PackageCheck, title: "Collect & confirm", text: "Collect yourself or request a volunteer delivery, then confirm completion to close the loop and build your impact record." },
    ],
    cta: { label: "Join as an NGO", href: "/register?role=NGO" },
  },
  {
    icon: Bike,
    role: "For delivery volunteers",
    color: "bg-[oklch(0.83_0.09_90/0.4)] text-[oklch(0.42_0.09_65)]",
    steps: [
      { icon: UserCog, title: "Register & get verified", text: "Create a volunteer account. Platform admins review volunteer registrations before assignments appear." },
      { icon: MapPin, title: "Accept assignments", text: "See pickup and drop-off details for your assigned deliveries only — addresses stay protected from the public." },
      { icon: Bike, title: "Update progress", text: "Move through Accepted → On the Way → Picked Up → Delivered so everyone stays informed in real time." },
      { icon: BadgeCheck, title: "Prove delivery", text: "Upload proof-of-delivery photos to complete verified drop-offs and build your delivery history." },
    ],
    cta: { label: "Volunteer for delivery", href: "/register?role=VOLUNTEER" },
  },
  {
    icon: ShieldCheck,
    role: "For platform administrators",
    color: "bg-muted text-foreground",
    steps: [
      { icon: FileCheck2, title: "Verify organizations", text: "Review NGO documents and approve or reject with recorded reasons. Every decision is audited." },
      { icon: Flag, title: "Moderate listings", text: "Review flagged listings and safety reports; remove unsafe or fraudulent content with a documented trail." },
      { icon: BarChart3, title: "Monitor the network", text: "Track users, listings, claims, disputes and trends from a dedicated admin dashboard with CSV exports." },
      { icon: ShieldCheck, title: "Keep the platform safe", text: "Suspend abusive accounts, review disputes, and configure platform rules — all server-authorized and logged." },
    ],
    cta: { label: "Contact the team", href: "/contact" },
  },
];

const SAFETY_NOTES = [
  "Pickup deadlines are enforced — overdue listings expire automatically and leave public view.",
  "Exact pickup addresses and contact details are only revealed to authorized claimants and assigned volunteers.",
  "Accepted claim quantities are reserved atomically, so two NGOs can never reserve the same food.",
  "Every status change is written to an immutable status history and audit log.",
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">How REMEAL works</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          One coordinated network, four role-specific workflows — designed so food moves safely from surplus to community.
        </p>
      </div>

      <div className="mt-14 space-y-12">
        {WORKFLOWS.map((flow) => (
          <section key={flow.role} aria-labelledby={flow.role} className="rounded-2xl border bg-card p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${flow.color}`}>
                <flow.icon className="h-5.5 w-5.5" aria-hidden />
              </span>
              <h2 id={flow.role} className="text-2xl font-bold tracking-tight">{flow.role}</h2>
            </div>
            <ol className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {flow.steps.map((s, i) => (
                <li key={s.title} className="relative rounded-xl border bg-background p-4">
                  <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <s.icon className="mt-2 h-5 w-5 text-primary" aria-hidden />
                  <h3 className="mt-2.5 font-semibold leading-snug">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6">
              <Button asChild variant="outline" className="gap-1.5">
                <Link href={flow.cta.href}>{flow.cta.label} <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </Button>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-14 rounded-2xl border bg-cream/60 p-6 dark:bg-muted/20 sm:p-8" aria-labelledby="safety-notes">
        <h2 id="safety-notes" className="text-xl font-bold tracking-tight">Safety rails across every workflow</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {SAFETY_NOTES.map((n) => (
            <li key={n} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary" aria-hidden />
              {n}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-14 text-center">
        <Button asChild size="lg" className="gap-2">
          <Link href="/register">Get started today <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </Button>
      </div>
    </div>
  );
}
