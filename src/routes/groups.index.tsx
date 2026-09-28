import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Users, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/groups/")({
  head: () => ({
    meta: [
      { title: "Study Groups — SSC Mentor AI" },
      { name: "description", content: "Small study groups to discuss questions and prepare together." },
    ],
  }),
  component: GroupsIndex,
});

type Group = {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  created_by: string;
  member_count: number;
};

function GroupsIndex() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", subject: "" });
  const [saving, setSaving] = useState(false);

  const myGroupsQ = useQuery({
    queryKey: ["groups:mine", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Group[]> => {
      const { data: mems, error } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      const ids = (mems ?? []).map((m: any) => m.group_id);
      if (ids.length === 0) return [];
      const { data: groups, error: gErr } = await supabase
        .from("study_groups")
        .select("id, name, description, subject, created_by")
        .in("id", ids);
      if (gErr) throw gErr;
      // fetch counts
      const { data: counts } = await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", ids);
      const cmap = new Map<string, number>();
      (counts ?? []).forEach((r: any) => cmap.set(r.group_id, (cmap.get(r.group_id) ?? 0) + 1));
      return (groups ?? []).map((g: any) => ({ ...g, member_count: cmap.get(g.id) ?? 0 }));
    },
  });

  const createGroup = async () => {
    const name = form.name.trim();
    if (!name || !user?.id) return;
    setSaving(true);
    const { error } = await supabase.from("study_groups").insert({
      name,
      description: form.description.trim() || null,
      subject: form.subject.trim() || null,
      created_by: user.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Group created");
    setCreating(false);
    setForm({ name: "", description: "", subject: "" });
    qc.invalidateQueries({ queryKey: ["groups:mine"] });
  };

  const groups = myGroupsQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Study Groups</h1>
          <p className="text-sm text-muted-foreground">Discuss and share questions together (max 10 per group).</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> New group
        </button>
      </div>

      {myGroupsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm font-semibold">No groups yet</p>
          <p className="text-xs text-muted-foreground">Create your first study group to start discussing questions.</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              to="/groups/$groupId"
              params={{ groupId: g.id }}
              className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{g.name}</p>
                  {g.subject && (
                    <p className="text-[11px] uppercase tracking-wide text-primary">{g.subject}</p>
                  )}
                  {g.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{g.description}</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> {g.member_count}/10 members
              </div>
            </Link>
          ))}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated">
            <h2 className="text-lg font-bold">Create study group</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold">Group name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={80}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="e.g. Maths Prep Squad"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Subject (optional)</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Maths / Reasoning / English / GK"
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  maxLength={300}
                  className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setCreating(false)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={createGroup}
                disabled={saving || !form.name.trim()}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
