import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

const SECTIONS = [
  {
    h: "1. The platform",
    p: [
      "REMEAL is a coordination platform that connects food donors with verified recipient organizations and volunteers. REMEAL does not own, transport, prepare or distribute food, and is not a party to the donation or distribution relationship between donors and recipients.",
    ],
  },
  {
    h: "2. Eligibility & accounts",
    p: [
      "You must provide accurate organization information. NGO and volunteer accounts require verification before participating in pickups. Public registration cannot create administrator accounts, and attempting to misrepresent your identity, organization or verification status is grounds for immediate suspension.",
      "You are responsible for activity under your account. Keep credentials confidential and use the password reset flow if compromised.",
    ],
  },
  {
    h: "3. Food safety responsibilities",
    p: [
      "Donors are solely responsible for the accuracy of their safety declarations (preparation time, storage, packaging, allergens) and for the condition of food handed over. Recipients are responsible for inspecting food at collection and for compliance with applicable food-safety regulations in their jurisdiction when redistributing.",
      "REMEAL does not certify food safety. AI-generated suggestions on the platform are estimates and never constitute safety certification.",
    ],
  },
  {
    h: "4. Acceptable use",
    p: [
      "Do not list recalled, contaminated or ineligible food; do not misstate quantities; do not claim food you cannot collect; do not harass or spam other participants; and do not attempt to access data, addresses or documents you are not authorized to see. We may suspend accounts and remove content that violates these terms, with an auditable record.",
    ],
  },
  {
    h: "5. Liability",
    p: [
      "The platform is provided on an 'as available' basis. To the maximum extent permitted by law, REMEAL is not liable for the condition of food, the acts of donors, recipients or volunteers, or indirect damages arising from platform use. Nothing in these terms limits liability that cannot be limited under applicable law.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Last updated: {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
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
