"use client";

import { useState, useCallback } from "react";

export type MatchBannerInfo = {
  matchId: string;
  partnerName: string;
  partnerUniversity: string;
  partnerFaculty: string;
  partnerInitial: string;
  partnerPhotoUrl?: string | null;
};

export function useMatchBanner() {
  const [visible, setVisible] = useState(false);
  const [matchInfo, setMatchInfo] = useState<MatchBannerInfo | null>(null);

  const show = useCallback((info: MatchBannerInfo) => {
    setMatchInfo(info);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  return { visible, matchInfo, show, hide };
}
