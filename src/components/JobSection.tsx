import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { PostList } from "@/components/PostList";
import { JOB_STAGES, type JobStage } from "@/lib/job-stages";
import type { BlogPostSummary } from "@/lib/blog.functions";

export function JobStageTabs({ active }: { active?: JobStage | "all" }) {
  return (
    <nav aria-label="Job sections" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {JOB_STAGES.map((s) => (
        <Link
          key={s.key}
          to={s.path}
          className={
            "rounded-xl border px-3 py-2.5 text-center text-xs font-semibold transition sm:text-sm " +
            (active === s.key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted")
          }
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

export function JobSearch({
  posts,
  emptyLabel = "No posts match your search.",
}: {
  posts: BlogPostSummary[];
  emptyLabel?: string;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return posts;
    return posts.filter((p) =>
      [p.title, p.excerpt ?? "", (p.tags ?? []).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [q, posts]);

  return (
    <>
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by post name, department or keyword…"
          aria-label="Search job posts"
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <PostList posts={filtered} kind="job" />
      )}
    </>
  );
}

export function JobPageShell({
  title,
  subtitle,
  active,
  children,
}: {
  title: string;
  subtitle: string;
  active?: JobStage | "all";
  children: React.ReactNode;
}) {
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
          <Link to="/jobs" className="font-display text-base font-bold">
            Jobs
          </Link>
          <Link to="/blog" className="text-sm font-medium text-primary">
            Blog
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <section className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
        </section>
        <JobStageTabs active={active} />
        {children}
      </main>
    </div>
  );
}
