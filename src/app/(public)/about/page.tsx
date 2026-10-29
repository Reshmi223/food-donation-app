import type { Metadata } from "next";
import Link from "next/link";
import { Target, Eye, Globe2, HeartHandshake, ShieldCheck, Scale, Sparkles, ArrowRight, MapPin, Users, Leaf, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "About Us" };

const PRINCIPLES = [
  { icon: ShieldCheck, title: "Safety before speed", text: "No rescue is worth an unsafe meal. Safety disclosures, donor confirmation and review workflows are non-negotiable." },
  { icon: Scale, title: "Dignity by default", text: "We protect recipient privacy, share only the data each party needs, and never treat communities as photo opportunities." },
  { icon: Sparkles, title: "AI assists, people decide", text: "AI suggestions are always labeled as estimates and always reviewable. No algorithm certifies food or assigns people." },
  { icon: Globe2, title: "Built for Bharat, district by district", text: "Launching in Tamil Nadu with local languages, local regulations and local partners in mind — then expanding outward." },
];

const ROADMAP = [
  { phase: "Now", title: "Tamil Nadu launch", text: "Core rescue workflows across all 38 districts, NGO verification, volunteer deliveries and impact analytics.", active: true },
  { phase: "Next", title: "Regional expansion", text: "Multilingual support (Tamil first), SMS notifications, deeper supermarket integrations and tax-ready donor reports.", active: false },
  { phase: "Later", title: "Smarter matching", text: "Geospatial route optimization, demand-driven pickup windows, and partnerships with municipal food-waste programs.", active: false },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">About REMEAL</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We exist to make sure that safe, good food never goes to waste while people in the same city go hungry.
        </p>
      </div>

      {/* Mission / vision */}
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <Target className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="mt-3 text-xl font-bold">Our mission</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              To build the trust infrastructure for food rescue in India — connecting surplus food from
              restaurants, hotels, caterers, supermarkets and events with verified community organizations,
              safely and within hours, through transparent workflows and real accountability.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Eye className="h-6 w-6 text-primary" aria-hidden />
            <h2 className="mt-3 text-xl font-bold">Our vision</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              A country where every event planner, restaurant manager and store owner thinks &ldquo;REMEAL
              first&rdquo; when food is left over — and where no verified NGO has to turn people away because
              surplus food couldn&rsquo;t find its way to them in time.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* The challenge */}
      <section className="mt-16" aria-labelledby="challenge">
        <h2 id="challenge" className="text-2xl font-bold tracking-tight sm:text-3xl">The challenge we&rsquo;re tackling</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, stat: "Hunger & surplus coexist", text: "Community kitchens face daily shortfalls while weddings, conferences and retail shelves in the same district discard edible food." },
            { icon: MapPin, stat: "Coordination is the gap", text: "Donors want to help but lack a trusted channel; NGOs lack real-time visibility into what's available where." },
            { icon: Leaf, stat: "Waste compounds", text: "Organic waste in landfills generates methane — a greenhouse gas far more potent than CO₂ over the short term." },
            { icon: TrendingUp, stat: "Trust unlocks volume", text: "Safety disclosures, verified identities and audit trails turn one-off goodwill into dependable weekly rescues." },
          ].map((c) => (
            <div key={c.stat} className="rounded-xl border bg-card p-5">
              <c.icon className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="mt-3 font-semibold leading-snug">{c.stat}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Principles */}
      <section className="mt-16" aria-labelledby="principles">
        <h2 id="principles" className="text-2xl font-bold tracking-tight sm:text-3xl">Platform principles</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="flex gap-4 rounded-xl border bg-card p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <p.icon className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Roadmap */}
      <section className="mt-16" aria-labelledby="roadmap">
        <h2 id="roadmap" className="text-2xl font-bold tracking-tight sm:text-3xl">Expansion roadmap</h2>
        <ol className="mt-6 space-y-4">
          {ROADMAP.map((r) => (
            <li key={r.phase} className={`flex gap-4 rounded-xl border p-5 ${r.active ? "bg-primary/5 border-primary/30" : "bg-card"}`}>
              <span className={`flex h-9 shrink-0 items-center rounded-full px-3.5 text-xs font-bold uppercase tracking-wide ${r.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {r.phase}
              </span>
              <div>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 rounded-3xl bg-primary p-8 text-center text-primary-foreground sm:p-12">
        <HeartHandshake className="mx-auto h-8 w-8" aria-hidden />
        <h2 className="mt-4 text-2xl font-bold sm:text-3xl">Rescue Food. Restore Hope.</h2>
        <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
          Whether you cook, serve, distribute or drive — there is a place for you in the network.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-6 gap-2">
          <Link href="/register">Join REMEAL <ArrowRight className="h-4 w-4" aria-hidden /></Link>
        </Button>
      </section>
    </div>
  );
}
