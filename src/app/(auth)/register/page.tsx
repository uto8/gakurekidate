"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPasswordError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      setPasswordError("パスワードが一致しません");
      return;
    }
    if (password.length < 8) {
      setPasswordError("パスワードは8文字以上で入力してください");
      return;
    }

    startTransition(async () => {
      const result = await registerAction(formData);
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
            新規登録
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
                placeholder="your@email.com"
                className="w-full h-[52px] px-4 rounded-lg bg-gk-elevated border border-gk-border text-gk-text text-[15px] outline-none focus:border-gk-gold transition-colors placeholder:text-gk-muted"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gk-sub text-[13px] mb-2">
                パスワード
              </label>
              <input
                type="password"
                name="password"
                required
                autoComplete="new-password"
                placeholder="8文字以上"
                className="w-full h-[52px] px-4 rounded-lg bg-gk-elevated border border-gk-border text-gk-text text-[15px] outline-none focus:border-gk-gold transition-colors placeholder:text-gk-muted"
              />
            </div>

            <div className="mb-2">
              <label className="block text-gk-sub text-[13px] mb-2">
                パスワード（確認）
              </label>
              <input
                type="password"
                name="confirm"
                required
                autoComplete="new-password"
                placeholder="もう一度入力"
                className={cn(
                  "w-full h-[52px] px-4 rounded-lg bg-gk-elevated border text-gk-text text-[15px] outline-none focus:border-gk-gold transition-colors placeholder:text-gk-muted",
                  passwordError ? "border-gk-error" : "border-gk-border"
                )}
              />
              {passwordError && (
                <p className="text-gk-error text-[12px] mt-1">
                  {passwordError}
                </p>
              )}
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
              {pending ? "処理中..." : "登録する"}
            </button>
          </form>
        </div>

        <p className="text-center mt-4 text-gk-muted text-[12px] leading-relaxed">
          登録することで
          <span className="text-gk-sub">利用規約</span>および
          <span className="text-gk-sub">プライバシーポリシー</span>に
          <br />
          同意したものとみなします
        </p>

        <p className="text-center mt-6 text-gk-sub text-[14px]">
          すでにアカウントをお持ちの方は
          <Link
            href="/login"
            className="text-gk-gold hover:text-gk-gold-light transition-colors ml-1"
          >
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
