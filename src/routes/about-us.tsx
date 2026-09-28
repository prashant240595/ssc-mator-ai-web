import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about-us")({
  head: () => ({
    meta: [
      { title: "About Us — SSC Mentor AI" },
      {
        name: "description",
        content:
          "Learn about SSC Mentor AI — our mission to help SSC CGL aspirants prepare smarter with AI-powered practice, previous year papers, and mock tests.",
      },
      { property: "og:title", content: "About Us — SSC Mentor AI" },
      {
        property: "og:description",
        content: "Our mission, team, and story behind SSC Mentor AI.",
      },
    ],
    links: [{ rel: "canonical", href: "https://sscmentorai.online/about-us" }],
  }),
  component: AboutUsPage,
});

function AboutUsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-foreground">About Us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Building the smartest, most accessible SSC prep companion for Indian aspirants.
        </p>
      </header>

      <Section title="Our Mission">
        <p>
          SSC Mentor AI exists to make high-quality SSC CGL preparation available to every
          aspirant — regardless of their coaching budget or location. We combine authentic
          previous year papers, timed mock tests, topic-wise practice, and an AI mentor that
          answers doubts in Hinglish so learners always feel supported.
        </p>
      </Section>

      <Section title="What We Offer">
        <ul className="list-disc space-y-2 pl-5">
          <li>Previous year question papers (PYQs) organized by year and shift.</li>
          <li>Full-length timed mock tests with instant scoring and analysis.</li>
          <li>Subject and topic-wise practice with detailed solutions.</li>
          <li>Personal AI coach that reviews your attempts and gives an action plan.</li>
          <li>Study partners, study groups, and a focus timer to build consistency.</li>
        </ul>
      </Section>

      <Section title="Our Team">
        <p>
          SSC Mentor AI is a small independent team of educators, engineers, and past
          government-exam aspirants. We build every feature by talking to real students and
          shipping quickly based on their feedback. If you'd like to contribute questions,
          report an issue, or partner with us, we'd love to hear from you.
        </p>
        <p className="mt-3">
          Reach us any time at{" "}
          <a
            href="mailto:prashantsingh.2405@gmail.com"
            className="font-semibold text-primary underline"
          >
            prashantsingh.2405@gmail.com
          </a>
          .
        </p>
      </Section>
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
