"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { updatePhotoUrlAction } from "@/lib/actions/profile";

type Props = {
  userId: string;
  currentPhotoUrl: string | null;
};

export default function PhotoUpload({ userId, currentPhotoUrl }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentPhotoUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("画像ファイルを選択してください");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("ファイルサイズは5MB以内にしてください");
      return;
    }

    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    startTransition(async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.log("===uploadError", uploadError)
        setError("写真のアップロードに失敗しました");
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const result = await updatePhotoUrlAction(data.publicUrl);

      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-center mb-6">
      <div className="relative mb-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gk-gold focus:outline-none disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #1E1E3F, #0E2040)" }}
        >
          {preview ? (
            <Image src={preview} alt="プロフィール写真" fill className="object-cover" />
          ) : (
            <span className="text-[32px] font-serif text-white/40 flex items-center justify-center w-full h-full">
              ?
            </span>
          )}
        </button>
        {/* カメラアイコン */}
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="absolute bottom-0 right-0 w-7 h-7 rounded-full border-2 border-gk-base flex items-center justify-center disabled:opacity-50 bg-gk-gold"
        >
          <svg className="w-3.5 h-3.5 text-gk-base" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <p className="text-gk-muted text-[12px]">
        {isPending ? "アップロード中..." : "タップして写真を変更"}
      </p>
      {error && <p className="text-gk-error text-[12px] mt-1">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
