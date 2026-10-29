// Shared API route helpers — consistent JSON responses + error handling.
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as object, init);
}

export function fail(message: string, status = 400, code?: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, code, ...extra }, { status });
}

export function handleError(err: unknown) {
  if (err instanceof AuthError) {
    return fail(err.message, err.status, err.code);
  }
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return fail(issues[0]?.message ?? "Validation failed", 422, "VALIDATION_ERROR", { issues });
  }
  console.error("[api] unhandled error:", err);
  return fail("Something went wrong. Please try again.", 500, "INTERNAL");
}

export function userMessageFromError(err: unknown): string {
  if (err instanceof AuthError) return err.message;
  if (err instanceof ZodError) return err.issues[0]?.message ?? "Validation failed";
  return "Something went wrong. Please try again.";
}
