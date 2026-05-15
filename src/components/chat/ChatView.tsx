"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/hooks/useMessages";
import { sendMessageAction } from "@/lib/actions/messages";
import { formatMessageTime, formatMessageDate } from "@/lib/utils";
import MessageBubble from "./MessageBubble";
import DateSeparator from "./DateSeparator";
import MessageInput from "./MessageInput";
import type { Message, Profile } from "@/types";

type Props = {
  matchId: string;
  currentUserId: string;
  partner: Profile;
  initialMessages: Message[];
};

/** メッセージ配列を日付ごとにグループ化し、DateSeparator の挿入位置を決める */
function buildItems(messages: Message[]): Array<
  | { type: "separator"; label: string; key: string }
  | { type: "message"; message: Message; key: string }
> {
  const items: ReturnType<typeof buildItems> = [];
  let lastDateLabel = "";

  for (const msg of messages) {
    const label = formatMessageDate(msg.created_at);
    if (label !== lastDateLabel) {
      items.push({ type: "separator", label, key: `sep-${msg.created_at}` });
      lastDateLabel = label;
    }
    items.push({ type: "message", message: msg, key: msg.id });
  }

  return items;
}

export default function ChatView({
  matchId,
  currentUserId,
  partner,
  initialMessages,
}: Props) {
  const { messages, addOptimistic, rollbackOptimistic } = useMessages(
    matchId,
    undefined, // F-008 で currentUserId を渡す
    initialMessages
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const isPartnerDeleted = partner.deleted_at !== null;

  // メッセージ更新時に最下部へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(content: string) {
    const tempId = addOptimistic(content, currentUserId);
    const result = await sendMessageAction(matchId, content);
    if (result.error) {
      rollbackOptimistic(tempId);
      throw new Error(result.error);
    }
  }

  const items = buildItems(messages);

  return (
    <div className="flex flex-col h-full">
      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        <div className="max-w-[480px] mx-auto">
          {items.length === 0 ? (
            <p className="text-gk-muted text-[14px] text-center mt-16">
              最初のメッセージを送ってみましょう
            </p>
          ) : (
            items.map((item) => {
              if (item.type === "separator") {
                return <DateSeparator key={item.key} label={item.label} />;
              }
              const msg = item.message;
              const isOwn = msg.sender_id === currentUserId;
              const isDeleted = msg.sender_id === null;
              const variant = isOwn
                ? "own"
                : isDeleted
                  ? "partner-deleted"
                  : "partner";

              return (
                <MessageBubble
                  key={item.key}
                  variant={variant}
                  content={msg.content}
                  timestamp={formatMessageTime(msg.created_at)}
                  avatarInitial={partner.name.charAt(0)}
                  avatarUrl={partner.photo_url}
                />
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 送信フォーム */}
      <MessageInput onSend={handleSend} disabled={isPartnerDeleted} />
    </div>
  );
}
