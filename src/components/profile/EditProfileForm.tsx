"use client";

import { useState, useTransition } from "react";
import { updateProfileAction } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types";
import PhotoUpload from "./PhotoUpload";
import LogoutButton from "@/components/auth/LogoutButton";

type Props = { profile: Profile };

const fieldClass =
  "w-full bg-transparent text-gk-text text-[15px] outline-none focus:text-gk-gold placeholder:text-gk-muted";
const goldFieldClass =
  "w-full bg-transparent text-gk-gold text-[15px] outline-none focus:text-gk-gold-light placeholder:text-gk-muted";

export default function EditProfileForm({ profile }: Props) {
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [university, setUniversity] = useState(profile.university);
  const [faculty, setFaculty] = useState(profile.faculty);
  const [graduationYear, setGraduationYear] = useState(String(profile.graduation_year));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "名前を入力してください";
    if (!university.trim()) e.university = "大学名を入力してください";
    if (!faculty.trim()) e.faculty = "学部名を入力してください";
    const yr = parseInt(graduationYear, 10);
    if (!graduationYear || isNaN(yr) || yr < 1900 || yr > 2050) {
      e.graduationYear = "卒業年度を正しく入力してください";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    setServerError(null);
    setSaved(false);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("bio", bio);
    formData.set("university", university);
    formData.set("faculty", faculty);
    formData.set("graduation_year", graduationYear);

    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (result.error) {
        setServerError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <>
      {/* ヘッダー */}
      <header className="fixed top-0 left-0 right-0 bg-gk-base border-b border-gk-border z-40">
        <div className="max-w-[480px] mx-auto flex items-center justify-between px-4 h-14">
          <h2 className="font-serif text-[20px] tracking-[0.04em]">プロフィール</h2>
        </div>
      </header>

      <div className="flex justify-center">
        <div className="w-full max-w-[480px] px-4 pt-[72px] pb-32">

          {/* 写真 */}
          <div className="flex flex-col items-center py-6 border-b border-gk-border mb-6">
            <PhotoUpload userId={profile.id} currentPhotoUrl={profile.photo_url} />
            <p className="text-gk-text text-[18px] font-medium mt-0">
              {name || "—"}{" "}
              <span className="text-gk-sub text-[14px] font-normal">{profile.age}歳</span>
            </p>
            <p className="text-gk-gold text-[14px] mt-1">
              ◆ {university || "—"} {faculty || ""}
            </p>
          </div>

          <div className="space-y-5">
            {/* 基本情報 */}
            <div>
              <p className="text-gk-muted text-[12px] uppercase tracking-widest mb-3">基本情報</p>
              <div className="bg-gk-surface rounded-xl border border-gk-border overflow-hidden">
                <div className={cn("px-4 py-3 border-b border-gk-border", errors.name && "border-gk-error/50")}>
                  <label className="block text-gk-muted text-[12px] mb-1">
                    名前 <span className="text-gk-gold text-[11px]">必須</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClass}
                  />
                  {errors.name && <p className="text-gk-error text-[12px] mt-1">{errors.name}</p>}
                </div>
                <div className="px-4 py-3">
                  <label className="block text-gk-muted text-[12px] mb-1">自己紹介</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder="趣味や好きなことなどを自由にご記入ください"
                    className="w-full bg-transparent text-gk-text text-[15px] leading-relaxed outline-none resize-none placeholder:text-gk-muted focus:text-gk-gold"
                  />
                  <p className="text-gk-muted text-[11px] text-right">{bio.length} / 300</p>
                </div>
              </div>
            </div>

            {/* 学歴 */}
            <div>
              <p className="text-gk-muted text-[12px] uppercase tracking-widest mb-3">学歴</p>
              <div className="bg-gk-surface rounded-xl border border-gk-border overflow-hidden">
                <div className={cn("px-4 py-3 border-b border-gk-border", errors.university && "border-gk-error/50")}>
                  <label className="block text-gk-muted text-[12px] mb-1">
                    大学名 <span className="text-gk-gold text-[11px]">必須</span>
                  </label>
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className={goldFieldClass}
                  />
                  {errors.university && <p className="text-gk-error text-[12px] mt-1">{errors.university}</p>}
                </div>
                <div className={cn("px-4 py-3 border-b border-gk-border", errors.faculty && "border-gk-error/50")}>
                  <label className="block text-gk-muted text-[12px] mb-1">
                    学部名 <span className="text-gk-gold text-[11px]">必須</span>
                  </label>
                  <input
                    type="text"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                    className={goldFieldClass}
                  />
                  {errors.faculty && <p className="text-gk-error text-[12px] mt-1">{errors.faculty}</p>}
                </div>
                <div className={cn("px-4 py-3", errors.graduationYear && "border-gk-error/50")}>
                  <label className="block text-gk-muted text-[12px] mb-1">
                    卒業年度 <span className="text-gk-gold text-[11px]">必須</span>
                  </label>
                  <input
                    type="number"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                    min="1900"
                    max="2050"
                    className={goldFieldClass}
                  />
                  {errors.graduationYear && (
                    <p className="text-gk-error text-[12px] mt-1">{errors.graduationYear}</p>
                  )}
                </div>
              </div>
            </div>

            {/* サーバーエラー */}
            {serverError && (
              <div className="px-3 py-2 rounded-lg bg-gk-error/10 border border-gk-error/30">
                <p className="text-gk-error text-[13px]">{serverError}</p>
              </div>
            )}

            {/* 保存完了 */}
            {saved && (
              <div className="px-3 py-2 rounded-lg bg-gk-success/10 border border-gk-success/30">
                <p className="text-gk-success text-[13px]">保存しました</p>
              </div>
            )}

            {/* 保存ボタン */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="w-full h-[52px] rounded-lg text-gk-base font-medium text-[15px] transition-opacity hover:opacity-90 disabled:opacity-50 bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)]"
            >
              {isPending ? "保存中..." : "保存する"}
            </button>

            {/* ログアウト */}
            <LogoutButton className="w-full h-[48px] rounded-lg border border-gk-border text-gk-sub text-[15px] hover:border-gk-gold hover:text-gk-gold transition-colors" />

            {/* 退会リンク */}
            <div className="text-center pt-2 pb-4">
              <button
                type="button"
                className="text-gk-muted text-[14px] hover:text-gk-sub transition-colors"
              >
                退会する
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
