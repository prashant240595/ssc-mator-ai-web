import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_EMAIL } from "@/lib/admin-constants";

export type JobDraft = {
  id: string;
  source_url: string;
  source_title: string | null;
  job_stage: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content_md: string;
  tags: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  status: string;
  published_post_slug: string | null;
  created_at: string;
};

function assertAdmin(context: any) {
  const email = String(context?.claims?.email ?? "").toLowerCase();
  if (email !== ADMIN_EMAIL) throw new Error("Forbidden");
}

export const listJobDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input?: { status?: string }) => ({ status: input?.status ?? "pending" }))
  .handler(async ({ data, context }): Promise<JobDraft[]> => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("job_drafts" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as JobDraft[];
  });

export const updateJobDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      content_md?: string;
      job_stage?: string;
      tags?: string[];
      meta_title?: string;
      meta_description?: string;
    }) => {
      if (!input?.id) throw new Error("Missing draft id");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const clean = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined),
    );
    const { error } = await supabaseAdmin
      .from("job_drafts" as never)
      .update(clean as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectJobDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing draft id");
    return input;
  })
  .handler(async ({ data, context }) => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("job_drafts" as never)
      .update({ status: "rejected", reviewed_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Publishes an approved draft into blog_posts as a job post. */
export const publishJobDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing draft id");
    return input;
  })
  .handler(async ({ data, context }) => {
    assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: draft, error: fetchErr } = await supabaseAdmin
      .from("job_drafts" as never)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!draft) throw new Error("Draft not found");
    const d = draft as any;

    // unique slug
    let slug = String(d.slug || "").trim() || `job-${Date.now()}`;
    for (let i = 0; i < 20; i++) {
      const { data: clash } = await supabaseAdmin
        .from("blog_posts")
        .select("slug")
        .eq("slug", slug)
        .maybeSingle();
      if (!clash) break;
      slug = `${String(d.slug)}-${i + 2}`;
    }

    const words = String(d.content_md ?? "").split(/\s+/).length;
    const { error: insErr } = await supabaseAdmin.from("blog_posts").insert({
      slug,
      title: d.title,
      excerpt: d.excerpt,
      content_md: d.content_md,
      tags: d.tags ?? [],
      meta_title: d.meta_title,
      meta_description: d.meta_description,
      post_type: "job",
      job_stage: d.job_stage ?? "notification",
      published: true,
      published_at: new Date().toISOString(),
      reading_minutes: Math.max(1, Math.round(words / 200)),
      author_name: "SSC Mentor AI",
    });
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin
      .from("job_drafts" as never)
      .update({
        status: "published",
        published_post_slug: slug,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);

    return { ok: true, slug };
  });

/** Admin button: run the source scan right now instead of waiting for the cron. */
export const runJobScanNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context);
    const { scanAndDraftJobs } = await import("@/lib/job-scan.server");
    return scanAndDraftJobs();
  });
