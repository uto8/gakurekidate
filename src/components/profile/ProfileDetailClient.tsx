"use client";

import LikeButton from "@/components/like/LikeButton";
import MatchBanner from "@/components/match/MatchBanner";
import { useMatchBanner } from "@/hooks/useMatchBanner";
import type { Profile } from "@/types";

type Props = {
  targetProfile: Profile;
  myProfile: { initial: string; photoUrl?: string | null };
  initialLiked: boolean;
};

export default function ProfileDetailClient({
  targetProfile,
  myProfile,
  initialLiked,
}: Props) {
  const { visible, matchInfo, show, hide } = useMatchBanner();

  return (
    <>
      <div className="fixed bottom-16 left-0 right-0 z-40">
        <div className="max-w-[480px] mx-auto px-4 py-3 bg-gk-base border-t border-gk-border">
          <LikeButton
            targetUserId={targetProfile.id}
            initialLiked={initialLiked}
            onMatch={({ matchId }) => {
              show({
                matchId,
                partnerName: targetProfile.name,
                partnerUniversity: targetProfile.university,
                partnerFaculty: targetProfile.faculty,
                partnerInitial: targetProfile.name.charAt(0),
                partnerPhotoUrl: targetProfile.photo_url,
              });
            }}
          />
        </div>
      </div>

      {visible && matchInfo && (
        <MatchBanner
          visible={visible}
          myInitial={myProfile.initial}
          myPhotoUrl={myProfile.photoUrl}
          partnerName={matchInfo.partnerName}
          partnerUniversity={matchInfo.partnerUniversity}
          partnerFaculty={matchInfo.partnerFaculty}
          partnerInitial={matchInfo.partnerInitial}
          partnerPhotoUrl={matchInfo.partnerPhotoUrl}
          chatHref={`/chat/${matchInfo.matchId}`}
          onDismiss={hide}
        />
      )}
    </>
  );
}
