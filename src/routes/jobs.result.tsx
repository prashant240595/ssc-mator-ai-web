import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listPublishedPosts } from "@/lib/blog.functions";
import { JobPageShell, JobSearch } from "@/components/JobSection";

const SITE_URL = "https://sscmentorai.online";

const opts = queryOptions({
  queryKey: ["blog", "list", "job", "result"],
  queryFn: () => listPublishedPosts({ data: { type: "job", stage: "result" } }),
});

export const Route = createFileRoute("/jobs/result")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  head: () => ({
    meta: [
      { title: "Result — Latest Sarkari Result | SSC Mentor AI" },
      { name: "description", content: "Declared results, merit lists and cut-off marks for government exams." },
      { property: "og:title", content: "Result — SSC Mentor AI" },
      { property: "og:description", content: "Declared results, merit lists and cut-off marks for government exams." },
      { property: "og:url", content: `${SITE_URL}/jobs/result` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/jobs/result` }],
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
    <JobPageShell title="Result" subtitle="Declared results, merit lists and cut-off marks for government exams." active="result">
      <JobSearch posts={posts} emptyLabel="Nothing in Result right now. Check back soon." />
    </JobPageShell>
  );
}
