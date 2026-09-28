import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  Save,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { JOB_STAGES, stageLabel } from "@/lib/job-stages";
import {
  listJobDrafts,
  updateJobDraft,
  publishJobDraft,
  rejectJobDraft,
  runJobScanNow,
  type JobDraft,
} from "@/lib/job-drafts.functions";

export const Route = createFileRoute("/admin/job-drafts")({
  head: () => ({
    meta: [
      { title: "AI Job Drafts — Admin · SSC Mentor AI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminJobDraftsPage,
});

type StatusFilter = "pending" | "published" | "rejected" | "all";

function AdminJobDraftsPage() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const load = useServerFn(listJobDrafts);
  const save = useServerFn(updateJobDraft);
  const publish = useServerFn(publishJobDraft);
  const reject = useServerFn(rejectJobDraft);
  const scan = useServerFn(runJobScanNow);

  const [status, setStatus] = useState<StatusFilter>("pending");
  const [rows, setRows] = useState<JobDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [open, setOpen] = useState<JobDraft | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (role !== "admin") {
      toast.error("Unauthorized");
      navigate({ to: "/" });
    }
  }, [role, authLoading, navigate]);

  const refresh = async (s: StatusFilter = status) => {
    setLoading(true);
    try {
      setRows(await load({ data: { status: s } }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load drafts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin") void refresh(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, status]);

  const onScan = async () => {
    setScanning(true);
    try {
      const r = await scan({ data: undefined as never });
      toast.success(`Scanned ${r.scanned} links · ${r.created} new draft(s)`);
      await refresh("pending");
      setStatus("pending");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const onPublish = async (d: JobDraft) => {
    setBusy(d.id);
    try {
      const r = await publish({ data: { id: d.id } });
      toast.success(`Published at /jobs/${r.slug}`);
      setOpen(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(null);
    }
  };

  const onReject = async (d: JobDraft) => {
    setBusy(d.id);
    try {
      await reject({ data: { id: d.id } });
      toast.success("Draft rejected");
      setOpen(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusy(null);
    }
  };

  const onSave = async (d: JobDraft) => {
    setBusy(d.id);
    try {
      await save({
        data: {
          id: d.id,
          title: d.title,
          slug: d.slug,
          excerpt: d.excerpt ?? "",
          content_md: d.content_md,
          job_stage: d.job_stage,
          meta_title: d.meta_title ?? "",
          meta_description: d.meta_description ?? "",
          tags: d.tags ?? [],
        },
      });
      toast.success("Saved");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  if (authLoading || role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Admin
        </Link>
        <h1 className="flex-1 text-xl font-bold sm:text-2xl">AI Job Drafts</h1>
        <button
          onClick={onScan}
          disabled={scanning}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {scanning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Scan now
        </button>
      </header>

      <p className="mb-4 text-sm text-muted-foreground">
        AI checks the government-job source twice a day, writes full articles and queues
        them here. Nothing goes live until you publish it.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "published", "rejected", "all"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-semibold capitalize " +
              (status === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground")
            }
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No {status} drafts yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((d) => (
            <li key={d.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {stageLabel(d.job_stage as never)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(d.created_at).toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  {d.status}
                </span>
              </div>
              <h2 className="mt-2 font-semibold">{d.title}</h2>
              {d.excerpt && (
                <p className="mt-1 text-sm text-muted-foreground">{d.excerpt}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setOpen(d)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  Review & edit
                </button>
                <a
                  href={d.source_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Source
                </a>
                {d.status === "pending" && (
                  <>
                    <button
                      onClick={() => onPublish(d)}
                      disabled={busy === d.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" /> Publish
                    </button>
                    <button
                      onClick={() => onReject(d)}
                      disabled={busy === d.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-destructive px-3 py-1.5 text-xs font-semibold text-destructive disabled:opacity-60"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </>
                )}
                {d.published_post_slug && (
                  <a
                    href={`/jobs/${d.published_post_slug}`}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                  >
                    View post
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="flex-1 font-semibold">Edit draft</h2>
              <button
                onClick={() => setOpen(null)}
                className="rounded-lg border border-border px-2 py-1 text-xs"
              >
                Close
              </button>
            </div>

            <label className="mb-1 block text-xs font-semibold">Title</label>
            <input
              value={open.title}
              onChange={(e) => setOpen({ ...open, title: e.target.value })}
              className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />

            <label className="mb-1 block text-xs font-semibold">Slug</label>
            <input
              value={open.slug}
              onChange={(e) => setOpen({ ...open, slug: e.target.value })}
              className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />

            <label className="mb-1 block text-xs font-semibold">Section</label>
            <div className="mb-3 flex flex-wrap gap-2">
              {JOB_STAGES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setOpen({ ...open, job_stage: s.key })}
                  className={
                    "rounded-lg border px-3 py-1.5 text-xs font-semibold " +
                    (open.job_stage === s.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border")
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs font-semibold">Excerpt</label>
            <textarea
              value={open.excerpt ?? ""}
              onChange={(e) => setOpen({ ...open, excerpt: e.target.value })}
              rows={2}
              className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />

            <label className="mb-1 block text-xs font-semibold">Article (Markdown)</label>
            <textarea
              value={open.content_md}
              onChange={(e) => setOpen({ ...open, content_md: e.target.value })}
              rows={18}
              className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onSave(open)}
                disabled={busy === open.id}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
              <button
                onClick={() => onPublish(open)}
                disabled={busy === open.id}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                <Check className="h-3.5 w-3.5" /> Publish
              </button>
              <button
                onClick={() => onReject(open)}
                disabled={busy === open.id}
                className="inline-flex items-center gap-1 rounded-lg border border-destructive px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
