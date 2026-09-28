import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listPublishedPosts } from "@/lib/blog.functions";
import { PostList } from "@/components/PostList";
import { ArrowLeft } from "lucide-react";

const SITE_URL = "https://sscmentorai.online";

function tagQueryOptions(tag: string) {
  return queryOptions({
    queryKey: ["blog", "list", "blog", "tag", tag],
    queryFn: () => listPublishedPosts({ data: { type: "blog", tag } }),
  });
}

export const Route = createFileRoute("/blog/tag/$tag")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(tagQueryOptions(params.tag)),
  head: ({ params }) => {
    const title = `${params.tag} articles — SSC Mentor AI Blog`;
    const desc = `All SSC Mentor AI blog articles about ${params.tag}: tips, strategy and study plans.`;
    const url = `${SITE_URL}/blog/tag/${params.tag}`;
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
  component: BlogTagPage,
});

function BlogTagPage() {
  const { tag } = Route.useParams();
  const { data: posts } = useSuspenseQuery(tagQueryOptions(tag));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Blog
          </Link>
          <span className="font-display text-base font-bold">{tag}</span>
          <span className="w-12" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-6 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {tag}
        </h1>
        <PostList posts={posts} kind="blog" />
      </main>
    </div>
  );
}
