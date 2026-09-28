import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listPublishedPosts } from "@/lib/blog.functions";
import { PostList } from "@/components/PostList";
import { ArrowLeft } from "lucide-react";

const SITE_URL = "https://sscmentorai.online";

function jobTagQueryOptions(tag: string) {
  return queryOptions({
    queryKey: ["blog", "list", "job", "tag", tag],
    queryFn: () => listPublishedPosts({ data: { type: "job", tag } }),
  });
}

export const Route = createFileRoute("/jobs/tag/$tag")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(jobTagQueryOptions(params.tag)),
  head: ({ params }) => {
    const title = `${params.tag} job posts & vacancies — SSC Mentor AI`;
    const desc = `Latest ${params.tag} government job notifications, vacancies, eligibility and apply links.`;
    const url = `${SITE_URL}/jobs/tag/${params.tag}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: JobTagPage,
});

function JobTagPage() {
  const { tag } = Route.useParams();
  const { data: posts } = useSuspenseQuery(jobTagQueryOptions(tag));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Jobs
          </Link>
          <span className="font-display text-base font-bold">{tag}</span>
          <span className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {tag} jobs
        </h1>
        <PostList posts={posts} kind="job" />
      </main>
    </div>
  );
}
