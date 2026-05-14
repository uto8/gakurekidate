"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SendIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

type Props = {
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
};

export default function MessageInput({ onSend, disabled = false }: Props) {
  const [value, setValue] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !isPending && !disabled;

  async function handleSend() {
    if (!canSend) return;
    setError(null);
    setIsPending(true);
    try {
      await onSend(value.trim());
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch {
      setError("送信に失敗しました。もう一度お試しください");
    } finally {
      setIsPending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    // 入力内容に合わせて高さを自動調整（最大 5 行相当）
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }

  return (
    <div className="border-t border-gk-border bg-gk-surface">
      {disabled && (
        <p className="text-gk-muted text-[12px] text-center py-2 px-4">
          退会済みのユーザーです。メッセージは送れません
        </p>
      )}
      {error && (
        <p className="text-gk-error text-[12px] px-4 pt-2">{error}</p>
      )}
      <div className="max-w-[480px] mx-auto flex items-end gap-2 px-4 py-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled || isPending}
          placeholder="メッセージを入力..."
          maxLength={1000}
          rows={1}
          className={cn(
            "flex-1 bg-gk-elevated text-gk-text placeholder:text-gk-muted",
            "text-[14px] rounded-2xl px-4 py-2.5 resize-none outline-none",
            "border border-gk-border focus:border-gk-gold transition-colors",
            "disabled:opacity-50"
          )}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
            canSend
              ? "bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)] text-gk-base"
              : "bg-gk-elevated text-gk-muted cursor-not-allowed"
          )}
          aria-label="送信"
        >
          <SendIcon />
        </button>
      </div>
      {value.length > 900 && (
        <p
          className={cn(
            "text-[11px] text-right px-4 pb-1",
            value.length >= 1000 ? "text-gk-error" : "text-gk-muted"
          )}
        >
          {value.length} / 1000
        </p>
      )}
    </div>
  );
}
