# REMEAL — The Intelligent Food Rescue Network

**Rescue Food. Restore Hope.**

REMEAL connects restaurants, hotels, caterers, supermarkets and event organizers that have safe surplus food with verified NGOs, charities and shelters — with volunteers bridging the last mile. Built food-safety-first, with real authentication, persistent storage, atomic claim workflows, notifications, analytics and governed AI features.

---

## 1. Quick start

```bash
# 1. Install dependencies
bun install

# 2. Configure environment (see .env.example)
cp .env.example .env

# 3. Create/update the database (SQLite via Prisma)
bun run db:push

# 4. Seed demo data (local development only — all content synthetic & labeled)
bun prisma/seed.ts

# 5. Run
bun run dev          # http://localhost:3000
bun run lint         # code quality
bun test tests/remeal.test.ts   # unit tests
```

### Demo accounts (password: `Demo@1234`)

| Email | Role |
|---|---|
| `admin@demo.remeal.app` | Administrator |
| `donor@demo.remeal.app` | Donor (Annai Catering Services) |
| `ngo@demo.remeal.app` | NGO — verified (Ullam Ketrpom Trust) |
| `ngo3@demo.remeal.app` | NGO — pending verification (try the verification flow) |
| `volunteer@demo.remeal.app` | Volunteer |

All seeded listings, claims, statistics and stories are **synthetic demo data**, clearly labeled in the UI via the demo banner. The platform never invents live statistics — the home page computes metrics from actual database records only.

---

## 2. Technology stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript 5 |
| UI | Tailwind CSS 4, shadcn/ui (New York), Lucide icons, Recharts |
| Database | PostgreSQL-compatible schema via Prisma (SQLite in dev: `db/custom.db`) |
| Auth | Server-side sessions — scrypt password hashing, HMAC-SHA256 signed httpOnly cookies |
| Validation | Zod schemas shared by API routes and forms (React Hook Form compatible) |
| AI | Approved AI SDK server-side via `z-ai-web-dev-sdk` + deterministic rule-based fallback |
| Realtime | Polling-based live updates (notifications every 20s) — provider-agnostic by design |

### Reference-stack mapping

The original specification targeted Supabase. This implementation preserves every requirement with equivalent mechanisms:

| Spec (Supabase) | Implemented as |
|---|---|
| Supabase Auth (email/password, reset, sessions) | Custom auth: scrypt + signed httpOnly session cookies, password reset tokens, server-enforced roles |
| PostgreSQL RLS policies | Server-side authorization layer: `requireRole`/`requireUser` guards on every route + per-record ownership checks in transactional logic |
| Supabase Edge Functions (privileged ops) | Next.js Route Handlers (server-only); no privileged logic in client code |
| Supabase Storage buckets | Upload API with PUBLIC/PRIVATE visibility; private files served only to owners/admins via authorized endpoint |
| Supabase Realtime | Polling-based notification center and dashboard refresh |
| PostgreSQL functions/transactions | Prisma interactive transactions with conditional atomic updates |

---

## 3. Architecture & key flows

### Core workflow
```
Food Donor → Food Listing → Safety Confirmation → NGO Discovery → Claim Request
→ Donor Confirmation (atomic reservation) → Pickup/Delivery → Completion Verification → Impact Analytics
```

### Authentication & authorization
- Public registration accepts **only** `DONOR | NGO | VOLUNTEER` — an `ADMIN` role in any payload is rejected. Roles live in protected DB records; role changes happen only through audited admin endpoints.
- Every dashboard area is guarded server-side (layout-level session checks + role layouts). Every API route re-validates session, role and record ownership — client checks are cosmetic only.
- Suspended accounts are rejected at sign-in and at session validation.

### Claim workflow & inventory consistency (`src/lib/claims.ts`, `src/app/api/claims/[id]`)
- **Atomic reservation:** acceptance runs `UPDATE ... WHERE remaining_quantity >= approved` inside a Prisma transaction — concurrent approvals can never over-reserve.
- **Server-validated transitions:** a state-machine table (`CLAIM_TRANSITIONS`) gates every status change by actor role; invalid transitions return `409`.
- **Inventory restoration:** cancelling/rejecting accepted claims increments quantity back (capped semantics; listing status recomputed `AVAILABLE`/`PARTIALLY_RESERVED`).
- **Idempotency:** repeating an already-applied transition returns success without side effects; duplicate open claims per NGO/listing are rejected.
- **History:** every transition writes `claim_status_history` (actor, previous → new, reason) and notifies counterparties.
- **Expiry:** overdue listings auto-expire on read paths; expired/withdrawn/flagged food is never claimable.
- A donation can never be `COMPLETED` before `PICKED_UP`/`DELIVERED`.

### Food safety (`src/lib/validations.ts`, listing form, `/safety`)
- Prepared-at, pickup window, storage, packaging and allergen declarations are validated; deadlines in the past and >72h windows are rejected with safety warnings.
- Listings go live **only** after the donor's explicit safety confirmation; unconfirmed safety info excludes a listing from default discovery and shows warnings.
- AI can never certify safety — all AI output is labeled as an estimate, and the UI repeats this throughout.
- Safety reports instantly flag listings for admin review; admins can remove content with mandatory, audited reasons.

### AI governance (`src/lib/ai.ts`)
- Keys and calls are server-side only (`/api/ai/*`); browsers never see credentials.
- Every AI feature has a deterministic rule-based fallback; responses carry `source: "ai" | "fallback"` and `estimate: true`.
- Natural-language search converts text into **validated filters** (zod-checked, whitelisted fields) — generated SQL never executes.
- Demand forecasting shows "Not enough data yet" below a data threshold instead of fabricating predictions.
- NGO matching is transparent rule-scoring with per-NGO explanations; it never auto-assigns food and never uses sensitive personal attributes.

### Privacy & protected data
- Exact pickup addresses and contact instructions are exposed **only** to authorized claimants, assigned volunteers and admins — public/explore responses strip them.
- Verification documents and delivery proofs are PRIVATE uploads; served exclusively to owners/admins with `no-store` caching.
- Audit logs are append-only through the API (no update/delete routes exist).

---

## 4. Environment variables

See [`.env.example`](./.env.example). Highlights:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Prisma connection string (SQLite file in dev) |
| `SESSION_SECRET` | HMAC secret for session tokens — **set a strong value in production** |
| `NEXT_PUBLIC_DEMO_MODE` | `true` (default) shows the demo banner; set `false` in production |
| `EMAIL_PROVIDER_API_KEY` | Optional — when absent, emails are suppressed and never claimed as delivered |

## 5. Testing

```bash
bun test tests/remeal.test.ts
```
Covers: claim state-machine permissions, inventory release rules, volunteer flow ordering, scrypt hashing, session token forgery resistance, registration/listing/claim validation (incl. safety time rules), and AI fallback behavior (incl. refusing to fabricate forecasts).

## 6. Deployment

1. Provision PostgreSQL and set `DATABASE_URL` (Prisma supports `postgresql://` URLs directly).
2. Set a strong `SESSION_SECRET`, `NEXT_PUBLIC_DEMO_MODE=false`, and optional email/AI provider keys.
3. `bun run build` → deploy (Vercel, Node host or container). Run `prisma db push`/`migrate` during release.
4. Create the first administrator via a one-time server-side script or manually update a user's role in the DB — never through public registration.
5. Review `/privacy`, `/terms` and `/safety` pages with qualified personnel before go-live, and configure food-eligibility rules with jurisdiction-appropriate guidance.
