import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BASE_URL = "https://sscmentorai.online";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/exams", changefreq: "weekly", priority: "0.9" },
          { path: "/practice", changefreq: "weekly", priority: "0.9" },
          
          { path: "/ai-coach", changefreq: "monthly", priority: "0.7" },
          { path: "/daily-quiz", changefreq: "daily", priority: "0.9" },
          { path: "/partners", changefreq: "weekly", priority: "0.6" },
          { path: "/groups", changefreq: "weekly", priority: "0.6" },
          { path: "/timer", changefreq: "monthly", priority: "0.5" },
          { path: "/blog", changefreq: "daily", priority: "0.9" },
          { path: "/jobs", changefreq: "daily", priority: "0.9" },
          { path: "/jobs/notification", changefreq: "daily", priority: "0.9" },
          { path: "/jobs/admit-card", changefreq: "daily", priority: "0.9" },
          { path: "/jobs/answer-key", changefreq: "daily", priority: "0.8" },
          { path: "/jobs/result", changefreq: "daily", priority: "0.9" },
          { path: "/about-us", changefreq: "monthly", priority: "0.5" },
          { path: "/contact-us", changefreq: "monthly", priority: "0.5" },
          { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms-and-conditions", changefreq: "yearly", priority: "0.3" },
          { path: "/disclaimer", changefreq: "yearly", priority: "0.3" },
        ];


        // Append published blog posts, job posts and their tag pages
        try {
          const sb = createClient<Database>(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
          );
          const { data } = await sb
            .from("blog_posts")
            .select("slug,updated_at,tags,post_type")
            .eq("published", true)
            .order("published_at", { ascending: false })
            .limit(1000);
          const blogTags = new Set<string>();
          const jobTags = new Set<string>();
          for (const row of data ?? []) {
            const isJob = (row as { post_type?: string }).post_type === "job";
            const base = isJob ? "/jobs" : "/blog";
            entries.push({
              path: `${base}/${row.slug}`,
              changefreq: "weekly",
              priority: "0.8",
              lastmod: row.updated_at,
            });
            for (const t of ((row.tags ?? []) as string[])) {
              const tag = String(t).trim();
              if (!tag) continue;
              (isJob ? jobTags : blogTags).add(tag);
            }
          }
          for (const tag of blogTags) {
            entries.push({
              path: `/blog/tag/${encodeURIComponent(tag)}`,
              changefreq: "weekly",
              priority: "0.6",
            });
          }
          for (const tag of jobTags) {
            entries.push({
              path: `/jobs/tag/${encodeURIComponent(tag)}`,
              changefreq: "weekly",
              priority: "0.6",
            });
          }
        } catch {
          // best-effort: skip dynamic posts on failure
        }


        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});

