import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { JobStage } from "@/lib/job-stages";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export type PostType = "blog" | "job";

export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  cover_alt: string | null;
  tags: string[] | null;
  reading_minutes: number | null;
  published_at: string | null;
  author_name: string | null;
  post_type: string | null;
  job_stage: string | null;
};

export type BlogPostDetail = BlogPostSummary & {
  content_md: string;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string;
};

const SUMMARY_COLS =
  "slug,title,excerpt,cover_image,cover_alt,tags,reading_minutes,published_at,author_name,post_type,job_stage";
const DETAIL_COLS = `${SUMMARY_COLS},content_md,meta_title,meta_description,updated_at`;

export const listPublishedPosts = createServerFn({ method: "GET" })
  .inputValidator((data?: { type?: PostType; tag?: string; stage?: JobStage }) => data ?? {})
  .handler(async ({ data }): Promise<BlogPostSummary[]> => {
    const sb = publicClient();
    let q = sb
      .from("blog_posts")
      .select(SUMMARY_COLS)
      .eq("published", true)
      .eq("post_type", data?.type ?? "blog");
    if (data?.tag) q = q.contains("tags", [data.tag]);
    if (data?.stage) q = q.eq("job_stage", data.stage);
    const { data: rows, error } = await q
      .order("published_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (rows ?? []) as BlogPostSummary[];
  });

export const listPostTags = createServerFn({ method: "GET" })
  .inputValidator((data?: { type?: PostType }) => data ?? {})
  .handler(async ({ data }): Promise<{ tag: string; count: number }[]> => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("blog_posts")
      .select("tags")
      .eq("published", true)
      .eq("post_type", data?.type ?? "blog")
      .limit(500);
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const r of rows ?? []) {
      for (const t of (r.tags ?? []) as string[]) {
        const key = String(t).trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  });

export const getPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string; type?: PostType }) => data)
  .handler(async ({ data }): Promise<BlogPostDetail | null> => {
    const sb = publicClient();
    let q = sb
      .from("blog_posts")
      .select(DETAIL_COLS)
      .eq("slug", data.slug)
      .eq("published", true);
    if (data.type) q = q.eq("post_type", data.type);
    const { data: row, error } = await q.maybeSingle();
    if (error) throw new Error(error.message);
    return (row as BlogPostDetail | null) ?? null;
  });

export const countJobStages = createServerFn({ method: "GET" }).handler(
  async (): Promise<Record<string, number>> => {
    const sb = publicClient();
    const { data: rows, error } = await sb
      .from("blog_posts")
      .select("job_stage")
      .eq("published", true)
      .eq("post_type", "job")
      .limit(1000);
    if (error) throw new Error(error.message);
    const counts: Record<string, number> = {};
    for (const r of rows ?? []) {
      const k = (r as { job_stage: string | null }).job_stage ?? "notification";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  },
);
