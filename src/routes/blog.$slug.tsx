import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPostBySlug, type BlogPostDetail } from "@/lib/blog.functions";
import { ArrowLeft, Clock, Calendar, User } from "lucide-react";

const SITE_URL = "https://sscmentorai.online";

function postQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["blog", "post", slug],
    queryFn: () => getPostBySlug({ data: { slug, type: "blog" } }),
  });
}

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ context, params }) => {
    const post = await context.queryClient.ensureQueryData(postQueryOptions(params.slug));
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params, loaderData }) => {
    const post = loaderData?.post as BlogPostDetail | undefined;
    const url = `${SITE_URL}/blog/${params.slug}`;
    if (!post) {
      return {
        meta: [{ title: "Post — SSC Mentor AI" }],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const title = post.meta_title ?? post.title;
    const desc =
      post.meta_description ?? post.excerpt ?? `${post.title} — SSC Mentor AI blog.`;
    const image = post.cover_image ?? undefined;
    return {
      meta: [
        { title: `${title} — SSC Mentor AI` },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...(image ? [{ property: "og:image", content: image }] : []),
        ...(image ? [{ name: "twitter:image", content: image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        ...(post.published_at
          ? [{ property: "article:published_time", content: post.published_at }]
          : []),
        { property: "article:modified_time", content: post.updated_at },
        ...(post.author_name
          ? [{ property: "article:author", content: post.author_name }]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: desc,
            image: image ? [image] : undefined,
            datePublished: post.published_at,
            dateModified: post.updated_at,
            author: { "@type": "Person", name: post.author_name ?? "SSC Mentor AI" },
            publisher: {
              "@type": "Organization",
              name: "SSC Mentor AI",
              url: SITE_URL,
            },
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
          }),
        },
      ],
    };
  },
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <h1 className="text-xl font-semibold">Failed to load article</h1>
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
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Article not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This post may have been moved or unpublished.
      </p>
      <Link
        to="/blog"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to blog
      </Link>
    </div>
  ),
  component: PostPage,
});

function PostPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(postQueryOptions(slug));
  const post = data!;

  const published = post.published_at
    ? new Date(post.published_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

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
          <Link to="/" className="font-display text-sm font-bold">
            SSC Mentor AI
          </Link>
          <span className="w-12" />
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:pt-8">
        {post.tags && post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <Link
                key={t}
                to="/blog/tag/$tag"
                params={{ tag: t }}
                className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary"
              >
                {t}
              </Link>
            ))}
          </div>
        )}

        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">{post.excerpt}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:text-sm">
          {post.author_name && (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> {post.author_name}
            </span>
          )}
          {published && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> {published}
            </span>
          )}
          {post.reading_minutes != null && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {post.reading_minutes} min read
            </span>
          )}
        </div>

        {post.cover_image && (
          <figure className="mt-6 overflow-hidden rounded-2xl border border-border bg-muted">
            <img
              src={post.cover_image}
              alt={post.cover_alt ?? post.title}
              width={1600}
              height={900}
              fetchPriority="high"
              decoding="async"
              className="aspect-[16/9] w-full object-cover"
            />
            {post.cover_alt && (
              <figcaption className="px-4 py-2 text-xs text-muted-foreground">
                {post.cover_alt}
              </figcaption>
            )}
          </figure>
        )}

        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-display prose-headings:tracking-tight prose-a:text-primary prose-img:rounded-xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content_md}</ReactMarkdown>
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm font-semibold">Want to crack SSC CGL?</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Practice with adaptive AI mentor — free to start.
          </p>
          <Link
            to="/"
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Start practising
          </Link>
        </div>
      </article>
    </div>
  );
}
