// REMEAL notification service — creates in-app notifications.
// Optional email delivery goes through a configurable provider interface;
// if no provider is configured, in-app notifications still work and no
// delivery claims are ever made (see README).

import { db } from "@/lib/db";
import type { Notification as DbNotification } from "@prisma/client";

type EmailProvider = (to: string, subject: string, body: string) => Promise<{ delivered: boolean; provider: string }>;

let emailProvider: EmailProvider | null = null;

/** Register a provider at boot from env, e.g. SMTP/Resend/SendGrid adapters. */
export function registerEmailProvider(p: EmailProvider | null) {
  emailProvider = p;
}

function providerConfigured(): boolean {
  return Boolean(process.env.EMAIL_PROVIDER_API_KEY);
}

export async function notify(input: {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
}): Promise<DbNotification | null> {
  try {
    const notification = await db.notification.create({
      data: {
        recipientId: input.recipientId,
        type: input.type,
        title: input.title,
        message: input.message,
        linkUrl: input.linkUrl,
      },
    });
    return notification;
  } catch (err) {
    console.error("[notify] failed to create notification", err);
    return null;
  }
}

export async function notifyMany(recipientIds: string[], input: Omit<Parameters<typeof notify>[0], "recipientId">) {
  await Promise.allSettled(recipientIds.map((id) => notify({ ...input, recipientId: id })));
}

/**
 * Attempt an email send through the configured provider.
 * Returns { attempted: false } when no provider is configured — callers must
 * never report an email as "sent" unless the provider confirms delivery.
 */
export async function attemptEmail(to: string, subject: string, body: string): Promise<{ attempted: boolean; delivered: boolean }> {
  if (!providerConfigured() || !emailProvider) {
    console.log(`[email] provider not configured — suppressed email to ${to} ("${subject}")`);
    return { attempted: false, delivered: false };
  }
  try {
    const res = await emailProvider(to, subject, body);
    return { attempted: true, delivered: res.delivered };
  } catch (err) {
    console.error("[email] provider error", err);
    return { attempted: true, delivered: false };
  }
}
