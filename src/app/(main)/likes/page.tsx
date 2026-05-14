import Link from "next/link";
import { getReceivedLikesAction } from "@/lib/actions/likes";
import ProfileCard from "@/components/discover/ProfileCard";

export default async function LikesPage() {
  const { data: profiles, error } = await getReceivedLikesAction();

  return (
    <div className="max-w-[480px] mx-auto px-4">
      <header className="h-14 flex items-center">
        <h1 className="font-serif text-gk-text text-[18px]">いいね</h1>
      </header>

      {error ? (
        <p className="text-gk-error text-[14px] text-center mt-8">{error}</p>
      ) : !profiles || profiles.length === 0 ? (
        <div className="text-center mt-16">
          <p className="text-gk-sub text-[15px] mb-4">
            まだいいねが届いていません
          </p>
          <Link
            href="/discover"
            className="text-gk-gold text-[14px] hover:text-gk-gold-light transition-colors"
          >
            探索してみましょう →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-8">
          {profiles.map((profile) => (
            <ProfileCard key={profile.id} profile={profile} variant="likes" />
          ))}
        </div>
      )}
    </div>
  );
}
