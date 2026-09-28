import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPostBySlug, type BlogPostDetail } from "@/lib/blog.functions";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { stageLabel } from "@/lib/job-stages";
import { NativeAdSlot } from "@/components/NativeAdSlot";
import { useIsAppUser } from "@/lib/app-user";

const SITE_URL = "https://sscmentorai.online";

function jobQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["blog", "post", "job", slug],
    queryFn: () => getPostBySlug({ data: { slug, type: "job" } }),
  });
}

export const Route = createFileRoute("/jobs/$slug")({
  loader: async ({ context, params }) => {
    const post = await context.queryClient.ensureQueryData(jobQueryOptions(params.slug));
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params, loaderData }) => {
    const post = loaderData?.post as BlogPostDetail | undefined;
    const url = `${SITE_URL}/jobs/${params.slug}`;
    if (!post) {
      return {
        meta: [
          { title: "Job post — SSC Mentor AI" },
          { name: "robots", content: "noindex" },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const title = post.meta_title ?? post.title;
    const desc =
      post.meta_description ?? post.excerpt ?? `${post.title} — job notification details.`;
    const image = post.cover_image ?? undefined;
    return {
      meta: [
        { title: `${title} — SSC Mentor AI Jobs` },
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
            author: { "@type": "Organization", name: "SSC Mentor AI" },
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
      <h1 className="text-xl font-semibold">Failed to load job post</h1>
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
      <h1 className="text-2xl font-bold">Job post not found</h1>
      <Link
        to="/jobs"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>
    </div>
  ),
  component: JobPage,
});

function JobPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(jobQueryOptions(slug));
  const isAppUser = useIsAppUser();
  const post = data;

  if (!post) return null;

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
            to="/jobs"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Jobs
          </Link>
          <Link to="/" className="font-display text-sm font-bold">
            SSC Mentor AI
          </Link>
          <span className="w-12" />
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:pt-8">
        {isAppUser && (
          <div className="mb-6">
            <NativeAdSlot slotId="job_post_native_ad" />
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <Link
                key={t}
                to="/jobs/tag/$tag"
                params={{ tag: t }}
                className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary"
              >
                {t}
              </Link>
            ))}
          </div>
        )}

        <span className="mb-3 inline-block rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary-foreground">
          {stageLabel(post.job_stage)}
        </span>

        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
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
        </div>

        {post.cover_image && (
          <figure className="mt-6 overflow-hidden rounded-2xl border border-border bg-muted">
            <img
              src={post.cover_image}
              alt={post.cover_alt ?? post.title}
              width={1600}
              height={900}
              decoding="async"
              className="aspect-[16/9] w-full object-cover"
            />
          </figure>
        )}

        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert prose-headings:font-display prose-a:text-primary prose-img:rounded-xl">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content_md}</ReactMarkdown>
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-5 text-center">
          <p className="text-sm font-semibold">Preparing for this exam?</p>
          <Link
            to="/practice"
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Start practising
          </Link>
        </div>
      </article>
    </div>
  );
}
