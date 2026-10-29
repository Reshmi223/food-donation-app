// REMEAL authentication — server-side session management.
// Passwords: scrypt with random salt (Node crypto, no plaintext storage).
// Sessions: HMAC-SHA256 signed tokens in httpOnly, SameSite=Lax cookies.
// Authorization is ALWAYS enforced server-side (API guards below + DB checks);
// client-side role checks are cosmetic only.

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { Role } from "@/lib/constants";

const SESSION_COOKIE = "remeal_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_SECRET = process.env.SESSION_SECRET || "remeal-dev-secret-change-in-production";

export type SessionPayload = {
  userId: string;
  email: string;
  role: Role;
  name: string;
  exp: number; // unix seconds
};

// ---------- passwords ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

// ---------- token signing ----------

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(full));
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.userId || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------- cookie session ----------

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

// ---------- database-backed session helpers ----------

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;
  if (user.verificationStatus === "SUSPENDED") return { user, suspended: true } as const;
  return { user, suspended: false } as const;
}

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 401, code = "UNAUTHORIZED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Require any authenticated, non-suspended user. Throws AuthError. */
export async function requireUser() {
  const result = await getCurrentUser();
  if (!result) throw new AuthError("Please sign in to continue.");
  if (result.suspended) throw new AuthError("This account has been suspended. Contact support.", 403, "SUSPENDED");
  return result.user;
}

/** Require a user with one of the given roles. Throws AuthError. */
export async function requireRole(...roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role as Role)) {
    throw new AuthError("You do not have permission to perform this action.", 403, "FORBIDDEN");
  }
  return user;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
