import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SSC Mentor AI" },
      {
        name: "description",
        content:
          "Privacy Policy for SSC Mentor AI — cookies, data collection, third-party advertising including Google AdSense, and your rights.",
      },
      { property: "og:title", content: "Privacy Policy — SSC Mentor AI" },
      {
        property: "og:description",
        content: "How SSC Mentor AI collects data, uses cookies, and works with third-party ad partners.",
      },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/privacy-policy" }],
  }),
  component: PrivacyPolicyPage,
});

const UPDATED = "July 10, 2026";
const CONTACT = "prashantsingh.2405@gmail.com";

function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: {UPDATED}</p>
      </header>

      <Section title="1. Introduction">
        <p>
          SSC Mentor AI ("we", "us", "our")           operates{" "}
          <a href="https://sscmentorai.online" className="text-primary underline">
            sscmentorai.online
          </a>{" "}
          and provides AI-powered SSC CGL exam preparation. This Privacy Policy explains how we
          collect, use, disclose, and protect your information when you use our website.
        </p>
      </Section>

      <Section title="2. Information We Collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <b>Account data:</b> email, name, and identifiers from Google sign-in (if used).
          </li>
          <li>
            <b>Profile & onboarding:</b> target exam, gender, previous attempts, and study
            preferences.
          </li>
          <li>
            <b>Learning activity:</b> quiz attempts, mock test results, chat history with AI
            mentor and study partners.
          </li>
          <li>
            <b>Technical data:</b> device type, browser, IP address, referring URL, and usage
            logs.
          </li>
          <li>
            <b>Cookies & local storage:</b> essential cookies for sign-in and preferences, plus
            analytics and advertising cookies (see sections 4 and 5).
          </li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Information">
        <ul className="list-disc space-y-2 pl-5">
          <li>To create and secure your account.</li>
          <li>To personalize practice, recommendations, and AI coaching.</li>
          <li>To display and measure advertisements.</li>
          <li>To improve product quality, fix bugs, and analyze usage trends.</li>
          <li>To respond to support requests and communicate service updates.</li>
        </ul>
      </Section>

      <Section title="4. Cookies and Similar Technologies">
        <p>
          We and our partners use cookies, web beacons, pixels, and browser local storage to:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Keep you signed in and remember your preferences (theme, language).</li>
          <li>Understand how visitors use the site so we can improve it.</li>
          <li>
            Serve and measure ads that are relevant to you, including personalized ads where
            permitted.
          </li>
        </ul>
        <p>
          You can control or disable cookies through your browser settings. Blocking essential
          cookies may prevent some features from working.
        </p>
      </Section>

      <Section title="5. Third-Party Advertising — Google AdSense">
        <p>
          We use <b>Google AdSense</b>, a third-party advertising service provided by Google
          LLC, to display ads on our website. Google and its partners may use cookies
          (including the <b>DoubleClick DART cookie</b>) and device identifiers to serve ads
          based on your visits to this and other websites on the Internet.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Google uses advertising cookies to display personalized ads. You can opt out of
            personalized advertising by visiting{" "}
            <a
              href="https://www.google.com/settings/ads"
              className="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Ads Settings
            </a>
            .
          </li>
          <li>
            You can also opt out of third-party vendor cookies via{" "}
            <a
              href="https://www.aboutads.info/"
              className="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              aboutads.info
            </a>{" "}
            or{" "}
            <a
              href="https://www.youronlinechoices.com/"
              className="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              youronlinechoices.com
            </a>
            .
          </li>
          <li>
            Google's use of advertising cookies is governed by their{" "}
            <a
              href="https://policies.google.com/technologies/ads"
              className="text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              advertising policy
            </a>
            .
          </li>
        </ul>
        <p>
          We may also work with other advertising partners in the future. Any such partners
          will be listed here and are required to comply with applicable data protection laws.
        </p>
      </Section>

      <Section title="6. Third-Party Services We Use">
        <ul className="list-disc space-y-2 pl-5">
          <li><b>Supabase</b> — authentication, database, storage, and functions.</li>
          <li><b>Google OAuth</b> — optional sign-in with a Google account.</li>
          <li><b>Google Gemini</b> — AI-powered mentor responses and question generation.</li>
          <li><b>Cloudflare</b> — hosting, edge runtime, and content delivery network.</li>
          <li><b>Google AdSense</b> — advertising.</li>
          <li><b>PostHog</b> — anonymous product analytics.</li>
          <li><b>Google Search Console</b> — SEO analytics.</li>
        </ul>
        <p className="mt-3">We do not sell your personal data to advertisers or data brokers.</p>
      </Section>

      <Section title="7. Data Retention">
        <p>
          We retain your account and learning data for as long as your account is active.
          When you delete your account, personal data is permanently removed within 30 days.
          Anonymous aggregate data may be retained for analytics.
        </p>
      </Section>

      <Section title="8. Your Rights">
        <ul className="list-disc space-y-2 pl-5">
          <li>Access, correct, or delete your personal data.</li>
          <li>Withdraw consent by signing out and deleting your account.</li>
          <li>Opt out of personalized advertising (see section 5).</li>
          <li>Request a copy of your data by emailing us.</li>
        </ul>
      </Section>

      <Section title="9. Children's Privacy">
        <p>
          Our service is intended for users aged 16 and above. We do not knowingly collect
          data from children under 13. If you believe a child has provided personal data,
          contact us and we will delete it.
        </p>
      </Section>

      <Section title="10. Security">
        <p>
          Data is stored on secure managed infrastructure with encryption in transit (HTTPS)
          and at rest. No system is 100% secure, but we work to protect your data and respond
          promptly to incidents.
        </p>
      </Section>

      <Section title="11. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. The "Last updated" date at the
          top will reflect any changes. Material updates will be communicated in-app.
        </p>
      </Section>

      <Section title="12. Contact Us">
        <p>
          For privacy questions or data requests, email{" "}
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
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}
