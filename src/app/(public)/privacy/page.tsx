import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

const SECTIONS = [
  {
    h: "What we collect",
    p: [
      "REMEAL collects only the information necessary to run the food rescue network: your name, email address, organization details, contact number, district/locality, and — for NGOs — verification documents. Donors additionally provide pickup addresses for listings; NGOs and volunteers receive them only when authorized.",
      "Listing content (food descriptions, quantities, photos, safety declarations) and claim/delivery records are also stored to operate and audit the workflow.",
    ],
  },
  {
    h: "How your data is used",
    p: [
      "Your data is used to operate the platform: matching food with claimants, coordinating pickups, verifying organizations, sending notifications and computing impact analytics. We do not sell personal data, and we do not use it for advertising.",
      "AI features send only listing text (never personal contact details) to the AI provider, and operate with rule-based fallbacks. AI outputs are always labeled as estimates.",
    ],
  },
  {
    h: "Who can see what",
    p: [
      "Public visitors see locality-level listing information only — exact pickup addresses and contact instructions are revealed exclusively to authorized claimants, assigned volunteers and platform administrators.",
      "NGO verification documents and delivery proof photos are stored privately; only the owner and authorized reviewers can access them. Administrative access to sensitive actions is recorded in an audit log.",
    ],
  },
  {
    h: "Your rights & retention",
    p: [
      "You may request a copy of your data, correction of inaccuracies, or deletion of your account. Account deletion requests can be made through the contact form; transactional records needed for safety and legal accountability may be retained in anonymized form.",
      "Passwords are stored only as salted cryptographic hashes. Sessions are signed, httpOnly cookies.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })} — applies to the REMEAL platform.
      </p>
      <div className="mt-10 space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-bold">{s.h}</h2>
            {s.p.map((para, i) => (
              <p key={i} className="mt-3 leading-relaxed text-muted-foreground">{para}</p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
