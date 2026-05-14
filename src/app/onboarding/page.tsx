"use client";

import { useState, useTransition } from "react";
import { createProfileAction } from "@/lib/actions/profile";
import { cn, isAdult } from "@/lib/utils";

type Step = 1 | 2 | 3;
type Errors = Record<string, string>;

const inputBase =
  "w-full h-[52px] px-4 rounded-lg bg-gk-elevated border text-gk-text text-[15px] outline-none focus:border-gk-gold transition-colors placeholder:text-gk-muted";

const progressWidthClass: Record<Step, string> = {
  1: "w-1/3",
  2: "w-2/3",
  3: "w-full",
};

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [bio, setBio] = useState("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [graduationYear, setGraduationYear] = useState("");

  function validateStep1(): boolean {
    const e: Errors = {};
    if (!name.trim()) e.name = "名前を入力してください";
    if (!birthDate) {
      e.birthDate = "生年月日を入力してください";
    } else if (!isAdult(birthDate)) {
      e.birthDate = "18歳未満の方は登録できません";
    }
    if (!gender) e.gender = "性別を選択してください";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3(): boolean {
    const e: Errors = {};
    if (!university.trim()) e.university = "大学名を入力してください";
    if (!faculty.trim()) e.faculty = "学部名を入力してください";
    const yr = parseInt(graduationYear, 10);
    if (!graduationYear || isNaN(yr) || yr < 1900 || yr > 2050) {
      e.graduationYear = "卒業年度を正しく入力してください";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goNext() {
    if (step === 1 && !validateStep1()) return;
    setErrors({});
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  }

  function handleSubmit() {
    if (!validateStep3()) return;
    setServerError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("birth_date", birthDate);
    formData.set("gender", gender);
    formData.set("bio", bio);
    formData.set("university", university);
    formData.set("faculty", faculty);
    formData.set("graduation_year", graduationYear);

    startTransition(async () => {
      const result = await createProfileAction(formData);
      if (result?.error) setServerError(result.error);
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center pt-10 pb-12 px-4">
      <div className="w-full max-w-[480px]">
        <p className="text-gk-muted text-[11px] mb-2 text-center">
          Step {step} / 3
        </p>
        <div className="w-full h-1 bg-gk-border rounded-full mb-8 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 bg-[linear-gradient(90deg,#9A7A2E,#C9A84C)]",
              progressWidthClass[step]
            )}
          />
        </div>

        {/* --- Step 1: 基本情報 --- */}
        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <h2 className="font-serif text-[22px] tracking-[0.04em] mb-2">
                基本情報
              </h2>
              <p className="text-gk-sub text-[14px]">
                あなたのことを教えてください
              </p>
            </div>

            <div className="bg-gk-surface rounded-2xl p-6 border border-gk-border space-y-5">
              <div>
                <label className="block text-gk-sub text-[13px] mb-2">
                  名前{" "}
                  <span className="text-gk-gold text-[11px]">必須</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="田中 優花"
                  className={cn(
                    inputBase,
                    errors.name ? "border-gk-error" : "border-gk-border"
                  )}
                />
                {errors.name && (
                  <p className="text-gk-error text-[12px] mt-1">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gk-sub text-[13px] mb-2">
                  生年月日{" "}
                  <span className="text-gk-gold text-[11px]">必須</span>
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className={cn(
                    inputBase,
                    errors.birthDate ? "border-gk-error" : "border-gk-border"
                  )}
                />
                <p className="text-gk-muted text-[12px] mt-1">
                  ※ 18歳未満は登録できません
                </p>
                {errors.birthDate && (
                  <p className="text-gk-error text-[12px] mt-1">
                    {errors.birthDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gk-sub text-[13px] mb-2">
                  性別{" "}
                  <span className="text-gk-gold text-[11px]">必須</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(["male", "female"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={cn(
                        "h-[52px] rounded-lg border text-[15px] transition-colors",
                        gender === g
                          ? "border-gk-gold text-gk-gold bg-gk-elevated"
                          : "border-gk-border text-gk-sub bg-gk-elevated"
                      )}
                    >
                      {g === "male" ? "男性" : "女性"}
                    </button>
                  ))}
                </div>
                {errors.gender && (
                  <p className="text-gk-error text-[12px] mt-1">
                    {errors.gender}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={goNext}
              className="w-full h-[52px] rounded-lg text-gk-base font-medium text-[15px] mt-6 transition-opacity hover:opacity-90 bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)]"
            >
              次へ
            </button>
          </>
        )}

        {/* --- Step 2: 自己紹介 --- */}
        {step === 2 && (
          <>
            <div className="text-center mb-8">
              <h2 className="font-serif text-[22px] tracking-[0.04em] mb-2">
                自己紹介
              </h2>
              <p className="text-gk-sub text-[14px]">
                あなたの魅力を伝えましょう（任意）
              </p>
            </div>

            <div className="bg-gk-surface rounded-2xl p-6 border border-gk-border">
              <label className="block text-gk-sub text-[13px] mb-2">
                自己紹介文
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="趣味や好きなこと、どんな出会いを求めているかなどを自由にご記入ください"
                rows={5}
                maxLength={300}
                className="w-full px-4 py-3 rounded-lg bg-gk-elevated border border-gk-border text-gk-text text-[15px] outline-none focus:border-gk-gold transition-colors placeholder:text-gk-muted resize-none"
              />
              <p className="text-gk-muted text-[11px] mt-1 text-right">
                {bio.length} / 300
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={goNext}
                className="w-full h-[52px] rounded-lg text-gk-base font-medium text-[15px] transition-opacity hover:opacity-90 bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)]"
              >
                次へ
              </button>
              <button
                type="button"
                onClick={goNext}
                className="w-full h-[44px] text-gk-sub text-[14px] hover:text-gk-text transition-colors"
              >
                スキップ
              </button>
            </div>
          </>
        )}

        {/* --- Step 3: 学歴 --- */}
        {step === 3 && (
          <>
            <div className="text-center mb-8">
              <h2 className="font-serif text-[22px] tracking-[0.04em] mb-2">
                学歴
              </h2>
              <p className="text-gk-sub text-[14px]">
                学歴を登録するとすぐに探索が始まります
              </p>
            </div>

            <div className="bg-gk-surface rounded-2xl p-6 border border-gk-border space-y-5">
              <div>
                <label className="block text-gk-sub text-[13px] mb-2">
                  大学名{" "}
                  <span className="text-gk-gold text-[11px]">必須</span>
                </label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="東京大学"
                  className={cn(
                    inputBase,
                    errors.university ? "border-gk-error" : "border-gk-border"
                  )}
                />
                {errors.university && (
                  <p className="text-gk-error text-[12px] mt-1">
                    {errors.university}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gk-sub text-[13px] mb-2">
                  学部名{" "}
                  <span className="text-gk-gold text-[11px]">必須</span>
                </label>
                <input
                  type="text"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  placeholder="工学部"
                  className={cn(
                    inputBase,
                    errors.faculty ? "border-gk-error" : "border-gk-border"
                  )}
                />
                {errors.faculty && (
                  <p className="text-gk-error text-[12px] mt-1">
                    {errors.faculty}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-gk-sub text-[13px] mb-2">
                  卒業年度{" "}
                  <span className="text-gk-gold text-[11px]">必須</span>
                </label>
                <input
                  type="number"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  placeholder="2024"
                  min="1900"
                  max="2050"
                  className={cn(
                    inputBase,
                    errors.graduationYear
                      ? "border-gk-error"
                      : "border-gk-border"
                  )}
                />
                {errors.graduationYear && (
                  <p className="text-gk-error text-[12px] mt-1">
                    {errors.graduationYear}
                  </p>
                )}
              </div>
            </div>

            {serverError && (
              <div className="mt-4 px-3 py-2 rounded-lg bg-gk-error/10 border border-gk-error/30">
                <p className="text-gk-error text-[13px]">{serverError}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending}
              className="w-full h-[52px] rounded-lg text-gk-base font-medium text-[15px] mt-6 transition-opacity hover:opacity-90 disabled:opacity-50 bg-[linear-gradient(135deg,#9A7A2E,#C9A84C,#E8C87A)]"
            >
              {pending ? "登録中..." : "完了する"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
