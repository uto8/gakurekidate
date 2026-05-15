import Link from "next/link";
import { getMatchesAction } from "@/lib/actions/matches";
import MatchListItem from "@/components/match/MatchListItem";

export default async function MatchesPage() {
  const { data: matches, error } = await getMatchesAction();

  return (
    <div className="max-w-[480px] mx-auto">
      <header className="h-14 flex items-center px-4">
        <h1 className="font-serif text-gk-text text-[18px]">マッチング</h1>
      </header>

      {error ? (
        <p className="text-gk-error text-[14px] text-center mt-8 px-4">{error}</p>
      ) : !matches || matches.length === 0 ? (
        <div className="text-center mt-16 px-4">
          <p className="text-gk-sub text-[15px] mb-4">
            まだマッチングしていません
          </p>
          <Link
            href="/discover"
            className="text-gk-gold text-[14px] hover:text-gk-gold-light transition-colors"
          >
            探索してみましょう →
          </Link>
        </div>
      ) : (
        <ul className="pb-8">
          {matches.map((match) => (
            <li key={match.id}>
              <MatchListItem
                name={match.partner.name}
                university={match.partner.university}
                faculty={match.partner.faculty}
                lastMessage={match.last_message}
                avatarInitial={match.partner.name.charAt(0)}
                avatarUrl={match.partner.photo_url}
                deleted={match.partner.deleted_at !== null}
                href={`/chat/${match.id}`}
                unreadCount={match.unread_count}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
