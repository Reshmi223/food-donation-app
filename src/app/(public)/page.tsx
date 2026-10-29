import Link from "next/link";
import {
  ArrowRight, HandHeart, Building2, Bike, ShieldCheck, Clock, MapPin,
  Leaf, Recycle, Users, HeartHandshake, ChevronRight, CheckCircle2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveStats } from "@/components/shared/live-stats";
import { ListingPreviews } from "@/components/shared/listing-previews";
import { LogoMark } from "@/components/brand/logo";

const STEPS = [
  {
    icon: HandHeart,
    title: "1 · List surplus food",
    text: "Donors publish what's available — quantities, pickup window, storage and allergen details, with a safety confirmation.",
  },
  {
    icon: ShieldCheck,
    title: "2 · Safety-reviewed discovery",
    text: "Listings with complete safety information become visible to verified NGOs, with locality-level discovery that protects addresses.",
  },
  {
    icon: Building2,
    title: "3 · Claim & confirm",
    text: "NGOs request what they can collect. Donors approve quantities — inventory is reserved atomically so nothing is double-claimed.",
  },
  {
    icon: Bike,
    title: "4 · Pickup, deliver, verify",
    text: "Collection codes and volunteer deliveries confirm every handover, and completed rescues feed real impact analytics.",
  },
];

const FAQS = [
  {
    q: "Is it safe to donate surplus food?",
    a: "REMEAL is built around food safety: every listing records preparation time, storage conditions, packaging and allergens. Donors must confirm their listing details, incomplete safety information is flagged, and listings past their pickup deadline expire automatically. Nothing on the platform is ever certified safe by AI — safety information is declared by the donor and reviewed by the receiving NGO before collection.",
  },
  {
    q: "Who can claim food through REMEAL?",
    a: "Only verified NGOs, charities, shelters and community organizations. Verification requires registration documents that our team reviews. Your organization's verification status is always visible on your dashboard, and unverified organizations cannot submit claims.",
  },
  {
    q: "How does pickup work?",
    a: "Once a donor approves your claim you receive a collection code and exact pickup instructions. You can collect yourself or request a volunteer delivery. Both sides confirm the handover, which keeps the audit trail complete.",
  },
  {
    q: "What does it cost?",
    a: "REMEAL is free for donors, recipient organizations and volunteers. The platform exists to reduce avoidable food waste and help surplus food reach people who need it.",
  },
  {
    q: "Where does REMEAL operate?",
    a: "We are launching in Tamil Nadu, India, and expanding district by district. If your district is not listed yet, register anyway — demand signals help us prioritize expansion.",
  },
  {
    q: "How are AI features used?",
    a: "AI helps categorize listings, draft better descriptions, translate natural-language searches into filters, and summarize demand patterns. Every AI output is clearly labeled as an estimate, and a rule-based fallback works whenever AI is unavailable. AI never certifies food safety.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[oklch(0.954_0.0149_158.25)] dark:bg-[oklch(0.23_0.015_158)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              The Intelligent Food Rescue Network
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Every Meal Matters.
              <br />
              <span className="text-primary">Every Rescue Counts.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              REMEAL connects restaurants, hotels, caterers and event organizers who have safe surplus food
              with verified NGOs, shelters and volunteers who get it to people who need it — safely,
              transparently and fast.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2 text-base">
                <Link href="/register?role=DONOR">
                  Donate Surplus Food <ArrowRight className="h-4.5 w-4.5" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="gap-2 text-base border-primary/40 hover:bg-primary/5">
                <Link href="/register?role=NGO">Join as an NGO</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> Safety-first listings</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> Verified organizations</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-primary" aria-hidden /> Real impact analytics</li>
            </ul>
          </div>
          <div className="relative hidden lg:block">
            <div className="relative mx-auto max-w-md rounded-3xl border bg-card p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <LogoMark size={44} />
                <div>
                  <p className="text-sm font-semibold">Wedding lunch surplus</p>
                  <p className="text-xs text-muted-foreground">Gandhipuram, Coimbatore</p>
                </div>
                <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  120 meals
                </span>
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4 text-primary" aria-hidden /> Pickup window</span>
                  <span className="font-medium">Today, 4:00 – 7:00 PM</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden /> Safety details</span>
                  <span className="font-medium text-primary">Confirmed by donor</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3.5 py-2.5">
                  <span className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4 text-primary" aria-hidden /> Claimed by</span>
                  <span className="font-medium">Verified NGO · 80 meals</span>
                </div>
              </div>
              <div className="mt-5 rounded-xl bg-cream p-4 text-center dark:bg-cream/20">
                <p className="text-sm font-medium text-accent-foreground">This rescue feeds ~120 people and keeps good food out of landfill.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LiveStats />

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="how-heading">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="how-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">How REMEAL works</h2>
          <p className="mt-3 text-muted-foreground">
            A complete rescue workflow — from listing to verified completion — with safety checks at every step.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.title} className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <step.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground" aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/how-it-works" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Detailed workflows for donors, NGOs, volunteers and admins <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      {/* Live listings */}
      <section className="border-y bg-cream/60 py-16 dark:bg-muted/20 sm:py-20" aria-labelledby="listings-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 id="listings-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">Food available right now</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Live listings from donors across Tamil Nadu. Exact pickup addresses are only shared with authorized claimants.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <ListingPreviews />
          </div>
        </div>
      </section>

      {/* Benefits by role */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="benefits-heading">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="benefits-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">Built for everyone in the chain</h2>
          <p className="mt-3 text-muted-foreground">Purpose-built tools for each role in the food rescue journey.</p>
        </div>
        <Tabs defaultValue="donors" className="mt-8">
          <TabsList className="mx-auto grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="donors" className="gap-1.5"><HandHeart className="h-4 w-4" aria-hidden /> Donors</TabsTrigger>
            <TabsTrigger value="ngos" className="gap-1.5"><Building2 className="h-4 w-4" aria-hidden /> NGOs</TabsTrigger>
            <TabsTrigger value="volunteers" className="gap-1.5"><Bike className="h-4 w-4" aria-hidden /> Volunteers</TabsTrigger>
          </TabsList>
          <TabsContent value="donors" className="mt-6">
            <div className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Clock, t: "List in 2 minutes", d: "Guided listing form with AI drafting help and safety prompts." },
                { icon: Building2, t: "Screen requests", d: "Review NGO profiles, approve quantities, and coordinate pickup." },
                { icon: Bike, t: "Optional delivery", d: "Assign verified volunteers when your team can't transport." },
                { icon: Leaf, t: "See your impact", d: "Donation history, rescue charts and downloadable reports." },
              ].map((b) => (
                <div key={b.t}>
                  <b.icon className="h-5 w-5 text-primary" aria-hidden />
                  <h3 className="mt-2.5 font-semibold">{b.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="ngos" className="mt-6">
            <div className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: MapPin, t: "Discover nearby food", d: "Filter by district, quantity, dietary needs and pickup deadline." },
                { icon: ShieldCheck, t: "Trust the details", d: "Storage, allergens and safety confirmations on every listing." },
                { icon: HandHeart, t: "Claim with confidence", d: "Transparent claim workflow with collection codes and history." },
                { icon: Users, t: "Show your impact", d: "Track people served and share verified rescue statistics." },
              ].map((b) => (
                <div key={b.t}>
                  <b.icon className="h-5 w-5 text-primary" aria-hidden />
                  <h3 className="mt-2.5 font-semibold">{b.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="volunteers" className="mt-6">
            <div className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Bike, t: "Deliver when free", d: "Accept assignments that match your availability." },
                { icon: MapPin, t: "Clear routes", d: "Pickup and drop-off instructions shared only with you." },
                { icon: ShieldCheck, t: "Proof of delivery", d: "Upload a photo to close the loop on every drop-off." },
                { icon: HeartHandshake, t: "Direct impact", d: "See exactly which community your deliveries supported." },
              ].map((b) => (
                <div key={b.t}>
                  <b.icon className="h-5 w-5 text-primary" aria-hidden />
                  <h3 className="mt-2.5 font-semibold">{b.t}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{b.d}</p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>

      {/* Impact */}
      <section className="bg-primary py-16 text-primary-foreground dark:bg-[oklch(0.26_0.03_158)] sm:py-20" aria-labelledby="impact-heading">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 id="impact-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
              Food waste is a solvable problem
            </h2>
            <p className="mt-4 leading-relaxed text-primary-foreground/85">
              A large share of food prepared for weddings, conferences, retail shelves and restaurants never gets
              eaten — while neighbors in the same city face hunger. The gap isn't generosity; it's coordination,
              trust and timing. REMEAL closes that gap with verified participants, safety disclosures and a
              workflow that moves food in hours, not days.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Surplus rescued instead of landfilled — cutting methane emissions from organic waste.",
                "Verified NGOs get a dependable, same-day supply channel for community feeding.",
                "Donors get visibility, tax-ready donation reports and a safer goodwill story.",
                "Every metric on the platform comes from real, auditable rescue records.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm text-primary-foreground/90">
                  <Recycle className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-primary-foreground/70">
              Environmental benefit estimates (such as CO₂ avoided) are only shown when a documented conversion
              methodology is enabled by administrators — never invented.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { big: "Hours", small: "not days — food moves the same day it's listed" },
              { big: "Verified", small: "NGOs, donors and volunteers with review trails" },
              { big: "Safety-first", small: "declared storage, allergens and donor confirmation" },
              { big: "Transparent", small: "every claim and delivery leaves an audit trail" },
            ].map((c) => (
              <div key={c.big} className="rounded-2xl bg-primary-foreground/10 p-5 backdrop-blur-sm">
                <p className="text-2xl font-bold">{c.big}</p>
                <p className="mt-1.5 text-sm text-primary-foreground/80">{c.small}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="faq-heading">
        <div className="text-center">
          <h2 id="faq-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
          <p className="mt-3 text-muted-foreground">Everything you need to know before your first rescue.</p>
        </div>
        <Accordion type="single" collapsible className="mt-8">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[oklch(0.954_0.0149_158.25)] to-cream p-8 text-center dark:from-[oklch(0.26_0.03_158)] dark:to-[oklch(0.23_0.015_158)] sm:p-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to rescue your first meal?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Join the network of donors, NGOs and volunteers making sure good food never goes to waste.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/register?role=DONOR">Donate Surplus Food <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary/40">
              <Link href="/register?role=NGO">Join as an NGO</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/register?role=VOLUNTEER">Volunteer</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
