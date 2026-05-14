import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileAction } from "@/lib/actions/profile";

type Props = { params: Promise<{ userId: string }> };

export default async function ProfileDetailPage({ params }: Props) {
  const { userId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id === userId) {
    redirect("/profile/edit");
  }

  const { data: profile, error } = await getUserProfileAction(userId);

  if (error || !profile) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gk-muted text-[14px] mb-6">このユーザーは退会済みです</p>
          <Link
            href="/discover"
            className="text-gk-gold text-[14px] hover:text-gk-gold-light transition-colors"
          >
            探索に戻る
          </Link>
        </div>
      </div>
    );
  }

  const genderLabel = profile.gender === "male" ? "男性" : "女性";

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[480px] relative">
        {/* 戻るボタン */}
        <Link
          href="/discover"
          className="absolute top-3 left-3 z-30 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(10,10,10,0.6)", backdropFilter: "blur(4px)" }}
        >
          <svg className="w-5 h-5 text-gk-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        {/* ヒーロー写真エリア */}
        <div className="relative aspect-[4/5] w-full bg-gk-elevated">
          {profile.photo_url ? (
            <Image
              src={profile.photo_url}
              alt={profile.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full"
              style={{ background: "linear-gradient(135deg, #1a1040 0%, #0d2040 100%)" }}>
              <span className="text-[80px] font-serif text-white/20">
                {profile.name.charAt(0)}
              </span>
            </div>
          )}
          {/* グラデーションオーバーレイ */}
          <div
            className="absolute inset-x-0 bottom-0 h-2/5"
            style={{ background: "linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.6) 50%, transparent 100%)" }}
          />
          {/* 名前・年齢 */}
          <div className="absolute bottom-4 left-4">
            <p className="text-white text-[22px] font-medium leading-tight">{profile.name}</p>
            <p className="text-white/80 text-[15px]">{profile.age}歳</p>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="px-4 pb-36 pt-5">
          {/* 学歴セクション */}
          <div className="pl-3 border-l-2 border-gk-gold mb-5">
            <p className="text-gk-muted text-[12px] mb-1 uppercase tracking-widest">Education</p>
            <p className="text-gk-gold text-[16px] font-medium">{profile.university}</p>
            <p className="text-gk-gold text-[14px]">
              {profile.faculty}{" "}
              <span className="text-gk-sub">（{profile.graduation_year}年卒）</span>
            </p>
          </div>

          {/* 自己紹介 */}
          {profile.bio && (
            <div className="mb-5">
              <p className="text-gk-muted text-[12px] mb-2 uppercase tracking-widest">About</p>
              <p className="text-gk-text text-[15px] leading-[1.7]">{profile.bio}</p>
            </div>
          )}

          {/* 基本情報グリッド */}
          <div className="bg-gk-surface rounded-xl p-4 border border-gk-border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gk-muted text-[12px]">年齢</p>
                <p className="text-gk-text text-[15px] mt-0.5">{profile.age}歳</p>
              </div>
              <div>
                <p className="text-gk-muted text-[12px]">性別</p>
                <p className="text-gk-text text-[15px] mt-0.5">{genderLabel}</p>
              </div>
              <div>
                <p className="text-gk-muted text-[12px]">大学</p>
                <p className="text-gk-gold text-[15px] mt-0.5">{profile.university}</p>
              </div>
              <div>
                <p className="text-gk-muted text-[12px]">学部</p>
                <p className="text-gk-gold text-[15px] mt-0.5">{profile.faculty}</p>
              </div>
            </div>
          </div>
        </div>

        {/* いいねボタン（固定フッター）*/}
        <div className="fixed bottom-16 left-0 right-0 z-40">
          <div className="max-w-[480px] mx-auto px-4 py-3 bg-gk-base border-t border-gk-border">
            <button
              className="w-full h-[52px] rounded-lg text-gk-base font-medium text-[15px] flex items-center justify-center gap-2 bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)]"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              いいね
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
