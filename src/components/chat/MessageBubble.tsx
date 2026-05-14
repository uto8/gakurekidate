import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  variant: "own" | "partner" | "partner-deleted";
  content: string;
  timestamp: string;
  avatarInitial?: string;
  avatarUrl?: string | null;
};

function PartnerAvatar({
  initial,
  avatarUrl,
  deleted,
}: {
  initial?: string;
  avatarUrl?: string | null;
  deleted?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full overflow-hidden flex-shrink-0 self-end",
        deleted && "opacity-40 grayscale"
      )}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={initial ?? ""}
          width={32}
          height={32}
          className="object-cover w-full h-full"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #1a1040 0%, #0d2040 100%)",
          }}
        >
          <span className="font-serif text-white/60 text-[13px]">
            {initial ?? "?"}
          </span>
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({
  variant,
  content,
  timestamp,
  avatarInitial,
  avatarUrl,
}: Props) {
  if (variant === "own") {
    return (
      <div className="flex justify-end mb-2">
        <div className="max-w-[72%]">
          <div className="bg-[#C9A84C] text-gk-base rounded-2xl rounded-br-sm px-4 py-2.5">
            <p className="text-[14px] leading-relaxed break-words">{content}</p>
          </div>
          <p className="text-gk-muted text-[11px] mt-1 text-right">
            {timestamp}
          </p>
        </div>
      </div>
    );
  }

  if (variant === "partner-deleted") {
    return (
      <div className="flex items-end gap-2 mb-2">
        <PartnerAvatar deleted />
        <div className="max-w-[72%]">
          <p className="text-gk-muted text-[11px] mb-1">退会済みユーザー</p>
          <div className="border border-gk-border rounded-2xl rounded-bl-sm px-4 py-2.5">
            <p className="text-gk-muted text-[14px] leading-relaxed break-words">
              {content}
            </p>
          </div>
          <p className="text-gk-muted text-[11px] mt-1">{timestamp}</p>
        </div>
      </div>
    );
  }

  // partner
  return (
    <div className="flex items-end gap-2 mb-2">
      <PartnerAvatar initial={avatarInitial} avatarUrl={avatarUrl} />
      <div className="max-w-[72%]">
        <div className="bg-gk-elevated text-gk-text rounded-2xl rounded-bl-sm px-4 py-2.5">
          <p className="text-[14px] leading-relaxed break-words">{content}</p>
        </div>
        <p className="text-gk-muted text-[11px] mt-1">{timestamp}</p>
      </div>
    </div>
  );
}
