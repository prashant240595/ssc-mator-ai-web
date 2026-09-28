import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Lightbulb,
  Target,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/blog/ssc-cgl-2025-study-plan")({
  head: () => ({
    meta: [
      { title: "SSC CGL 2025: A Step-by-Step Preparation Strategy — SSC Mentor AI" },
      { name: "description", content: "A complete SSC CGL 2025 study plan with subject-wise breakdown, General Awareness tips, weekly schedule, and proven strategies to crack the exam in your first attempt." },
      { property: "og:title", content: "SSC CGL 2025: A Step-by-Step Preparation Strategy" },
      { property: "og:description", content: "Complete subject-wise study plan for SSC CGL 2025 with General Awareness focus, weekly schedule, and expert tips." },
      { property: "og:url", content: "https://sscmentorai.online/blog/ssc-cgl-2025-study-plan" },
      { property: "og:type", content: "article" },
    ],
    links: [
      { rel: "canonical", href: "https://sscmentorai.online/blog/ssc-cgl-2025-study-plan" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "SSC CGL 2025: A Step-by-Step Preparation Strategy",
          description:
            "A complete SSC CGL 2025 study plan with subject-wise breakdown, General Awareness tips, weekly schedule, and proven strategies to crack the exam.",
          url: "https://sscmentorai.online/blog/ssc-cgl-2025-study-plan",
          author: { "@type": "Organization", name: "SSC Mentor AI" },
          publisher: {
            "@type": "Organization",
            name: "SSC Mentor AI",
            logo: {
              "@type": "ImageObject",
              url: "https://sscmentorai.online/favicon.ico",
            },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": "https://sscmentorai.online/blog/ssc-cgl-2025-study-plan",
          },
        }),
      },
    ],
  }),
  component: StudyPlanPage,
});

function StudyPlanPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to home
      </Link>

      <article>
        <header className="mb-8">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            SSC CGL 2025 Guide
          </div>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            SSC CGL 2025: A Step-by-Step Preparation Strategy
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Whether you are starting from zero or revising after a previous attempt, this guide gives you a clear, week-by-week roadmap to crack SSC CGL 2025.
          </p>
        </header>

        {/* Quick-start checklist */}
        <section className="mb-10 rounded-2xl border border-border bg-surface p-5 md:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Target className="h-5 w-5 text-primary" />
            How to Start Preparation for SSC CGL (Quick Checklist)
          </h2>
          <ul className="space-y-2.5">
            {[
              "Download the official SSC CGL 2025 notification and note exam dates.",
              "Understand the Tier-1 and Tier-2 exam pattern and syllabus.",
              "Collect standard books and reliable online resources.",
              "Take one free mock test to know your baseline score.",
              "Create a daily timetable and stick to it for at least 4–6 months.",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Exam pattern */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold">SSC CGL 2025 Exam Pattern</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Tier</th>
                  <th className="px-4 py-3 text-left font-semibold">Mode</th>
                  <th className="px-4 py-3 text-left font-semibold">Subjects</th>
                  <th className="px-4 py-3 text-left font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 font-medium">Tier 1</td>
                  <td className="px-4 py-3 text-muted-foreground">Online (CBT)</td>
                  <td className="px-4 py-3 text-muted-foreground">Maths, Reasoning, English, GA</td>
                  <td className="px-4 py-3 text-muted-foreground">60 min</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Tier 2</td>
                  <td className="px-4 py-3 text-muted-foreground">Online (CBT)</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Paper 1: Maths + Reasoning + English + GA + Computer
                    <br />
                    Paper 2: Statistics (JSO only)
                    <br />
                    Paper 3: General Studies (AAO only)
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">2 hr each</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Subject-wise breakdown */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold">Subject-Wise Preparation Strategy</h2>

          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <GraduationCap className="h-5 w-5 text-primary" />
                1. Quantitative Aptitude (Mathematics)
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Focus on Arithmetic first: Percentage, Ratio, Profit & Loss, SI/CI, Time & Work, Time & Distance.</li>
                <li>• Move to Advance Maths: Algebra, Geometry, Trigonometry, Mensuration, Data Interpretation.</li>
                <li>• Solve 50+ questions daily. Use previous year papers to identify repeated patterns.</li>
                <li>• Maintain a formula notebook and revise it weekly.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Lightbulb className="h-5 w-5 text-warning-foreground" />
                2. General Intelligence & Reasoning
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Start with easier topics: Analogy, Odd One Out, Series, Coding-Decoding.</li>
                <li>• Practice Puzzles, Syllogism, and Blood Relations daily.</li>
                <li>• Non-verbal reasoning (Mirror Images, Paper Folding) needs visual practice — use diagrams.</li>
                <li>• Aim for 40+ correct in 25 minutes in Tier 1.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <BookOpen className="h-5 w-5 text-success" />
                3. English Language & Comprehension
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• Build vocabulary daily: 10 new words with synonyms, antonyms, and usage.</li>
                <li>• Master grammar rules: Tenses, Voices, Narration, Error Spotting, Sentence Improvement.</li>
                <li>• Read one editorial daily to improve comprehension speed.</li>
                <li>• Practice Cloze Test and Para Jumbles from previous year papers.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <h3 className="flex items-center gap-2 text-base font-bold">
                <Target className="h-5 w-5 text-primary" />
                4. General Awareness (GA)
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                General Awareness is the most scoring yet most feared section. Here is how to prepare for SSC CGL General Awareness efficiently:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>• <strong>Static GK:</strong> Focus on Indian Polity (Constitution), History (Modern India), Geography (Indian Physical Geography), Economics (Basic Terms, Budget), and General Science (Biology, Physics, Chemistry).</li>
                <li>• <strong>Current Affairs:</strong> Read daily current affairs for the last 6–8 months before the exam. Focus on appointments, awards, sports, government schemes, and defense exercises.</li>
                <li>• <strong>Sources:</strong> Use NCERTs (Class 6–10) for basics, Lucent’s GK for quick revision, and monthly current affairs capsules.</li>
                <li>• <strong>Revision:</strong> Make 100–150 short notes and revise them weekly. GA is memory-based — revision is the key.</li>
                <li>• <strong>Practice:</strong> Solve 20–30 GA questions daily from previous year papers and quizzes.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Weekly schedule */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Calendar className="h-5 w-5 text-primary" />
            Sample 24-Week Study Plan
          </h2>
          <div className="space-y-4">
            {[
              {
                phase: "Phase 1 — Foundation (Weeks 1–8)",
                tasks: [
                  "Complete NCERTs and basic books for all four subjects.",
                  "Solve chapter-wise exercises. Do not skip basics.",
                  "Build a habit of 4–5 hours of focused study daily.",
                ],
              },
              {
                phase: "Phase 2 — Building (Weeks 9–16)",
                tasks: [
                  "Start topic-wise previous year questions (PYQs) for all subjects.",
                  "Join a test series and take one mock test every weekend.",
                  "Analyze every mock: find weak topics and revise them.",
                  "Increase study time to 6–7 hours daily.",
                ],
              },
              {
                phase: "Phase 3 — Revision & Mocks (Weeks 17–22)",
                tasks: [
                  "Revise short notes and formula sheets twice a week.",
                  "Take full-length Tier-1 mocks on alternate days.",
                  "Practice speed: attempt 80+ questions in 60 minutes.",
                  "Focus on accuracy — avoid blind guessing.",
                ],
              },
              {
                phase: "Phase 4 — Final Sprint (Weeks 23–24)",
                tasks: [
                  "Take one mock daily and revise mistakes immediately.",
                  "Read current affairs of the last 3 months intensively.",
                  "Sleep well, eat healthy, and stay calm before the exam.",
                ],
              },
            ].map((p, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-sm font-bold text-primary">{p.phase}</h3>
                <ul className="mt-2 space-y-1.5">
                  {p.tasks.map((t, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Daily timetable */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold">Recommended Daily Timetable</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Time Slot</th>
                  <th className="px-4 py-3 text-left font-semibold">Subject / Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 font-medium">6:00 – 7:00 AM</td>
                  <td className="px-4 py-3 text-muted-foreground">Current Affairs + GA Revision</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">7:00 – 9:00 AM</td>
                  <td className="px-4 py-3 text-muted-foreground">Quantitative Aptitude (New Topic + Practice)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">9:00 – 10:00 AM</td>
                  <td className="px-4 py-3 text-muted-foreground">Breakfast + Break</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">10:00 – 12:00 PM</td>
                  <td className="px-4 py-3 text-muted-foreground">Reasoning (Puzzles + Practice)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">12:00 – 1:00 PM</td>
                  <td className="px-4 py-3 text-muted-foreground">English (Vocab + Grammar + Comprehension)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">1:00 – 2:00 PM</td>
                  <td className="px-4 py-3 text-muted-foreground">Lunch + Rest</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">2:00 – 4:00 PM</td>
                  <td className="px-4 py-3 text-muted-foreground">General Awareness (Static GK Notes + Quiz)</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">4:00 – 6:00 PM</td>
                  <td className="px-4 py-3 text-muted-foreground">Mock Test / Previous Year Paper</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">6:00 – 7:00 PM</td>
                  <td className="px-4 py-3 text-muted-foreground">Mock Analysis & Error Correction</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">7:00 – 8:00 PM</td>
                  <td className="px-4 py-3 text-muted-foreground">Revision of Weak Topics</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Adjust the timetable to fit your schedule. Consistency matters more than the exact hours.
          </p>
        </section>

        {/* Tips */}
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold">Pro Tips to Crack SSC CGL in First Attempt</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "Mock Tests are Non-Negotiable", body: "Take at least 40–50 full-length mocks before the real exam. Analysis is more important than the score." },
              { title: "Accuracy over Attempts", body: "In Tier 1, 0.50 marks are deducted for every wrong answer. Do not guess blindly." },
              { title: "Previous Year Papers = Gold", body: "60–70% of questions are repeated with different numbers. Solve last 10 years of PYQs." },
              { title: "Short Notes Save Time", body: "One-page notes for each topic let you revise an entire subject in under 30 minutes." },
              { title: "Stay Updated with Current Affairs", body: "Read daily and revise weekly. Use apps or YouTube channels for 10-minute capsules." },
              { title: "Health is Part of the Plan", body: "Sleep 7 hours, exercise 30 minutes, and eat well. A tired brain cannot retain formulas." },
            ].map((tip, i) => (
              <div key={i} className="rounded-xl border border-border bg-surface p-4">
                <h4 className="text-sm font-bold">{tip.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{tip.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl border border-border bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
          <h2 className="text-lg font-bold">Start Practicing with SSC Mentor AI</h2>
          <p className="mt-2 text-sm opacity-90">
            Apply what you learned — take subject-wise quizzes, previous year papers, and full mock tests with AI-powered insights.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/practice"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:bg-white/90"
            >
              Start Practice
            </Link>
            <Link
              to="/exams"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Take Exam Series
            </Link>
          </div>
        </section>
      </article>
    </div>
  );
}
