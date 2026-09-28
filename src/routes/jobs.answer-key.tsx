import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listPublishedPosts } from "@/lib/blog.functions";
import { JobPageShell, JobSearch } from "@/components/JobSection";

const SITE_URL = "https://sscmentorai.online";

const opts = queryOptions({
  queryKey: ["blog", "list", "job", "answer_key"],
  queryFn: () => listPublishedPosts({ data: { type: "job", stage: "answer_key" } }),
});

export const Route = createFileRoute("/jobs/answer-key")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  head: () => ({
    meta: [
      { title: "Answer Key — Latest Sarkari Answer Key | SSC Mentor AI" },
      { name: "description", content: "Official and provisional answer keys with objection window details." },
      { property: "og:title", content: "Answer Key — SSC Mentor AI" },
      { property: "og:description", content: "Official and provisional answer keys with objection window details." },
      { property: "og:url", content: `${SITE_URL}/jobs/answer-key` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/jobs/answer-key` }],
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
    <JobPageShell title="Answer Key" subtitle="Official and provisional answer keys with objection window details." active="answer_key">
      <JobSearch posts={posts} emptyLabel="Nothing in Answer Key right now. Check back soon." />
    </JobPageShell>
  );
}
