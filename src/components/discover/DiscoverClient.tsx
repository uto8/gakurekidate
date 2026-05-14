"use client";

import { useState, useTransition } from "react";
import { getDiscoverUsersAction } from "@/lib/actions/discover";
import ProfileCard from "./ProfileCard";
import FilterPanel, { type FilterValues } from "./FilterPanel";
import type { Profile } from "@/types";

type Props = {
  initialUsers: Profile[];
  hasMore: boolean;
};

export default function DiscoverClient({ initialUsers, hasMore: initialHasMore }: Props) {
  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [filter, setFilter] = useState<FilterValues>({});
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasActiveFilter =
    filter.ageMin !== undefined ||
    filter.ageMax !== undefined ||
    (filter.university !== undefined && filter.university !== "");

  function applyFilter(newFilter: FilterValues) {
    setFilter(newFilter);
    setError(null);
    startTransition(async () => {
      const result = await getDiscoverUsersAction({
        ...newFilter,
        page: 0,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setUsers(result.data ?? []);
      setPage(0);
      setHasMore((result.data?.length ?? 0) === 20);
    });
  }

  function loadMore() {
    const nextPage = page + 1;
    startTransition(async () => {
      const result = await getDiscoverUsersAction({
        ...filter,
        page: nextPage,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      const newUsers = result.data ?? [];
      setUsers((prev) => [...prev, ...newUsers]);
      setPage(nextPage);
      setHasMore(newUsers.length === 20);
    });
  }

  function removeFilter(key: keyof FilterValues) {
    const newFilter = { ...filter, [key]: undefined };
    // ageMin と ageMax は一緒に消す想定ではないので個別に処理
    applyFilter(newFilter);
  }

  return (
    <>
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-gk-base border-b border-gk-border z-40">
        <div className="max-w-[480px] mx-auto flex items-center justify-between px-4 h-14">
          <h1 className="font-serif font-light text-gk-gold text-[20px] tracking-[0.12em]">
            学歴デート
          </h1>
          <button
            type="button"
            onClick={() => setIsPanelOpen(true)}
            className="relative p-2"
          >
            <svg
              className={hasActiveFilter ? "w-6 h-6 text-gk-gold" : "w-6 h-6 text-gk-sub"}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
              />
            </svg>
            {hasActiveFilter && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-gk-gold" />
            )}
          </button>
        </div>
      </header>

      {/* アクティブフィルターチップ */}
      {hasActiveFilter && (
        <div className="fixed top-14 left-0 right-0 z-30 bg-gk-base px-4 py-2 border-b border-gk-border">
          <div className="max-w-[480px] mx-auto flex gap-2 flex-wrap">
            {(filter.ageMin !== undefined || filter.ageMax !== undefined) && (
              <FilterChip
                label={`${filter.ageMin ?? "—"}〜${filter.ageMax ?? "—"}歳`}
                onRemove={() => {
                  const newFilter = { ...filter, ageMin: undefined, ageMax: undefined };
                  applyFilter(newFilter);
                }}
              />
            )}
            {filter.university && (
              <FilterChip
                label={filter.university}
                onRemove={() => removeFilter("university")}
              />
            )}
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <main
        className="px-4 pb-6"
        style={{ paddingTop: hasActiveFilter ? "128px" : "72px" }}
      >
        <div className="max-w-[480px] mx-auto">
          {/* ローディング中（初期表示中はスケルトンなし・既存データを表示） */}
          {isPending && users.length === 0 && (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* エラー */}
          {error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-gk-sub text-[14px] mb-4">{error}</p>
              <button
                type="button"
                onClick={() => applyFilter(filter)}
                className="text-gk-gold text-[14px] hover:text-gk-gold-light transition-colors"
              >
                再読み込み
              </button>
            </div>
          )}

          {/* ユーザーグリッド */}
          {!error && users.length > 0 && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {users.map((profile) => (
                  <ProfileCard key={profile.id} profile={profile} />
                ))}
              </div>

              {/* もっと見る */}
              {hasMore && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={isPending}
                    className="px-8 h-[44px] rounded-lg border border-gk-border text-gk-sub text-[14px] hover:border-gk-gold hover:text-gk-gold transition-colors disabled:opacity-50"
                  >
                    {isPending ? "読み込み中..." : "もっと見る"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* 空状態 */}
          {!error && !isPending && users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-gk-sub text-[15px] mb-2">
                条件に合うユーザーが見つかりませんでした
              </p>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => applyFilter({})}
                  className="text-gk-gold text-[14px] mt-2 hover:text-gk-gold-light transition-colors"
                >
                  フィルターを解除する
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* フィルターパネル */}
      <FilterPanel
        isOpen={isPanelOpen}
        current={filter}
        onApply={applyFilter}
        onClose={() => setIsPanelOpen(false)}
      />
    </>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="px-3 py-1 rounded-full text-[12px] border flex items-center gap-1"
      style={{
        borderColor: "rgba(201,168,76,0.4)",
        color: "#C9A84C",
        background: "rgba(201,168,76,0.08)",
      }}
    >
      {label}
      <button type="button" onClick={onRemove} className="ml-0.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-gk-surface rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[4/5] bg-gk-elevated" />
      <div className="p-2 space-y-1.5">
        <div className="h-4 bg-gk-elevated rounded w-3/4" />
        <div className="h-3 bg-gk-elevated rounded w-full" />
        <div className="h-3 bg-gk-elevated rounded w-2/3" />
      </div>
    </div>
  );
}
