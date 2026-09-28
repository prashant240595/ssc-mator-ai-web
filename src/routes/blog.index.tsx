import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import {
  listPublishedPosts,
  listPostTags,
  type BlogPostSummary,
} from "@/lib/blog.functions";
import { ArrowLeft, Clock, Calendar } from "lucide-react";

const SITE_URL = "https://sscmentorai.online";

const postsQueryOptions = queryOptions({
  queryKey: ["blog", "list", "blog"],
  queryFn: () => listPublishedPosts({ data: { type: "blog" } }),
});

const tagsQueryOptions = queryOptions({
  queryKey: ["blog", "tags", "blog"],
  queryFn: () => listPostTags({ data: { type: "blog" } }),
});

export const Route = createFileRoute("/blog/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(postsQueryOptions),
      context.queryClient.ensureQueryData(tagsQueryOptions),
    ]);
  },
  head: () => ({
    meta: [
      { title: "SSC Mentor AI Blog — Tips, Strategy & Updates" },
      {
        name: "description",
        content:
          "Latest SSC CGL preparation tips, strategy guides, exam updates and study plans from SSC Mentor AI.",
      },
      { property: "og:title", content: "SSC Mentor AI Blog" },
      {
        property: "og:description",
        content: "SSC CGL tips, strategy, and exam updates.",
      },
      { property: "og:url", content: `${SITE_URL}/blog` },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/blog` }],
  }),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="text-xl font-semibold">Blog failed to load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
    </div>
  ),
  component: BlogIndex,
});

function BlogIndex() {
  const { data: posts } = useSuspenseQuery(postsQueryOptions);
  const { data: tags } = useSuspenseQuery(tagsQueryOptions);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <span className="font-display text-base font-bold">Blog</span>
          <Link to="/jobs" className="text-sm font-medium text-primary">
            Jobs
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <section className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            SSC Mentor AI Blog
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Strategy, tips, and study plans for SSC CGL aspirants. Looking for vacancies?
            See{" "}
            <Link to="/jobs" className="font-semibold text-primary underline">
              latest job posts
            </Link>
            .
          </p>
        </section>

        {tags.length > 0 && (
          <nav aria-label="Blog topics" className="mb-8 flex flex-wrap gap-2">
            {tags.map((t) => (
              <Link
                key={t.tag}
                to="/blog/tag/$tag"
                params={{ tag: t.tag }}
                className="rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                {t.tag} ({t.count})
              </Link>
            ))}
          </nav>
        )}


        {posts.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No posts yet. Check back soon.
          </p>
        ) : (
          <ul className="grid gap-4 sm:gap-6">
            {posts.map((p) => (
              <PostCard key={p.slug} post={p} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function PostCard({ post }: { post: BlogPostSummary }) {
  return (
    <li>
      <Link
        to="/blog/$slug"
        params={{ slug: post.slug }}
        className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
      >
        {post.cover_image && (
          <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
            <img
              src={post.cover_image}
              alt={post.cover_alt ?? post.title}
              loading="lazy"
              decoding="async"
              width={1200}
              height={675}
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
          </div>
        )}
        <div className="p-4 sm:p-5">
          <h2 className="font-display text-lg font-bold leading-snug sm:text-xl">
            {post.title}
          </h2>
          {post.excerpt && (
            <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {post.published_at && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(post.published_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {post.reading_minutes != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {post.reading_minutes} min read
              </span>
            )}
            {post.tags && post.tags.length > 0 && (
              <span className="flex flex-wrap gap-1">
                {post.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary"
                  >
                    {t}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

// silence unused-import for notFound (kept for parity / future use)
void notFound;
