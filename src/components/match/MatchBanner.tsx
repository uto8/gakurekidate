"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

type Props = {
  visible: boolean;
  myInitial: string;
  myPhotoUrl?: string | null;
  partnerName: string;
  partnerUniversity: string;
  partnerFaculty: string;
  partnerInitial: string;
  partnerPhotoUrl?: string | null;
  chatHref: string;
  onDismiss: () => void;
};

function AvatarCircle({
  initial,
  photoUrl,
  size = 80,
}: {
  initial: string;
  photoUrl?: string | null;
  size?: number;
}) {
  return (
    <div
      className="rounded-full overflow-hidden border-2 border-gk-gold flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={initial}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1a1040 0%, #0d2040 100%)" }}
        >
          <span className="font-serif text-white/60" style={{ fontSize: size * 0.4 }}>
            {initial}
          </span>
        </div>
      )}
    </div>
  );
}

export default function MatchBanner({
  visible,
  myInitial,
  myPhotoUrl,
  partnerName,
  partnerUniversity,
  partnerFaculty,
  partnerInitial,
  partnerPhotoUrl,
  chatHref,
  onDismiss,
}: Props) {
  const router = useRouter();

  if (!visible) return null;

  function handleGoToChat() {
    onDismiss();
    router.push(chatHref);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-gk-surface rounded-2xl w-[320px] overflow-hidden border border-gk-border">
        {/* 上部ゴールドグラデーションライン */}
        <div
          className="h-[3px] w-full"
          style={{ background: "linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)" }}
        />

        <div className="px-6 py-8 flex flex-col items-center gap-5">
          {/* タイトル */}
          <p className="font-serif text-gk-gold text-[22px] tracking-wide">
            マッチング成立！
          </p>

          {/* アバター */}
          <div className="flex items-center gap-4">
            <AvatarCircle initial={myInitial} photoUrl={myPhotoUrl} />
            <span className="text-gk-gold text-[24px]">♡</span>
            <AvatarCircle initial={partnerInitial} photoUrl={partnerPhotoUrl} />
          </div>

          {/* 相手情報 */}
          <div className="text-center">
            <p className="text-gk-text text-[16px] font-medium">{partnerName}</p>
            <p className="text-gk-gold text-[13px] mt-0.5">
              ◆ {partnerUniversity} {partnerFaculty}
            </p>
          </div>

          {/* ボタン */}
          <div className="w-full flex flex-col gap-2 mt-1">
            <button
              onClick={handleGoToChat}
              className="w-full h-[52px] rounded-lg text-gk-base font-medium text-[15px] bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)]"
            >
              メッセージを送る
            </button>
            <button
              onClick={onDismiss}
              className="w-full h-[44px] text-gk-muted text-[14px] hover:text-gk-sub transition-colors"
            >
              あとで
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
