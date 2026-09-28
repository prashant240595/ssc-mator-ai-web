import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/**
 * Global online presence. Every signed-in user joins one shared channel and
 * tracks their own id; the returned Set contains all currently online user ids.
 */
export function useOnlineUsers(): Set<string> {
  const { user } = useAuth();
  const myId = user?.id;
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!myId) return;
    const channel = supabase.channel("presence:online", {
      config: { presence: { key: myId } },
    });

    const sync = () => {
      const state = channel.presenceState() as Record<string, unknown[]>;
      setOnline(new Set(Object.keys(state)));
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId]);

  return online;
}

/**
 * AI buddies are shown as online only while AI replies are available.
 * Pass `aiAvailable` (from `useAiAvailable()`) to show them offline during
 * an AI outage.
 */
export function isUserOnline(
  online: Set<string>,
  id: string,
  isAi?: boolean | null,
  aiAvailable: boolean = true,
): boolean {
  if (isAi) return aiAvailable;
  return online.has(id);
}
