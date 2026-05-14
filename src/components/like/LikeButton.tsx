"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const HeartIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

type Props = {
  targetUserId: string;
  initialLiked?: boolean;
  onMatch?: (result: { matchId: string }) => void;
};

export default function LikeButton({
  targetUserId,
  initialLiked = false,
  onMatch,
}: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [isPending, setIsPending] = useState(false);

  async function handleLike() {
    if (liked || isPending) return;
    setIsPending(true);

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: targetUserId }),
      });

      if (res.status === 409) {
        setLiked(true);
        return;
      }

      if (!res.ok) return;

      const data = await res.json();
      setLiked(true);

      if (data.matched && onMatch) {
        onMatch({ matchId: data.matchId });
      }
    } finally {
      setIsPending(false);
    }
  }

  if (liked) {
    return (
      <button
        disabled
        className="w-full h-[52px] rounded-lg text-[15px] font-medium flex items-center justify-center gap-2 border border-gk-border text-gk-sub opacity-60 cursor-not-allowed"
      >
        <HeartIcon />
        いいね済み
      </button>
    );
  }

  return (
    <button
      onClick={handleLike}
      disabled={isPending}
      className={cn(
        "w-full h-[52px] rounded-lg text-gk-base font-medium text-[15px] flex items-center justify-center gap-2 bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)] transition-opacity",
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      <HeartIcon />
      {isPending ? "送信中..." : "いいね"}
    </button>
  );
}
