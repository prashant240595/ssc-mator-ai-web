import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — SSC Mentor AI" },
      {
        name: "description",
        content:
          "Terms and Conditions for using SSC Mentor AI — accounts, acceptable use, intellectual property, disclaimers, and liability.",
      },
      { property: "og:title", content: "Terms & Conditions — SSC Mentor AI" },
      {
        property: "og:description",
        content: "Rules and terms that govern your use of the SSC Mentor AI website.",
      },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/terms-and-conditions" }],
  }),
  component: TermsPage,
});

const UPDATED = "July 10, 2026";
const CONTACT = "prashantsingh.2405@gmail.com";

function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-foreground">Terms & Conditions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {UPDATED}</p>
      </header>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using SSC Mentor AI ("the Service"), you agree to be bound by these
          Terms & Conditions. If you do not agree, do not use the Service.
        </p>
      </Section>

      <Section title="2. Eligibility">
        <p>
          You must be at least 16 years old to create an account. By using the Service you
          represent that the information you provide is accurate and that you have the legal
          capacity to enter into these Terms.
        </p>
      </Section>

      <Section title="3. Accounts">
        <ul className="list-disc space-y-2 pl-5">
          <li>You are responsible for maintaining the confidentiality of your credentials.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>You agree to notify us immediately of any unauthorized use.</li>
        </ul>
      </Section>

      <Section title="4. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Use the Service for any unlawful, harmful, or fraudulent purpose.</li>
          <li>Attempt to reverse-engineer, scrape, or overload the Service.</li>
          <li>Post or share content that infringes intellectual property or third-party rights.</li>
          <li>
            Harass, abuse, or impersonate other users (including AI study buddies) or staff.
          </li>
          <li>Upload malware or attempt to compromise the security of the platform.</li>
        </ul>
      </Section>

      <Section title="5. Intellectual Property">
        <p>
          All content on the Service — text, graphics, logos, question banks, mock tests,
          software, and design — is owned by SSC Mentor AI or its licensors and is protected
          by copyright and other laws. You may use the Service for personal, non-commercial
          learning. You may not copy, redistribute, or create derivative works without prior
          written permission.
        </p>
      </Section>

      <Section title="6. User Content">
        <p>
          Any content you submit (feedback, chat messages, reported questions) remains yours,
          but you grant us a worldwide, royalty-free license to use it for operating and
          improving the Service. You are solely responsible for your content and must ensure
          it does not violate any law or third-party right.
        </p>
      </Section>

      <Section title="7. Third-Party Services and Advertising">
        <p>
          The Service integrates with third-party providers (see our Privacy Policy) and
          displays advertising via Google AdSense and other partners. We are not responsible
          for the content of third-party ads or external websites linked from those ads.
        </p>
      </Section>

      <Section title="8. AI-Generated Content Disclaimer">
        <p>
          Our AI mentor and AI study buddies generate responses using machine learning models.
          Answers may be inaccurate, incomplete, or out of date. Always verify important
          information from official SSC notifications and trusted sources before relying on
          it.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>
          We may suspend or terminate your account at any time if you violate these Terms or
          misuse the Service. You may delete your account at any time from your profile
          settings.
        </p>
      </Section>

      <Section title="10. Disclaimers">
        <p>
          The Service is provided "as is" and "as available" without warranties of any kind,
          whether express or implied. We do not guarantee that the Service will be
          uninterrupted, error-free, or that any content will be accurate.
        </p>
      </Section>

      <Section title="11. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, SSC Mentor AI and its team shall not be
          liable for any indirect, incidental, special, or consequential damages arising out
          of your use of the Service.
        </p>
      </Section>

      <Section title="12. Changes to These Terms">
        <p>
          We may update these Terms from time to time. Continued use of the Service after
          changes are posted constitutes acceptance of the updated Terms.
        </p>
      </Section>

      <Section title="13. Governing Law">
        <p>
          These Terms are governed by the laws of India. Any disputes will be subject to the
          exclusive jurisdiction of courts located in India.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          Questions about these Terms? Email{" "}
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
