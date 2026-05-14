import Link from "next/link";
import type { Profile } from "@/types";

type Props = {
  partner: Profile;
};

const BackIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

export default function ChatHeader({ partner }: Props) {
  const isDeleted = partner.deleted_at !== null;

  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-gk-surface border-b border-gk-border">
      <div className="max-w-[480px] mx-auto h-14 flex items-center gap-3 px-4">
        <Link
          href="/matches"
          className="text-gk-sub hover:text-gk-text transition-colors flex-shrink-0"
          aria-label="マッチング一覧へ戻る"
        >
          <BackIcon />
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-gk-text text-[15px] font-medium truncate">
            {isDeleted ? "退会済みユーザー" : partner.name}
          </p>
          {!isDeleted && partner.university && (
            <p className="text-gk-gold text-[12px] truncate">
              {partner.university}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
