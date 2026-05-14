import Link from "next/link";
import Image from "next/image";
import type { Profile } from "@/types";

type Props = { profile: Profile };

// イニシャルごとに異なる背景グラデーションを返す（文字コードで分散）
function gradientForName(name: string): string {
  const gradients = [
    "linear-gradient(135deg, #1a1040 0%, #0d2040 100%)",
    "linear-gradient(135deg, #2d0920 0%, #3d1a2e 100%)",
    "linear-gradient(135deg, #0d3020 0%, #0e4030 100%)",
    "linear-gradient(135deg, #1a2340 0%, #253050 100%)",
    "linear-gradient(135deg, #2a1a00 0%, #3d2500 100%)",
    "linear-gradient(135deg, #0d1a30 0%, #1a2d40 100%)",
  ];
  const code = name.charCodeAt(0) ?? 0;
  return gradients[code % gradients.length];
}

export default function ProfileCard({ profile }: Props) {
  return (
    <Link
      href={`/profile/${profile.id}`}
      className="bg-gk-surface rounded-xl overflow-hidden block hover:bg-gk-hover transition-colors"
    >
      {/* 写真エリア（4:5） */}
      <div className="relative aspect-[4/5]">
        {profile.photo_url ? (
          <Image
            src={profile.photo_url}
            alt={profile.name}
            fill
            className="object-cover"
            sizes="(max-width: 480px) 50vw, 240px"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: gradientForName(profile.name) }}
          >
            <span className="text-[40px] font-serif text-white/30">
              {profile.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* テキストエリア */}
      <div className="p-2">
        <p className="text-gk-text text-[15px] font-medium leading-snug">
          {profile.name}{" "}
          <span className="text-gk-sub font-normal text-[13px]">{profile.age}歳</span>
        </p>
        <p className="text-gk-gold text-[13px] mt-0.5 truncate">
          ◆ {profile.university} {profile.faculty}
        </p>
        {profile.bio && (
          <p className="text-gk-sub text-[12px] mt-1 leading-snug line-clamp-2">
            {profile.bio}
          </p>
        )}
      </div>
    </Link>
  );
}
