"use client";

import { useState } from "react";
import { validateAgeRange } from "@/lib/utils";

export type FilterValues = {
  ageMin?: number;
  ageMax?: number;
  university?: string;
};

type Props = {
  isOpen: boolean;
  current: FilterValues;
  onApply: (values: FilterValues) => void;
  onClose: () => void;
};

const inputClass =
  "flex-1 h-[52px] px-4 rounded-lg bg-gk-surface border border-gk-border text-gk-text text-[15px] outline-none focus:border-gk-gold transition-colors";

export default function FilterPanel({ isOpen, current, onApply, onClose }: Props) {
  const [ageMin, setAgeMin] = useState(current.ageMin?.toString() ?? "");
  const [ageMax, setAgeMax] = useState(current.ageMax?.toString() ?? "");
  const [university, setUniversity] = useState(current.university ?? "");
  const [rangeError, setRangeError] = useState<string | null>(null);

  function handleApply() {
    const min = ageMin ? parseInt(ageMin, 10) : undefined;
    const max = ageMax ? parseInt(ageMax, 10) : undefined;

    const validation = validateAgeRange(min, max);
    if (!validation.valid) {
      setRangeError(validation.error ?? "入力値が正しくありません");
      return;
    }

    setRangeError(null);
    onApply({
      ageMin: min,
      ageMax: max,
      university: university.trim() || undefined,
    });
    onClose();
  }

  function handleReset() {
    setAgeMin("");
    setAgeMax("");
    setUniversity("");
    setRangeError(null);
    onApply({});
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* ボトムシート */}
      <div className="fixed bottom-16 left-0 right-0 z-50 flex justify-center">
        <div className="w-full max-w-[480px] bg-gk-elevated rounded-t-2xl border border-gk-border border-b-0 p-5">
          {/* ドラッグハンドル */}
          <div className="w-10 h-1 bg-gk-border rounded-full mx-auto mb-5" />

          <h3 className="font-serif text-[18px] text-gk-text mb-5 tracking-[0.04em]">
            絞り込み
          </h3>

          <div className="space-y-5">
            {/* 年齢フィルター */}
            <div>
              <label className="block text-gk-sub text-[13px] mb-3">年齢</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={ageMin}
                  onChange={(e) => { setAgeMin(e.target.value); setRangeError(null); }}
                  placeholder="18"
                  min="18"
                  max="99"
                  className={inputClass}
                />
                <span className="text-gk-muted text-[14px] shrink-0">〜</span>
                <input
                  type="number"
                  value={ageMax}
                  onChange={(e) => { setAgeMax(e.target.value); setRangeError(null); }}
                  placeholder="99"
                  min="18"
                  max="99"
                  className={inputClass}
                />
                <span className="text-gk-muted text-[14px] shrink-0">歳</span>
              </div>
              {rangeError && (
                <p className="text-gk-error text-[12px] mt-1">{rangeError}</p>
              )}
            </div>

            {/* 大学名フィルター */}
            <div>
              <label className="block text-gk-sub text-[13px] mb-2">
                大学名（キーワード）
              </label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="例: 東京大学"
                className="w-full h-[52px] px-4 rounded-lg bg-gk-surface border border-gk-border text-gk-text text-[15px] outline-none focus:border-gk-gold transition-colors placeholder:text-gk-muted"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 h-[52px] rounded-lg border border-gk-border text-gk-sub text-[15px] hover:border-gk-gold hover:text-gk-gold transition-colors"
            >
              リセット
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-[2] h-[52px] rounded-lg text-gk-base font-medium text-[15px] bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)]"
            >
              適用する
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
