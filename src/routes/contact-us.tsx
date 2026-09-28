import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/contact-us")({
  head: () => ({
    meta: [
      { title: "Contact Us — SSC Mentor AI" },
      {
        name: "description",
        content:
          "Get in touch with SSC Mentor AI. Send us feedback, report an issue, or ask a question about SSC CGL prep.",
      },
      { property: "og:title", content: "Contact Us — SSC Mentor AI" },
      {
        property: "og:description",
        content: "Contact the SSC Mentor AI team — feedback, support, and partnerships.",
      },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/contact-us" }],
  }),
  component: ContactPage,
});

const CONTACT_EMAIL = "prashantsingh.2405@gmail.com";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  subject: z.string().trim().min(1, "Subject is required").max(150),
  message: z.string().trim().min(5, "Message too short").max(2000),
});

function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "Website Feedback",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSending(true);
    const body = `Name: ${parsed.data.name}\nEmail: ${parsed.data.email}\n\n${parsed.data.message}`;
    const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      parsed.data.subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    setTimeout(() => {
      setSending(false);
      toast.success("Opening your email app…");
    }, 500);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-foreground">Contact Us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We reply to every message. Send us feedback, report a bug, or say hi.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr,260px]">
        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-card"
        >
          <Field label="Name">
            <input
              type="text"
              required
              value={form.name}
              onChange={update("name")}
              maxLength={100}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Your full name"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={form.email}
              onChange={update("email")}
              maxLength={255}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Subject">
            <input
              type="text"
              required
              value={form.subject}
              onChange={update("subject")}
              maxLength={150}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </Field>
          <Field label="Message">
            <textarea
              required
              rows={6}
              value={form.message}
              onChange={update("message")}
              maxLength={2000}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Type your message here…"
            />
          </Field>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending…" : "Send message"}
          </button>
        </form>

        <aside className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-base font-bold">Direct email</h2>
          <p className="text-sm text-muted-foreground">
            Prefer email? Write to us and we'll respond within 1–2 working days.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-primary transition hover:bg-muted"
          >
            <Mail className="h-4 w-4" />
            {CONTACT_EMAIL}
          </a>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
