import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listPublishedPosts } from "@/lib/blog.functions";
import { JobPageShell, JobSearch } from "@/components/JobSection";

const SITE_URL = "https://sscmentorai.online";

const opts = queryOptions({
  queryKey: ["blog", "list", "job", "admit_card"],
  queryFn: () => listPublishedPosts({ data: { type: "job", stage: "admit_card" } }),
});

export const Route = createFileRoute("/jobs/admit-card")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  head: () => ({
    meta: [
      { title: "Admit Card — Latest Sarkari Admit Card | SSC Mentor AI" },
      { name: "description", content: "Download admit cards and hall tickets for upcoming government exams." },
      { property: "og:title", content: "Admit Card — SSC Mentor AI" },
      { property: "og:description", content: "Download admit cards and hall tickets for upcoming government exams." },
      { property: "og:url", content: `${SITE_URL}/jobs/admit-card` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/jobs/admit-card` }],
  }),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="text-xl font-semibold">This section failed to load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  ),
  component: Page,
});

function Page() {
  const { data: posts } = useSuspenseQuery(opts);
  return (
    <JobPageShell title="Admit Card" subtitle="Download admit cards and hall tickets for upcoming government exams." active="admit_card">
      <JobSearch posts={posts} emptyLabel="Nothing in Admit Card right now. Check back soon." />
    </JobPageShell>
  );
}
