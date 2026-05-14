import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/discover");
  }

  return (
    <div className="bg-gk-base text-gk-text font-sans min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[480px] flex flex-col items-center">

          {/* 装飾ライン（上） */}
          <div className="w-16 h-px mb-10 bg-[linear-gradient(90deg,transparent,#C9A84C,transparent)]" />

          {/* ロゴ */}
          <h1 className="font-serif font-light text-gk-gold text-[32px] tracking-[0.12em] mb-4">
            学歴デート
          </h1>

          {/* タグライン */}
          <p className="text-gk-sub text-[14px] tracking-[0.04em] mb-2 text-center">
            学歴という共通の文脈で出会う
          </p>
          <p className="text-gk-muted text-[13px] text-center mb-12">
            恋愛・婚活向けマッチングアプリ
          </p>

          {/* 特徴ピル */}
          <div className="flex flex-col gap-3 w-full mb-12">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gk-surface border border-gk-border">
              <span className="text-gk-gold text-[18px]">🎓</span>
              <div>
                <p className="text-gk-text text-[14px] font-medium">学歴でつながる出会い</p>
                <p className="text-gk-muted text-[12px]">大学名・学部を自己紹介の一部として活用</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gk-surface border border-gk-border">
              <span className="text-gk-gold text-[18px]">✓</span>
              <div>
                <p className="text-gk-text text-[14px] font-medium">相互いいねでマッチング</p>
                <p className="text-gk-muted text-[12px]">お互いが気になったときだけつながれる</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gk-surface border border-gk-border">
              <span className="text-gk-gold text-[18px]">💬</span>
              <div>
                <p className="text-gk-text text-[14px] font-medium">リアルタイムチャット</p>
                <p className="text-gk-muted text-[12px]">マッチングしたらすぐにメッセージ交換</p>
              </div>
            </div>
          </div>

          {/* 新規登録 CTA */}
          <Link
            href="/register"
            className="w-full block text-center py-[14px] rounded-lg text-gk-base font-medium text-[15px] mb-4 transition-opacity hover:opacity-90 bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)]"
          >
            無料で新規登録
          </Link>

          {/* ログインリンク */}
          <Link
            href="/login"
            className="text-gk-sub text-[14px] hover:text-gk-gold transition-colors"
          >
            すでにアカウントをお持ちの方は <span className="text-gk-gold">ログイン</span>
          </Link>

          {/* 装飾ライン（下） */}
          <div className="w-16 h-px mt-12 bg-[linear-gradient(90deg,transparent,#C9A84C,transparent)]" />

          {/* フッターノート */}
          <p className="text-gk-muted text-[12px] mt-6 text-center">
            完全無料・Web のみ（レスポンシブ対応）
          </p>
        </div>
      </div>
    </div>
  );
}
