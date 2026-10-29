"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, MessageSquareText, BookOpen, ShieldAlert, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api } from "@/lib/api-client";
import { DEMO_MODE } from "@/lib/constants";

const HELP_ARTICLES = [
  {
    title: "Getting started as a food donor",
    body: "Register with your organization details, complete your profile, and publish your first listing with the guided form. Listings need a safety confirmation before they become publicly claimable — this confirms your declared preparation time, storage and packaging are accurate.",
  },
  {
    title: "NGO verification process",
    body: "Submit your organization registration number and a photo/scan of your registration certificate from the NGO dashboard profile page. Reviews usually complete within 1–2 working days. Only verified organizations can claim food.",
  },
  {
    title: "How collection codes work",
    body: "When a donor approves your claim, a unique collection code is generated. Share it with your collection team — the donor verifies it at handover. Never post collection codes publicly.",
  },
  {
    title: "Requesting a volunteer delivery",
    body: "After your claim is accepted, either party can request a volunteer from the claim detail view. Volunteers see pickup and drop-off details only for their own assignments and upload proof of delivery.",
  },
  {
    title: "Reporting unsafe food",
    body: "Use 'Report this listing' on any listing page. Reports immediately flag the listing for review, and administrators can remove it while investigating. Safety reports are always audited.",
  },
  {
    title: "Understanding AI suggestions",
    body: "AI features (category suggestions, listing drafts, smart search, demand summaries) are estimates. You can always edit or ignore them. AI never determines food safety, and you can report inaccurate suggestions through this help center.",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const supportEmail = DEMO_MODE ? "support@remeal.example.org" : "support@remeal.example.org";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.name.trim().length < 2) nextErrors.name = "Enter your name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email address";
    if (form.subject.trim().length < 4) nextErrors.subject = "Enter a subject";
    if (form.message.trim().length < 20) nextErrors.message = "Tell us a bit more (at least 20 characters)";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    try {
      const res = await api<{ message: string }>("/api/contact", { method: "POST", json: form });
      toast.success(res.message);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send your message. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Contact & Help Center</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Questions, safety concerns, or partnership ideas — we&rsquo;re here to help.
        </p>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        {/* Contact form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquareText className="h-5 w-5 text-primary" aria-hidden /> Send us a message
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4" noValidate>
              <div className="grid gap-1.5">
                <Label htmlFor="c-name">Your name</Label>
                <Input
                  id="c-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "c-name-err" : undefined}
                />
                {errors.name && <p id="c-name-err" role="alert" className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-email">Email address</Label>
                <Input
                  id="c-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "c-email-err" : undefined}
                />
                {errors.email && <p id="c-email-err" role="alert" className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-subject">Subject</Label>
                <Input
                  id="c-subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  aria-invalid={!!errors.subject}
                />
                {errors.subject && <p role="alert" className="text-xs text-destructive">{errors.subject}</p>}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="c-message">Message</Label>
                <Textarea
                  id="c-message"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  aria-invalid={!!errors.message}
                  placeholder="How can we help?"
                />
                {errors.message && <p role="alert" className="text-xs text-destructive">{errors.message}</p>}
              </div>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                {submitting ? "Sending…" : "Send message"}
              </Button>
            </form>
            <div className="mt-5 space-y-2 border-t pt-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" aria-hidden /> {supportEmail}</p>
              <p className="text-xs">Safety emergencies involving food already distributed: mark your report as &ldquo;Spoiled / unsafe food&rdquo; for fastest triage.</p>
            </div>
          </CardContent>
        </Card>

        {/* Help articles */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-primary" aria-hidden /> Help articles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible>
                {HELP_ARTICLES.map((a, i) => (
                  <AccordionItem key={i} value={`help-${i}`}>
                    <AccordionTrigger className="text-left text-sm font-medium">{a.title}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{a.body}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <ShieldAlert className="h-5 w-5" aria-hidden /> Report a safety issue
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                Saw a listing that looks unsafe or misstated? Report it directly from the listing page — reports
                instantly flag the item for admin review. For urgent foodborne-illness concerns, also contact your
                local food safety authority.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
