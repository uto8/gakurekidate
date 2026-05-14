"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/types";

export function useMessages(matchId: string, initialMessages: Message[]) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  // initialMessages は Server Component から渡されるため、初回のみ使う
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newMsg = payload.new as {
            id: string;
            match_id: string;
            sender_id: string | null;
            content: string;
            created_at: string;
          };
          setMessages((prev) => {
            // 楽観的 UI で追加済みの場合は重複を除く
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [
              ...prev,
              {
                id: newMsg.id,
                match_id: newMsg.match_id,
                sender_id: newMsg.sender_id,
                content: newMsg.content,
                created_at: newMsg.created_at,
              },
            ];
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [matchId]);

  return messages;
}
