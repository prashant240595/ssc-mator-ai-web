import { supabase } from "@/integrations/supabase/client";

export type ActivityType =
  | "started_exam"
  | "submitted_exam"
  | "viewed_subject"
  | "viewed_exam"
  | "viewed_shift"
  | "read_explanation"
  | "opened_mentor"
  | "page_view"
  | "login";


/**
 * Best-effort, fire-and-forget activity logger.
 * Silently no-ops for guests or unauthenticated users.
 */
export async function logActivity(
  activity_type: ActivityType,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    await supabase
      .from("user_activity_logs" as never)
      .insert({ user_id: user.id, activity_type, details } as never);
  } catch (err) {
    // Never block the UI for a logging failure
    // eslint-disable-next-line no-console
    console.warn("activity log failed", err);
  }
}
