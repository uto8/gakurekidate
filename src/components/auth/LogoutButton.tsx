"use client";

import { useTransition } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

type Props = { className?: string };

export default function LogoutButton({ className }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => logoutAction())}
      disabled={pending}
      className={cn(
        "text-gk-sub text-[13px] hover:text-gk-text transition-colors disabled:opacity-50",
        className
      )}
    >
      {pending ? "処理中..." : "ログアウト"}
    </button>
  );
}
