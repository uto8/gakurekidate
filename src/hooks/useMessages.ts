"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { markAsReadAction } from "@/lib/actions/messages";
import type { Message } from "@/types";

export function useMessages(
  matchId: string,
  currentUserId: string,
  initialMessages: Message[]
) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const initialized = useRef(false);
  // createClient() はレンダリングのたびに呼ばない（useUnreadCount と同じパターン）
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function subscribe() {
      // セッションが確立してから購読開始（Realtime WebSocket の認証に必要）
      const {
        data: { session },
      } = await supabase.auth.getSession();
      // クリーンアップが先に走った場合は購読しない
      if (!session || cancelled) return;

      channel = supabase
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
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              // tempId で追加された楽観的メッセージを実メッセージに置換
              const tempIdx = prev.findIndex(
                (m) =>
                  m.id.startsWith("temp-") &&
                  m.content === newMsg.content &&
                  m.sender_id === newMsg.sender_id
              );
              if (tempIdx !== -1) {
                const updated = [...prev];
                updated[tempIdx] = newMsg;
                return updated;
              }
              return [...prev, newMsg];
            });

            // 相手からのメッセージ受信時に既読マーク（fire-and-forget）
            if (
              currentUserId &&
              newMsg.sender_id &&
              newMsg.sender_id !== currentUserId
            ) {
              markAsReadAction(matchId).then((result) => {
                if (result.error) {
                  console.error("[markAsReadAction]", result.error);
                }
              });
            }
          }
        )
        .subscribe((status, err) => {
          if (err) {
            console.error("[Realtime] subscription error:", err);
          }
        });
    }

    subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [matchId]);

  /** 楽観的 UI 用: 一時的なメッセージを即時追加する */
  const addOptimistic = useCallback(
    (content: string, senderId: string): string => {
      const tempId = `temp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          match_id: matchId,
          sender_id: senderId,
          content,
          created_at: new Date().toISOString(),
        },
      ]);
      return tempId;
    },
    [matchId]
  );

  /** 楽観的メッセージをロールバック（送信エラー時） */
  const rollbackOptimistic = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  return { messages, addOptimistic, rollbackOptimistic };
}
