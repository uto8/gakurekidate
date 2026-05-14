import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileAction } from "@/lib/actions/profile";
import ProfileDetailClient from "@/components/profile/ProfileDetailClient";

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

  const [{ data: profile, error }, likeResult, myProfileResult] =
    await Promise.all([
      getUserProfileAction(userId),
      user
        ? supabase
            .from("likes")
            .select("id")
            .eq("from_user_id", user.id)
            .eq("to_user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      user
        ? supabase
            .from("profiles")
            .select("name, photo_url")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

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
  const myName: string = myProfileResult.data?.name ?? "";
  const myPhotoUrl: string | null = myProfileResult.data?.photo_url ?? null;
  const initialLiked = likeResult.data !== null;

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
            <div
              className="flex items-center justify-center h-full"
              style={{ background: "linear-gradient(135deg, #1a1040 0%, #0d2040 100%)" }}
            >
              <span className="text-[80px] font-serif text-white/20">
                {profile.name.charAt(0)}
              </span>
            </div>
          )}
          <div
            className="absolute inset-x-0 bottom-0 h-2/5"
            style={{ background: "linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.6) 50%, transparent 100%)" }}
          />
          <div className="absolute bottom-4 left-4">
            <p className="text-white text-[22px] font-medium leading-tight">{profile.name}</p>
            <p className="text-white/80 text-[15px]">{profile.age}歳</p>
          </div>
        </div>

        {/* コンテンツエリア */}
        <div className="px-4 pb-36 pt-5">
          <div className="pl-3 border-l-2 border-gk-gold mb-5">
            <p className="text-gk-muted text-[12px] mb-1 uppercase tracking-widest">Education</p>
            <p className="text-gk-gold text-[16px] font-medium">{profile.university}</p>
            <p className="text-gk-gold text-[14px]">
              {profile.faculty}{" "}
              <span className="text-gk-sub">（{profile.graduation_year}年卒）</span>
            </p>
          </div>

          {profile.bio && (
            <div className="mb-5">
              <p className="text-gk-muted text-[12px] mb-2 uppercase tracking-widest">About</p>
              <p className="text-gk-text text-[15px] leading-[1.7]">{profile.bio}</p>
            </div>
          )}

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

        {/* いいねボタン + マッチングバナー（Client Component） */}
        <ProfileDetailClient
          targetProfile={profile}
          myProfile={{
            initial: myName.charAt(0) || "?",
            photoUrl: myPhotoUrl,
          }}
          initialLiked={initialLiked}
        />
      </div>
    </div>
  );
}
