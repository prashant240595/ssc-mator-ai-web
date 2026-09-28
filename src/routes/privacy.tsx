import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SSC Mentor AI" },
      {
        name: "description",
        content:
          "Privacy Policy for SSC Mentor AI — how we collect, use, store, and protect your data, including third-party services and your rights.",
      },
      { property: "og:title", content: "Privacy Policy — SSC Mentor AI" },
      {
        property: "og:description",
        content: "How SSC Mentor AI handles your personal data, retention, and third-party services.",
      },
      { property: "og:url", content: "https://sscmentorai.online/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/privacy" }],
  }),
  component: PrivacyPage,
});

const UPDATED = "June 21, 2026";
const CONTACT = "prashantsingh.2405@gmail.com";

function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {UPDATED}</p>
        <p className="text-sm text-muted-foreground">
          This page is maintained by the SSC Mentor AI team to explain how we
          handle your personal information when you use our website and app.
        </p>
      </header>

      <Section title="1. Who we are">
        <p>
          SSC Mentor AI ("we", "us", "our") provides an AI-powered learning
          platform for SSC exam aspirants — practice questions, mock tests,
          AI coaching, and progress tracking. You can reach us at{" "}
          <a href={`mailto:${CONTACT}`} className="text-primary underline">
            {CONTACT}
          </a>
          .
        </p>
      </Section>

      <Section title="2. Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <b>Account info:</b> email address, name (if provided), and
            authentication identifiers from Google sign-in (if used).
          </li>
          <li>
            <b>Profile & onboarding data:</b> target exam, attempt history,
            previous scores, and study preferences you enter.
          </li>
          <li>
            <b>Learning activity:</b> quiz attempts, answers, scores, time
            spent, mock test results, reported questions, and AI chat history.
          </li>
          <li>
            <b>Technical data:</b> device type, browser, IP address, basic
            usage logs and error reports.
          </li>
          <li>
            <b>Content you upload:</b> PDFs and images uploaded for parsing
            (admin features only).
          </li>
        </ul>
      </Section>

      <Section title="3. How we use your data">
        <ul className="list-disc space-y-2 pl-5">
          <li>To create and secure your account and authenticate sign-in.</li>
          <li>To personalize practice, recommendations, and AI coaching.</li>
          <li>To save progress, scores, and history across devices.</li>
          <li>To improve the product, fix bugs, and ensure reliability.</li>
          <li>To respond to your support requests and reported questions.</li>
        </ul>
      </Section>

      <Section title="4. Legal basis">
        <p>
          We process your data based on your consent (when you sign up and use
          the app), to perform the service you requested, and our legitimate
          interest in maintaining and improving the platform.
        </p>
      </Section>

      <Section title="5. Third-party services we use">
        <p className="mb-3">
          We use trusted third-party providers to run SSC Mentor AI. Each
          handles data only as needed for the service:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <b>Supabase:</b> authentication, database, file storage, and
            serverless functions.
          </li>
          <li>
            <b>Google OAuth:</b> optional sign-in with your Google account.
          </li>
          <li>
            <b>Google Gemini API:</b> AI-powered PDF parsing, question
            extraction, and mentor responses.
          </li>
          <li>
            <b>Cloudflare:</b> hosting, edge runtime, and content delivery
            network that serves the app.
          </li>
          <li>
            <b>Google Search Console:</b> SEO and indexing analytics for the
            website.
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          We do not sell your personal data to advertisers or data brokers.
        </p>
      </Section>

      <Section title="6. Cookies & local storage">
        <p>
          We use cookies and browser local storage for essential things like
          keeping you signed in, remembering your theme and language
          preference, and saving guest-mode progress. No third-party
          advertising cookies are used.
        </p>
      </Section>

      <Section title="7. Data retention">
        <p>
          We retain your account and learning data for as long as your account
          is active. When you delete your account, your personal data
          (profile, quiz history, AI chat, reports) is permanently deleted
          within <b>30 days</b>. Anonymous aggregate analytics may be
          retained for product-improvement purposes.
        </p>
      </Section>

      <Section title="8. Your rights">
        <ul className="list-disc space-y-2 pl-5">
          <li>Access the personal data we hold about you.</li>
          <li>Correct or update your profile information at any time.</li>
          <li>
            Delete your account at any time from{" "}
            <Link to="/profile" className="text-primary underline">
              Profile → Delete Account
            </Link>
            .
          </li>
          <li>
            Withdraw consent by signing out and deleting your account.
          </li>
          <li>
            Request a copy of your data by emailing us at{" "}
            <a href={`mailto:${CONTACT}`} className="text-primary underline">
              {CONTACT}
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="9. Children">
        <p>
          SSC Mentor AI is intended for users aged 16 and above preparing for
          government exams. We do not knowingly collect data from children
          under 13. If you believe a child has provided data, contact us and
          we will delete it.
        </p>
      </Section>

      <Section title="10. Security">
        <p>
          Data is stored on secure managed infrastructure with encryption in
          transit (HTTPS) and at rest. Access is protected by row-level
          security policies and authenticated APIs. No system is 100% secure,
          but we work to protect your data and respond promptly to incidents.
        </p>
      </Section>

      <Section title="11. International transfers">
        <p>
          Our service providers may process data outside your country. We rely
          on the providers' standard safeguards (such as standard contractual
          clauses) for international data transfers.
        </p>
      </Section>

      <Section title="12. Changes to this policy">
        <p>
          We may update this Privacy Policy as the product evolves. The
          "Last updated" date above will reflect any change. Material updates
          will be communicated in-app or via email.
        </p>
      </Section>

      <Section title="13. Contact">
        <p>
          For any privacy questions or data requests, email us at{" "}
          <a href={`mailto:${CONTACT}`} className="text-primary underline">
            {CONTACT}
          </a>
          .
        </p>
      </Section>

      <div className="pt-2">
        <Link to="/" className="text-xs font-semibold text-primary underline-offset-4 hover:underline">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}
