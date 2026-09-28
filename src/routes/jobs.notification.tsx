import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listPublishedPosts } from "@/lib/blog.functions";
import { JobPageShell, JobSearch } from "@/components/JobSection";

const SITE_URL = "https://sscmentorai.online";

const opts = queryOptions({
  queryKey: ["blog", "list", "job", "notification"],
  queryFn: () => listPublishedPosts({ data: { type: "job", stage: "notification" } }),
});

export const Route = createFileRoute("/jobs/notification")({
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  head: () => ({
    meta: [
      { title: "Job Notification — Latest Sarkari Job Notification | SSC Mentor AI" },
      { name: "description", content: "Latest government job notifications, vacancies, eligibility and apply links." },
      { property: "og:title", content: "Job Notification — SSC Mentor AI" },
      { property: "og:description", content: "Latest government job notifications, vacancies, eligibility and apply links." },
      { property: "og:url", content: `${SITE_URL}/jobs/notification` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/jobs/notification` }],
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
    <JobPageShell title="Job Notification" subtitle="Latest government job notifications, vacancies, eligibility and apply links." active="notification">
      <JobSearch posts={posts} emptyLabel="Nothing in Job Notification right now. Check back soon." />
    </JobPageShell>
  );
}
