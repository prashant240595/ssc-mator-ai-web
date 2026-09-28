import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ADMIN_EMAIL } from "@/lib/admin-constants";

export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reason: string; details?: string }) => {
    const reason = (input?.reason ?? "").trim();
    if (reason.length < 3) throw new Error("Please select a reason.");
    return { reason, details: (input?.details ?? "").trim().slice(0, 1000) };
  })
  .handler(async ({ data, context }) => {
    const { userId, claims, supabase } = context as any;
    const { data: existing } = await supabase
      .from("account_deletion_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) throw new Error("Your deletion request is already pending with the admin.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    const { error } = await supabase.from("account_deletion_requests").insert({
      user_id: userId,
      user_email: profile?.email ?? claims?.email ?? null,
      user_name: profile?.full_name ?? null,
      reason: data.reason,
      details: data.details || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyDeletionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase } = context as any;
    const { data } = await supabase
      .from("account_deletion_requests")
      .select("id, reason, details, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { request: data ?? null };
  });

export const adminListDeletionRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { claims } = context as any;
    if (String(claims?.email ?? "").toLowerCase() !== ADMIN_EMAIL) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("account_deletion_requests" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { requests: (data as any[]) ?? [] };
  });

export const adminResolveDeletionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; action: "approve" | "reject"; notes?: string }) => {
    if (!input?.id) throw new Error("Missing request id");
    if (input.action !== "approve" && input.action !== "reject") throw new Error("Bad action");
    return { id: input.id, action: input.action, notes: (input.notes ?? "").slice(0, 500) };
  })
  .handler(async ({ data, context }) => {
    const { claims } = context as any;
    if (String(claims?.email ?? "").toLowerCase() !== ADMIN_EMAIL) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: rowErr } = await (supabaseAdmin
      .from("account_deletion_requests" as never) as any)
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (rowErr) throw new Error(rowErr.message);
    if (!row) throw new Error("Request not found");

    if (data.action === "approve") {
      const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(row.user_id);
      if (delErr && !/not found/i.test(delErr.message)) throw new Error(delErr.message);
    }

    const { error } = await (supabaseAdmin.from("account_deletion_requests" as never) as any)
      .update({
        status: data.action === "approve" ? "approved" : "rejected",
        admin_notes: data.notes || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
