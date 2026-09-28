/**
 * Server-only: scan a government-job source site, detect new postings,
 * and let Gemini write a full SEO article draft for admin review.
 * Nothing is published automatically — every article lands in `job_drafts`
 * with status = 'pending'.
 */
import { geminiChat } from "@/lib/gemini-direct.server";
import type { JobStage } from "@/lib/job-stages";

const SOURCE_HOSTS = ["https://sarkariresult.com.cm/"];
const MAX_NEW_PER_RUN = 6;

export type ScannedLink = { url: string; title: string };

function absolute(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Very small HTML anchor extractor (no DOM available on Workers). */
export function extractLinks(html: string, base: string): ScannedLink[] {
  const out: ScannedLink[] = [];
  const seen = new Set<string>();
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1] ?? "";
    const title = decodeEntities((m[2] ?? "").replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim();
    if (!title || title.length < 12 || title.length > 180) continue;
    if (/^(#|javascript:|mailto:|tel:)/i.test(href)) continue;
    const url = absolute(href, base);
    if (!url) continue;
    if (seen.has(url)) continue;
    // Only keep links that look like actual job posts
    if (
      !/(recruitment|vacancy|bharti|admit\s*card|answer\s*key|result|online\s*form|notification|apply)/i.test(
        title,
      )
    )
      continue;
    seen.add(url);
    out.push({ url, title });
  }
  return out;
}

export function guessStage(title: string): JobStage {
  const t = title.toLowerCase();
  if (/admit\s*card|hall\s*ticket|call\s*letter/.test(t)) return "admit_card";
  if (/answer\s*key/.test(t)) return "answer_key";
  if (/\bresult\b|merit\s*list|final\s*selection/.test(t)) return "result";
  return "notification";
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; SSCMentorAIBot/1.0; +https://sscmentorai.online)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  return res.text();
}

/** Strip tags/scripts and keep readable text for the AI prompt. */
function htmlToText(html: string, limit = 12000): string {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, "\n"),
  )
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, limit);
}

const ARTICLE_SYSTEM = `You are an expert Indian government-job (Sarkari Naukri) content writer for the site SSC Mentor AI.
You will be given the raw text of ONE government job page. Write an original, well-structured, SEO-friendly article about it in English.

Strict rules:
- Only use facts present in the given page text. NEVER invent dates, fees, vacancy counts or links. If a detail is missing, omit it.
- If the page is not a genuine government job/admit card/answer key/result page, set "usable" to false.
- Do NOT copy sentences from the source. Rewrite in your own words.
- Article must be Markdown with: a short intro paragraph, then "## Important Dates", "## Application Fee", "## Vacancy Details", "## Eligibility", "## How to Apply" (or stage-appropriate sections like "## How to Download Admit Card" / "## How to Check Result"), and "## Important Links".
- "## Important Links" must contain ONLY official links belonging to the recruiting organisation / exam conducting body found in the page text (e.g. ssc.gov.in, upsc.gov.in, ibps.in, rrbapply.gov.in, the department's own portal, or the official apply/notification PDF URL on that portal).
- NEVER include links to aggregator/news/job-listing websites such as sarkariresult, sarkariresult.com.cm, sarkarijobfind, freejobalert, rojgarresult, naukri sites, telegram, whatsapp, youtube or any social media. Silently drop them.
- If no official organisation link exists in the page text, write "Official links will be updated soon." instead of inventing a URL.
- Use markdown tables for dates, fees and vacancy details when data exists.
- 400-800 words. No emojis. No promotional fluff.
- "stage" must be one of: notification, admit_card, answer_key, result.

Return ONLY valid JSON (no markdown fence, no prose):
{"usable":true,"title":"...","stage":"notification","excerpt":"one-line 150 char summary","meta_title":"under 60 chars","meta_description":"under 155 chars","tags":["SSC","Recruitment 2026"],"content_md":"..."}`;

export type DraftPayload = {
  source_url: string;
  source_title: string;
  job_stage: JobStage;
  title: string;
  slug: string;
  excerpt: string;
  content_md: string;
  tags: string[];
  meta_title: string;
  meta_description: string;
};

const BLOCKED_LINK_HOSTS =
  /(sarkariresult|sarkarijob|sarkariexam|freejobalert|rojgarresult|resultbharat|naukri|jobriya|t\.me|telegram|whatsapp|facebook|instagram|twitter|x\.com|youtube|youtu\.be)/i;

/** Remove markdown links pointing at aggregator/social sites; keep the label text. */
export function stripAggregatorLinks(md: string): string {
  return md
    .replace(/\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (full, label: string, url: string) =>
      BLOCKED_LINK_HOSTS.test(url) ? String(label).trim() : full,
    )
    .replace(/^\s*[-*]\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n");
}

export async function writeArticle(link: ScannedLink): Promise<DraftPayload | null> {
  let pageText = "";
  try {
    pageText = htmlToText(await fetchText(link.url));
  } catch (e) {
    console.warn("[job-scan] page fetch failed", link.url, e);
    return null;
  }
  if (pageText.length < 300) return null;

  let raw = "";
  try {
    raw = await geminiChat({
      messages: [
        { role: "system", content: ARTICLE_SYSTEM },
        {
          role: "user",
          content: `Source page title: ${link.title}\nSource URL: ${link.url}\n\nPage text:\n${pageText}`,
        },
      ],
      model: "gemini-2.5-flash",
      maxTokens: 4096,
      json: true,
    });
  } catch (e) {
    console.warn("[job-scan] gemini failed", link.url, e);
    return null;
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim());
  } catch {
    return null;
  }
  if (!parsed || parsed.usable === false) return null;

  const title = String(parsed.title ?? link.title).trim();
  const content_md = stripAggregatorLinks(String(parsed.content_md ?? "").trim());
  if (!title || content_md.length < 300) return null;

  const stage = ["notification", "admit_card", "answer_key", "result"].includes(parsed.stage)
    ? (parsed.stage as JobStage)
    : guessStage(title);

  return {
    source_url: link.url,
    source_title: link.title,
    job_stage: stage,
    title,
    slug: slugify(title) || slugify(link.title),
    excerpt: String(parsed.excerpt ?? "").slice(0, 300),
    content_md,
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 6)
      : [],
    meta_title: String(parsed.meta_title ?? title).slice(0, 70),
    meta_description: String(parsed.meta_description ?? parsed.excerpt ?? "").slice(0, 170),
  };
}

/**
 * Full run: read source site(s), skip already-seen URLs, generate drafts.
 */
export async function scanAndDraftJobs(
  limit = MAX_NEW_PER_RUN,
): Promise<{ scanned: number; created: number; titles: string[] }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const links: ScannedLink[] = [];
  for (const host of SOURCE_HOSTS) {
    try {
      links.push(...extractLinks(await fetchText(host), host));
    } catch (e) {
      console.warn("[job-scan] source fetch failed", host, e);
    }
  }

  if (links.length === 0) return { scanned: 0, created: 0, titles: [] };

  const urls = links.map((l) => l.url);
  const { data: existing } = await supabaseAdmin
    .from("job_drafts" as never)
    .select("source_url")
    .in("source_url", urls);
  const seen = new Set((existing ?? []).map((r: any) => r.source_url as string));

  const fresh = links.filter((l) => !seen.has(l.url)).slice(0, limit);

  const titles: string[] = [];
  let created = 0;
  for (const link of fresh) {
    const draft = await writeArticle(link);
    if (!draft) continue;
    const { error } = await supabaseAdmin
      .from("job_drafts" as never)
      .insert(draft as never);
    if (error) {
      console.warn("[job-scan] insert failed", error.message);
      continue;
    }
    created++;
    titles.push(draft.title);
  }

  return { scanned: links.length, created, titles };
}
