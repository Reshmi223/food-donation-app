import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { contactSchema } from "@/lib/validations";
import { handleError, ok } from "@/lib/api";

/** POST /api/contact — validated contact form → stored for the support team. */
export async function POST(req: NextRequest) {
  try {
    const data = contactSchema.parse(await req.json());
    await db.contactMessage.create({ data });
    return ok({
      success: true,
      message: "Thanks for reaching out — our team typically responds within 2 working days.",
    });
  } catch (err) {
    return handleError(err);
  }
}
