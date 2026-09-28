import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listPublishedPosts, listPostTags, countJobStages } from "@/lib/blog.functions";
import { JobPageShell, JobSearch } from "@/components/JobSection";
import { JOB_STAGES } from "@/lib/job-stages";

const SITE_URL = "https://sscmentorai.online";

const jobsQueryOptions = queryOptions({
  queryKey: ["blog", "list", "job"],
  queryFn: () => listPublishedPosts({ data: { type: "job" } }),
});

const jobTagsQueryOptions = queryOptions({
  queryKey: ["blog", "tags", "job"],
  queryFn: () => listPostTags({ data: { type: "job" } }),
});

const stageCountsQueryOptions = queryOptions({
  queryKey: ["blog", "job", "stage-counts"],
  queryFn: () => countJobStages(),
});

export const Route = createFileRoute("/jobs/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(jobsQueryOptions),
      context.queryClient.ensureQueryData(jobTagsQueryOptions),
      context.queryClient.ensureQueryData(stageCountsQueryOptions),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Sarkari Jobs: Notification, Admit Card, Answer Key & Result" },
      {
        name: "description",
        content:
          "One place for government job notifications, admit cards, answer keys and results with eligibility, dates and official links.",
      },
      { property: "og:title", content: "Sarkari Jobs — Notification, Admit Card, Answer Key, Result" },
      {
        property: "og:description",
        content: "Govt job notifications, admit cards, answer keys and results in one place.",
      },
      { property: "og:url", content: `${SITE_URL}/jobs` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/jobs` }],
  }),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="text-xl font-semibold">Jobs failed to load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  ),
  component: JobsIndex,
});

function JobsIndex() {
  const { data: posts } = useSuspenseQuery(jobsQueryOptions);
  const { data: tags } = useSuspenseQuery(jobTagsQueryOptions);
  const { data: counts } = useSuspenseQuery(stageCountsQueryOptions);

  return (
    <JobPageShell
      title="Sarkari Job Updates"
      subtitle="Job notifications, admit cards, answer keys and results — the same post moves to the next section as each stage is announced."
      active="all"
    >
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {JOB_STAGES.map((s) => (
          <Link
            key={s.key}
            to={s.path}
            className="rounded-2xl border border-border bg-card p-4 transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold">{s.label}</h2>
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                {counts[s.key] ?? 0}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{s.blurb}</p>
          </Link>
        ))}
      </div>

      {tags.length > 0 && (
        <nav aria-label="Job categories" className="mb-6 flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link
              key={t.tag}
              to="/jobs/tag/$tag"
              params={{ tag: t.tag }}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              {t.tag} ({t.count})
            </Link>
          ))}
        </nav>
      )}

      <JobSearch posts={posts} />
    </JobPageShell>
  );
}
