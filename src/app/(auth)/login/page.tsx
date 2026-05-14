"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-10">
          <h1 className="font-serif font-light text-gk-gold text-[28px] tracking-[0.12em]">
            学歴デート
          </h1>
        </div>

        <div className="bg-gk-surface rounded-2xl p-6 border border-gk-border">
          <h2 className="font-serif text-[18px] text-gk-text mb-6 tracking-[0.04em]">
            ログイン
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gk-sub text-[13px] mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full h-[52px] px-4 rounded-lg bg-gk-elevated border border-gk-border text-gk-text text-[15px] outline-none focus:border-gk-gold transition-colors"
              />
            </div>

            <div className="mb-2">
              <label className="block text-gk-sub text-[13px] mb-2">
                パスワード
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className={cn(
                  "w-full h-[52px] px-4 rounded-lg bg-gk-elevated border text-gk-text text-[15px] outline-none focus:border-gk-gold transition-colors",
                  error ? "border-gk-error" : "border-gk-border"
                )}
              />
            </div>

            {error && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-gk-error/10 border border-gk-error/30">
                <p className="text-gk-error text-[13px]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full h-[52px] rounded-lg text-gk-base font-medium text-[15px] mt-6 transition-opacity hover:opacity-90 disabled:opacity-50 bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)]"
            >
              {pending ? "処理中..." : "ログイン"}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-gk-sub text-[14px]">
          アカウントをお持ちでない方は
          <Link
            href="/register"
            className="text-gk-gold hover:text-gk-gold-light transition-colors ml-1"
          >
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
