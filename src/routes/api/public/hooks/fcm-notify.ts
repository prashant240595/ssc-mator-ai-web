/**
 * Public webhook endpoint called by DB triggers (via pg_net) to send push
 * notifications for chat / group / partner-request / daily-reminder events.
 *
 * Auth: expects `apikey` header equal to SUPABASE_PUBLISHABLE_KEY (anon key).
 */
import { createFileRoute } from "@tanstack/react-router";
import { sendPushToUsers } from "@/lib/fcm.server";

type NotifyBody =
  | {
      type: "direct_message";
      sender_id: string;
      receiver_id: string;
      content: string;
    }
  | {
      type: "group_message";
      group_id: string;
      sender_id: string;
      content: string;
    }
  | {
      type: "partner_request";
      requester_id: string;
      addressee_id: string;
    }
  | {
      type: "new_test";
      test_id: string;
      title: string;
      notification_title?: string;
      exam_type?: "mock_test" | "pyq" | string;
      question_count?: number;
    }
  | {
      type: "new_daily_quiz";
      quiz_type: "mixed" | "current_affairs";
      quiz_date: string;
    }
  | {
      type: "new_blog";
      slug: string;
      title: string;
      excerpt?: string | null;
      post_type?: "blog" | "job" | null;
    }
  | { type: "daily_reminder" };

function trim(text: string, n: number) {
  if (!text) return "";
  return text.length > n ? text.slice(0, n - 1) + "…" : text;
}

export const Route = createFileRoute("/api/public/hooks/fcm-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey");
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        let body: NotifyBody;
        try {
          body = (await request.json()) as NotifyBody;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          if (body.type === "direct_message") {
            // Skip if AI recipient
            const { data: rec } = await supabaseAdmin
              .from("profiles")
              .select("id, is_ai, full_name")
              .eq("id", body.receiver_id)
              .maybeSingle();
            if (!rec || rec.is_ai) return Response.json({ skipped: true });

            const { data: sender } = await supabaseAdmin
              .from("profiles")
              .select("full_name")
              .eq("id", body.sender_id)
              .maybeSingle();

            await sendPushToUsers([body.receiver_id], {
              title: sender?.full_name || "New message",
              body: trim(body.content, 120),
              url: `/chat/${body.sender_id}`,
              tag: `dm:${body.sender_id}`,
            });
          } else if (body.type === "group_message") {
            const { data: members } = await supabaseAdmin
              .from("group_members")
              .select("user_id")
              .eq("group_id", body.group_id);
            const recipients = (members ?? [])
              .map((m) => m.user_id as string)
              .filter((id) => id !== body.sender_id);
            if (recipients.length === 0) return Response.json({ skipped: true });

            const { data: group } = await supabaseAdmin
              .from("study_groups")
              .select("name")
              .eq("id", body.group_id)
              .maybeSingle();
            const { data: sender } = await supabaseAdmin
              .from("profiles")
              .select("full_name")
              .eq("id", body.sender_id)
              .maybeSingle();

            await sendPushToUsers(recipients, {
              title: group?.name ? `${group.name}` : "Group message",
              body: `${sender?.full_name || "Someone"}: ${trim(body.content, 100)}`,
              url: `/groups/${body.group_id}`,
              tag: `group:${body.group_id}`,
            });
          } else if (body.type === "partner_request") {
            const { data: rec } = await supabaseAdmin
              .from("profiles")
              .select("is_ai")
              .eq("id", body.addressee_id)
              .maybeSingle();
            if (!rec || rec.is_ai) return Response.json({ skipped: true });

            const { data: requester } = await supabaseAdmin
              .from("profiles")
              .select("full_name")
              .eq("id", body.requester_id)
              .maybeSingle();

            await sendPushToUsers([body.addressee_id], {
              title: "New friend request",
              body: `${requester?.full_name || "Someone"} wants to be your study partner`,
              url: `/partners`,
              tag: `pr:${body.requester_id}`,
            });
          } else if (body.type === "new_test") {
            const { data: rows } = await supabaseAdmin
              .from("device_tokens")
              .select("user_id");
            const uniq = Array.from(
              new Set((rows ?? []).map((r) => r.user_id as string)),
            );
            if (uniq.length === 0) return Response.json({ sent: 0 });
            const qc = body.question_count ? ` (${body.question_count} questions)` : "";
            await sendPushToUsers(uniq, {
              title:
                body.notification_title ||
                (body.exam_type === "pyq" ? "New PYQ available 📚" : "New mock test available 📝"),
              body: `${body.title}${qc} — attempt now!`,
              url: `/mock-tests`,
              tag: `test:${body.test_id}`,
            });
          } else if (body.type === "new_daily_quiz") {
            const { data: rows } = await supabaseAdmin
              .from("device_tokens")
              .select("user_id");
            const uniq = Array.from(
              new Set((rows ?? []).map((r) => r.user_id as string)),
            );
            if (uniq.length === 0) return Response.json({ sent: 0 });
            const isCA = body.quiz_type === "current_affairs";
            await sendPushToUsers(uniq, {
              title: isCA ? "New Current Affairs Quiz 🗞️" : "Aaj ka Daily Quiz ready 🎯",
              body: isCA
                ? "10 fresh current affairs questions — abhi attempt karo!"
                : "10 naye SSC questions ready hain. Streak bachao! 🔥",
              url: `/daily-quiz${isCA ? "?type=current_affairs" : ""}`,
              tag: `dq:${body.quiz_type}:${body.quiz_date}`,
            });
          } else if (body.type === "new_blog") {
            const { data: rows } = await supabaseAdmin
              .from("device_tokens")
              .select("user_id");
            const uniq = Array.from(
              new Set((rows ?? []).map((r) => r.user_id as string)),
            );
            if (uniq.length === 0) return Response.json({ sent: 0 });
            const isJob = body.post_type === "job";
            await sendPushToUsers(uniq, {
              title: isJob ? "New job post 📢" : "New blog post 📖",
              body: `${body.title}${body.excerpt ? ` — ${trim(body.excerpt, 100)}` : ""}`,
              url: isJob ? `/jobs/${body.slug}` : `/blog/${body.slug}`,
              tag: `${isJob ? "job" : "blog"}:${body.slug}`,
            });
          } else if (body.type === "daily_reminder") {
            // Send to every user with at least one device token
            const { data: rows } = await supabaseAdmin
              .from("device_tokens")
              .select("user_id");
            const uniq = Array.from(
              new Set((rows ?? []).map((r) => r.user_id as string)),
            );
            if (uniq.length === 0) return Response.json({ sent: 0 });
            await sendPushToUsers(uniq, {
              title: "SSC Mentor AI — Daily practice",
              body: "Aaj ke practice questions ready hain. Chalo 10 min padh lete hain! 📚",
              url: "/practice",
              tag: "daily",
            });
          }

          return Response.json({ ok: true });
        } catch (err: any) {
          console.error("[fcm-notify] error", err);
          return new Response(err?.message || "Internal error", { status: 500 });
        }
      },
    },
  },
});
