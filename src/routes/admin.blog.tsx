import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { JOB_STAGES, stageLabel, type JobStage } from "@/lib/job-stages";
import type TurndownService from "turndown";
import {
  ArrowLeft,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Loader2,
  PencilLine,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Link2,
  Quote,
  Table as TableIcon,
  Code,
  Image as ImageIcon,
  Newspaper,
} from "lucide-react";

// turndown is browser-only (it calls `require` on the server), so load it
// lazily in the paste handler instead of at module scope.
let turndownInstance: TurndownService | null = null;
async function getTurndown(): Promise<TurndownService> {
  if (turndownInstance) return turndownInstance;
  const [{ default: Turndown }, { gfm }] = await Promise.all([
    import("turndown"),
    import("turndown-plugin-gfm"),
  ]);
  turndownInstance = new Turndown({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
  });
  turndownInstance.use(gfm);
  return turndownInstance;
}

export const Route = createFileRoute("/admin/blog")({
  head: () => ({
    meta: [
      { title: "Blog Editor — Admin · SSC Mentor AI" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminBlogPage,
});

type PostType = "blog" | "job";

type Row = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  cover_alt: string | null;
  content_md: string;
  tags: string[] | null;
  reading_minutes: number | null;
  published: boolean;
  published_at: string | null;
  author_name: string | null;
  meta_title: string | null;
  meta_description: string | null;
  post_type: PostType;
  job_stage: JobStage;
  updated_at: string;
};

const EMPTY: Omit<Row, "id" | "updated_at"> = {
  slug: "",
  title: "",
  excerpt: "",
  cover_image: "",
  cover_alt: "",
  content_md: "",
  tags: [],
  reading_minutes: 5,
  published: false,
  published_at: null,
  author_name: "SSC Mentor AI",
  meta_title: "",
  meta_description: "",
  post_type: "blog",
  job_stage: "notification",
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function estimateReadingMinutes(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function AdminBlogPage() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | (typeof EMPTY & { id?: string }) | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [filter, setFilter] = useState<"all" | PostType>("all");

  useEffect(() => {
    if (authLoading) return;
    if (role !== "admin") {
      toast.error("Unauthorized");
      navigate({ to: "/" });
    }
  }, [authLoading, role, navigate]);

  const loadList = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setList((data as Row[]) ?? []);
    setLoadingList(false);
  };

  useEffect(() => {
    if (role === "admin") loadList();
  }, [role]);

  const startNew = (post_type: PostType = "blog") => setEditing({ ...EMPTY, post_type });
  const startEdit = (r: Row) =>
    setEditing({ ...r, post_type: r.post_type ?? "blog", job_stage: r.job_stage ?? "notification" });
  const visibleList = list.filter(
    (r) => filter === "all" || (r.post_type ?? "blog") === filter,
  );

  const save = async () => {
    if (!editing) return;
    const e = editing;
    if (!e.title.trim()) return toast.error("Title is required");
    const slug = (e.slug || slugify(e.title)).trim();
    if (!slug) return toast.error("Slug is required");
    if (!e.content_md.trim()) return toast.error("Content is required");

    setBusy(true);
    const payload = {
      slug,
      title: e.title.trim(),
      excerpt: e.excerpt?.trim() || null,
      cover_image: e.cover_image?.trim() || null,
      cover_alt: e.cover_alt?.trim() || null,
      content_md: e.content_md,
      tags: (e.tags ?? []).filter(Boolean),
      reading_minutes: e.reading_minutes ?? estimateReadingMinutes(e.content_md),
      published: e.published,
      published_at:
        e.published && !e.published_at ? new Date().toISOString() : e.published_at,
      author_name: e.author_name?.trim() || "SSC Mentor AI",
      meta_title: e.meta_title?.trim() || null,
      meta_description: e.meta_description?.trim() || null,
      post_type: e.post_type === "job" ? "job" : "blog",
      job_stage: e.post_type === "job" ? (e.job_stage ?? "notification") : "notification",
    };

    let error;
    if ("id" in e && e.id) {
      ({ error } = await supabase.from("blog_posts").update(payload).eq("id", e.id));
    } else {
      ({ error } = await supabase.from("blog_posts").insert(payload));
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    loadList();
  };

  const togglePublish = async (r: Row) => {
    const next = !r.published;
    const { error } = await supabase
      .from("blog_posts")
      .update({
        published: next,
        published_at: next && !r.published_at ? new Date().toISOString() : r.published_at,
      })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success(next ? "Published" : "Unpublished");
    loadList();
  };

  const remove = async (r: Row) => {
    if (!confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadList();
  };

  const uploadToBucket = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("blog-images")
      .upload(path, file, { upsert: false, cacheControl: "31536000" });
    if (upErr) {
      toast.error(upErr.message);
      return null;
    }
    // Bucket is private — generate a long-lived signed URL (1 year)
    const { data: signed, error: signErr } = await supabase.storage
      .from("blog-images")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed) {
      toast.error(signErr?.message ?? "Sign URL failed");
      return null;
    }
    return signed.signedUrl;
  };

  const uploadCover = async (file: File) => {
    if (!editing) return;
    setBusy(true);
    const url = await uploadToBucket(file, "covers");
    setBusy(false);
    if (!url) return;
    setEditing({ ...editing, cover_image: url } as typeof editing);
    toast.success("Image uploaded");
  };

  const tagsInput = useMemo(
    () => (editing?.tags ?? []).join(", "),
    [editing?.tags],
  );

  if (role !== "admin") return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Admin
          </Link>
          <h1 className="mt-1 truncate font-display text-2xl font-bold">
            Blog &amp; Job posts
          </h1>
          <p className="text-xs text-muted-foreground">
            URLs: <code>/blog/&lt;slug&gt;</code> and <code>/jobs/&lt;slug&gt;</code>
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            onClick={() => startNew("blog")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> New blog
          </button>
          <button
            onClick={() => startNew("job")}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"
          >
            <Plus className="h-4 w-4" /> New job post
          </button>
        </div>
      </div>

      {/* Type filter */}
      <div className="flex gap-2">
        {(["all", "blog", "job"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-full border px-3 py-1 text-xs font-semibold capitalize " +
              (filter === f
                ? "border-primary bg-primary-soft text-primary"
                : "border-border text-muted-foreground")
            }
          >
            {f === "all" ? "All" : f === "job" ? "Job posts" : "Blogs"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {loadingList ? (
          <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : visibleList.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nothing here yet. Click <strong>New blog</strong> or{" "}
            <strong>New job post</strong> to create one.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visibleList.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        "h-2 w-2 shrink-0 rounded-full " +
                        (r.published ? "bg-success" : "bg-muted-foreground/40")
                      }
                    />
                    <p className="truncate text-sm font-semibold">{r.title}</p>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                      {r.post_type === "job" ? stageLabel(r.job_stage) : "Blog"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    /{r.post_type === "job" ? "jobs" : "blog"}/{r.slug}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <a
                    href={`/${r.post_type === "job" ? "jobs" : "blog"}/${r.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-border p-2 text-xs text-muted-foreground hover:bg-muted"
                    aria-label="View"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </a>
                  <button
                    onClick={() => togglePublish(r)}
                    className="rounded-md border border-border p-2 text-xs text-muted-foreground hover:bg-muted"
                    aria-label={r.published ? "Unpublish" : "Publish"}
                    title={r.published ? "Unpublish" : "Publish"}
                  >
                    {r.published ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(r)}
                    className="rounded-md border border-border p-2 text-xs text-muted-foreground hover:bg-muted"
                    aria-label="Edit"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(r)}
                    className="rounded-md border border-destructive/40 p-2 text-destructive hover:bg-destructive-soft"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-foreground/40 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
          <div className="max-h-[100dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-elevated sm:max-h-[90vh] sm:rounded-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold">
                {"id" in editing && editing.id ? "Edit post" : "New post"}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <Field label="Content type">
                <div className="flex gap-2">
                  {(["blog", "job"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setEditing({ ...editing, post_type: t } as typeof editing)
                      }
                      className={
                        "rounded-lg border px-3 py-2 text-sm font-semibold " +
                        ((editing.post_type ?? "blog") === t
                          ? "border-primary bg-primary-soft text-primary"
                          : "border-border text-muted-foreground")
                      }
                    >
                      {t === "job" ? "Job post (/jobs)" : "Blog article (/blog)"}
                    </button>
                  ))}
                </div>
              </Field>

              {(editing.post_type ?? "blog") === "job" && (
                <Field label="Job section (move the same post as each stage is announced)">
                  <div className="flex flex-wrap gap-2">
                    {JOB_STAGES.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() =>
                          setEditing({ ...editing, job_stage: s.key } as typeof editing)
                        }
                        className={
                          "rounded-lg border px-3 py-2 text-sm font-semibold " +
                          ((editing.job_stage ?? "notification") === s.key
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border text-muted-foreground")
                        }
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              <Field label="Title">
                <input
                  className="input"
                  value={editing.title}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      title: e.target.value,
                      slug: editing.slug || slugify(e.target.value),
                    } as typeof editing)
                  }
                  placeholder="How to crack SSC CGL Tier 1 in 90 days"
                />
              </Field>

              <Field label="Slug (URL)">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs text-muted-foreground">
                    /{(editing.post_type ?? "blog") === "job" ? "jobs" : "blog"}/
                  </span>
                  <input
                    className="input"
                    value={editing.slug}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        slug: slugify(e.target.value),
                      } as typeof editing)
                    }
                    placeholder="how-to-crack-ssc-cgl"
                  />
                </div>
              </Field>

              <Field label="Excerpt (1–2 sentences)">
                <textarea
                  className="input min-h-[60px]"
                  value={editing.excerpt ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, excerpt: e.target.value } as typeof editing)
                  }
                />
              </Field>

              <Field label="Cover image">
                <div className="space-y-2">
                  <input
                    className="input"
                    value={editing.cover_image ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        cover_image: e.target.value,
                      } as typeof editing)
                    }
                    placeholder="https://… or upload below"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadCover(f);
                    }}
                    className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground"
                  />
                  {editing.cover_image && (
                    <img
                      src={editing.cover_image}
                      alt=""
                      className="aspect-[16/9] w-full rounded-lg object-cover"
                    />
                  )}
                </div>
              </Field>

              <Field label="Cover alt text (for accessibility/SEO)">
                <input
                  className="input"
                  value={editing.cover_alt ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      cover_alt: e.target.value,
                    } as typeof editing)
                  }
                />
              </Field>

              <Field label="Content (Markdown)">
                <MarkdownEditor
                  value={editing.content_md}
                  onChange={(v) =>
                    setEditing({
                      ...editing,
                      content_md: v,
                      reading_minutes: estimateReadingMinutes(v),
                    } as typeof editing)
                  }
                  uploadImage={(file) => uploadToBucket(file, "content")}
                  posts={list
                    .filter((p) => p.id !== (editing as Row).id)
                    .map((p) => ({ slug: p.slug, title: p.title }))}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ~{editing.reading_minutes ?? 1} min read · toolbar for bold/lists/tables/links ·
                  image upload or paste an image directly · link older posts from the
                  post-link button · paste from Word/Docs/web auto-converts to markdown.
                </p>
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Tags (comma separated)">
                  <input
                    className="input"
                    value={tagsInput}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      } as typeof editing)
                    }
                    placeholder="ssc-cgl, strategy"
                  />
                </Field>
                <Field label="Author">
                  <input
                    className="input"
                    value={editing.author_name ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        author_name: e.target.value,
                      } as typeof editing)
                    }
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Meta title (SEO, optional)">
                  <input
                    className="input"
                    value={editing.meta_title ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        meta_title: e.target.value,
                      } as typeof editing)
                    }
                  />
                </Field>
                <Field label="Meta description (SEO, optional)">
                  <input
                    className="input"
                    value={editing.meta_description ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        meta_description: e.target.value,
                      } as typeof editing)
                    }
                  />
                </Field>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.published}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      published: e.target.checked,
                    } as typeof editing)
                  }
                />
                Publish (visible at <code>/blog/{editing.slug || "…"}</code>)
              </label>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={save}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus { outline: 2px solid hsl(var(--primary)); outline-offset: -1px; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

type EditorAction =
  | { type: "wrap"; before: string; after: string; placeholder?: string }
  | { type: "linePrefix"; prefix: string | ((i: number) => string) }
  | { type: "insert"; text: string };

function MarkdownEditor({
  value,
  onChange,
  uploadImage,
  posts = [],
}: {
  value: string;
  onChange: (v: string) => void;
  uploadImage?: (file: File) => Promise<string | null>;
  posts?: { slug: string; title: string }[];
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [postPicker, setPostPicker] = useState(false);
  const [postQuery, setPostQuery] = useState("");


  const apply = (action: EditorAction) => {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end);
    let next = value;
    let cursorStart = start;
    let cursorEnd = end;

    if (action.type === "wrap") {
      const text = sel || action.placeholder || "";
      const insert = action.before + text + action.after;
      next = value.slice(0, start) + insert + value.slice(end);
      cursorStart = start + action.before.length;
      cursorEnd = cursorStart + text.length;
    } else if (action.type === "linePrefix") {
      // expand selection to full lines
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEndIdx = value.indexOf("\n", end);
      const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
      const block = value.slice(lineStart, lineEnd) || "";
      const lines = block.split("\n");
      const prefixed = lines
        .map((l, i) => (typeof action.prefix === "function" ? action.prefix(i) : action.prefix) + l)
        .join("\n");
      next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
      cursorStart = lineStart;
      cursorEnd = lineStart + prefixed.length;
    } else if (action.type === "insert") {
      const needsNl = start > 0 && value[start - 1] !== "\n" ? "\n\n" : "";
      const insert = needsNl + action.text;
      next = value.slice(0, start) + insert + value.slice(end);
      cursorStart = start + insert.length;
      cursorEnd = cursorStart;
    }

    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorStart, cursorEnd);
    });
  };

  const handleImageFile = async (file: File) => {
    if (!uploadImage) return;
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (!url) return;
    const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    apply({ type: "insert", text: `![${alt}](${url})\n` });
    toast.success("Image inserted");
  };

  const onPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Pasted image file → upload and insert at cursor
    const imgFile = Array.from(e.clipboardData.files).find((f) =>
      f.type.startsWith("image/"),
    );
    if (imgFile && uploadImage) {
      e.preventDefault();
      void handleImageFile(imgFile);
      return;
    }
    const html = e.clipboardData.getData("text/html");
    if (!html) return; // let default plain-text paste happen
    e.preventDefault();
    const plain = e.clipboardData.getData("text/plain");
    const start = ref.current?.selectionStart ?? 0;
    const end = ref.current?.selectionEnd ?? 0;
    void (async () => {
      let md = "";
      try {
        const turndown = await getTurndown();
        // Word wraps content in <!--StartFragment-->; turndown handles it fine.
        md = turndown.turndown(html).trim();
      } catch {
        md = plain;
      }
      const ta = ref.current;
      if (!ta) return;
      const next = value.slice(0, start) + md + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + md.length;
        ta.setSelectionRange(pos, pos);
      });
    })();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === "b") {
      e.preventDefault();
      apply({ type: "wrap", before: "**", after: "**", placeholder: "bold text" });
    } else if (k === "i") {
      e.preventDefault();
      apply({ type: "wrap", before: "*", after: "*", placeholder: "italic" });
    } else if (k === "k") {
      e.preventDefault();
      const url = prompt("URL")?.trim();
      if (url) apply({ type: "wrap", before: "[", after: `](${url})`, placeholder: "text" });
    }
  };

  const insertLink = () => {
    const url = prompt("URL")?.trim();
    if (!url) return;
    apply({ type: "wrap", before: "[", after: `](${url})`, placeholder: "link text" });
  };

  const insertTable = () => {
    const cols = Math.max(1, parseInt(prompt("Columns?", "3") || "3", 10));
    const rows = Math.max(1, parseInt(prompt("Rows (excluding header)?", "2") || "2", 10));
    const header = "| " + Array.from({ length: cols }, (_, i) => `Header ${i + 1}`).join(" | ") + " |";
    const sep = "| " + Array.from({ length: cols }, () => "---").join(" | ") + " |";
    const body = Array.from({ length: rows }, () =>
      "| " + Array.from({ length: cols }, () => "  ").join(" | ") + " |",
    ).join("\n");
    apply({ type: "insert", text: `${header}\n${sep}\n${body}\n` });
  };

  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-1.5">
        <button type="button" title="Bold (Ctrl+B)" className={btn}
          onClick={() => apply({ type: "wrap", before: "**", after: "**", placeholder: "bold text" })}>
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Italic (Ctrl+I)" className={btn}
          onClick={() => apply({ type: "wrap", before: "*", after: "*", placeholder: "italic" })}>
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Heading 2" className={btn}
          onClick={() => apply({ type: "linePrefix", prefix: "## " })}>
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Heading 3" className={btn}
          onClick={() => apply({ type: "linePrefix", prefix: "### " })}>
          <Heading3 className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Bullet list" className={btn}
          onClick={() => apply({ type: "linePrefix", prefix: "- " })}>
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Numbered list" className={btn}
          onClick={() => apply({ type: "linePrefix", prefix: (i) => `${i + 1}. ` })}>
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Quote" className={btn}
          onClick={() => apply({ type: "linePrefix", prefix: "> " })}>
          <Quote className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Inline code" className={btn}
          onClick={() => apply({ type: "wrap", before: "`", after: "`", placeholder: "code" })}>
          <Code className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Link (Ctrl+K)" className={btn} onClick={insertLink}>
          <Link2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" title="Insert table" className={btn} onClick={insertTable}>
          <TableIcon className="h-3.5 w-3.5" />
        </button>
        {uploadImage && (
          <button
            type="button"
            title="Insert image (upload)"
            className={btn}
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" />
            )}
          </button>
        )}
        {posts.length > 0 && (
          <button
            type="button"
            title="Link to an older blog post"
            className={btn}
            onClick={() => {
              setPostQuery("");
              setPostPicker((v) => !v);
            }}
          >
            <Newspaper className="h-3.5 w-3.5" />
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void handleImageFile(f);
          }}
        />
      </div>
      {postPicker && (
        <div className="border-b border-border bg-muted/20 p-2">
          <input
            className="input mb-2"
            placeholder="Search older posts…"
            value={postQuery}
            onChange={(e) => setPostQuery(e.target.value)}
          />
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {posts
              .filter((p) =>
                (p.title + " " + p.slug).toLowerCase().includes(postQuery.toLowerCase()),
              )
              .slice(0, 30)
              .map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    apply({
                      type: "wrap",
                      before: "[",
                      after: `](/blog/${p.slug})`,
                      placeholder: p.title,
                    });
                    setPostPicker(false);
                  }}
                >
                  {p.title}
                  <span className="ml-1 text-muted-foreground">/blog/{p.slug}</span>
                </button>
              ))}
          </div>
        </div>
      )}
      <textarea
        ref={ref}
        className="block w-full resize-y rounded-b-lg bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground focus:outline-none"
        style={{ minHeight: 280 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        onKeyDown={onKeyDown}
        placeholder={"## Introduction\n\nWrite in Markdown, or paste from Word/Docs…"}
      />
    </div>
  );
}
