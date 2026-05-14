import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  university: string;
  faculty: string;
  lastMessage?: string | null;
  avatarInitial: string;
  avatarUrl?: string | null;
  deleted?: boolean;
  href: string;
};

function Avatar({
  initial,
  photoUrl,
  deleted,
}: {
  initial: string;
  photoUrl?: string | null;
  deleted?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-11 h-11 rounded-full overflow-hidden flex-shrink-0",
        deleted && "opacity-50 grayscale"
      )}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={initial}
          width={44}
          height={44}
          className="object-cover w-full h-full"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1a1040 0%, #0d2040 100%)" }}
        >
          <span className="font-serif text-white/60 text-[16px]">{initial}</span>
        </div>
      )}
    </div>
  );
}

export default function MatchListItem({
  name,
  university,
  faculty,
  lastMessage,
  avatarInitial,
  avatarUrl,
  deleted = false,
  href,
}: Props) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 border-b border-gk-border hover:bg-gk-hover transition-colors"
    >
      <Avatar initial={avatarInitial} photoUrl={avatarUrl} deleted={deleted} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-[15px] font-medium truncate",
              deleted ? "text-gk-muted" : "text-gk-text"
            )}
          >
            {name}
          </span>
          {deleted && (
            <span className="flex-shrink-0 text-[11px] px-1.5 py-0.5 rounded border border-gk-muted text-gk-muted">
              退会済み
            </span>
          )}
        </div>

        {!deleted && (
          <p className="text-gk-gold text-[12px] truncate mt-0.5">
            ◆ {university} {faculty}
          </p>
        )}

        <p
          className={cn(
            "text-[13px] truncate mt-0.5",
            lastMessage ? "text-gk-sub" : "text-gk-muted"
          )}
        >
          {lastMessage ?? "メッセージを送ってみましょう"}
        </p>
      </div>
    </Link>
  );
}
