import { Link } from "@tanstack/react-router";
import { Clock, Calendar } from "lucide-react";
import type { BlogPostSummary } from "@/lib/blog.functions";
import { stageLabel } from "@/lib/job-stages";

export function PostList({
  posts,
  kind,
}: {
  posts: BlogPostSummary[];
  kind: "blog" | "job";
}) {
  if (posts.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Nothing here yet. Check back soon.
      </p>
    );
  }
  return (
    <ul className="grid gap-4 sm:gap-6">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link
            to={kind === "job" ? "/jobs/$slug" : "/blog/$slug"}
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
              {kind === "job" && (
                <span className="mb-2 inline-block rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                  {stageLabel(post.job_stage)}
                </span>
              )}
              <h2 className="font-display text-lg font-bold leading-snug sm:text-xl">
                {post.title}
              </h2>
              {post.excerpt && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {post.excerpt}
                </p>
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
      ))}
    </ul>
  );
}
