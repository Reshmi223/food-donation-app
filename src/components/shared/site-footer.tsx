import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Mail, MapPin, ShieldCheck } from "lucide-react";

const FOOTER_LINKS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Platform",
    links: [
      { label: "Explore Food", href: "/explore" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "About Us", href: "/about" },
      { label: "Contact & Help", href: "/contact" },
    ],
  },
  {
    heading: "Get Involved",
    links: [
      { label: "Donate Surplus Food", href: "/register?role=DONOR" },
      { label: "Join as an NGO", href: "/register?role=NGO" },
      { label: "Volunteer for Delivery", href: "/register?role=VOLUNTEER" },
      { label: "Sign In", href: "/login" },
    ],
  },
  {
    heading: "Trust & Safety",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Food Safety Policy", href: "/safety" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo size={38} showTagline />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Connecting surplus food with communities that need it — safely, transparently, and together.
            </p>
            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" aria-hidden />
                Tamil Nadu, India — expanding across regions
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" aria-hidden />
                <a href="/contact" className="hover:text-foreground">Contact & support</a>
              </p>
            </div>
          </div>
          {FOOTER_LINKS.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h3 className="text-sm font-semibold">{group.heading}</h3>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} REMEAL — The Intelligent Food Rescue Network. Built for food safety and community trust.
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
            Never rely on AI alone for food safety decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}
