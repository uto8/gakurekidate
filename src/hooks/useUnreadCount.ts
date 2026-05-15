"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getTotalUnreadCountAction } from "@/lib/actions/messages";
import type { Message } from "@/types";

export function useUnreadCount(userId: string, initialCount: number): number {
  const [count, setCount] = useState(initialCount);
  // レンダリングのたびに新しいクライアントが生成されないよう useRef で固定する
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;

    const refresh = async () => {
      const result = await getTotalUnreadCountAction(userId);
      if (result.data !== null) setCount(result.data);
    };

    const channel = supabase
      .channel("unread-count-global")
      // 1. 新着メッセージ（他人から自分への）
      // filter なし: RLS が自分参加マッチのメッセージのみ配信する
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const msg = payload.new as Pick<Message, "sender_id">;
          // 自分の送信・退会済みユーザーのメッセージは無視する
          if (msg.sender_id && msg.sender_id !== userId) {
            refresh();
          }
        }
      )
      // 2. 既読マーク更新（自分の read_receipts が変わったとき）
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_read_receipts",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return count;
}
