import { useSubscription, useMutation } from "@apollo/client";
import { USER_PRESENCE_SUBSCRIPTION } from "@/graphql/subscriptions/presence";
import { UPDATE_PRESENCE, HEARTBEAT } from "@/graphql/mutations/presence";
import { useAuth } from "@/contexts/auth-context";
import { useCallback, useEffect, useMemo, useRef } from "react";

type PresenceStatus = "online" | "away" | "dnd" | "offline";

interface Presence {
  user_id: string;
  status: PresenceStatus;
  last_seen: string;
  custom_status?: string;
  custom_status_emoji?: string;
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const AWAY_THRESHOLD = 5 * 60 * 1000; // 5 minutes

export function useHasuraPresence(userIds: string[]) {
  const { data, loading } = useSubscription(USER_PRESENCE_SUBSCRIPTION, {
    variables: { userIds },
    skip: userIds.length === 0,
  });

  const presenceMap = useMemo(() => {
    const map = new Map<string, Presence>();
    for (const p of data?.nchat_presence ?? []) {
      map.set(p.user_id, p);
    }
    return map;
  }, [data]);

  const getPresence = useCallback(
    (userId: string): Presence => {
      return (
        presenceMap.get(userId) ?? {
          user_id: userId,
          status: "offline",
          last_seen: "",
        }
      );
    },
    [presenceMap],
  );

  const isOnline = useCallback(
    (userId: string): boolean => {
      const p = presenceMap.get(userId);
      if (!p) return false;
      const lastSeen = new Date(p.last_seen).getTime();
      return Date.now() - lastSeen < AWAY_THRESHOLD;
    },
    [presenceMap],
  );

  return { presenceMap, getPresence, isOnline, loading };
}

export function useMyPresence() {
  const { user } = useAuth();
  const [updatePresenceMutation] = useMutation(UPDATE_PRESENCE);
  const [heartbeatMutation] = useMutation(HEARTBEAT);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const setStatus = useCallback(
    async (status: PresenceStatus, customStatus?: string, emoji?: string) => {
      if (!user?.id) return;
      await updatePresenceMutation({
        variables: {
          userId: user.id,
          status,
          customStatus,
          customStatusEmoji: emoji,
        },
      });
    },
    [user?.id, updatePresenceMutation],
  );

  // Heartbeat to keep presence alive
  useEffect(() => {
    if (!user?.id) return;

    const sendHeartbeat = () => {
      heartbeatMutation({ variables: { userId: user.id } });
    };

    // Initial presence
    setStatus("online");

    // Periodic heartbeat
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Set offline on unmount
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      setStatus("offline");
    };
  }, [user?.id, setStatus, heartbeatMutation]);

  return { setStatus };
}
