export type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export type Gender = "male" | "female";

export type Profile = {
  id: string;
  name: string;
  birth_date: string; // "YYYY-MM-DD"
  age: number; // profiles_with_age ビュー経由で動的計算
  gender: Gender;
  bio: string | null;
  photo_url: string | null;
  deleted_at: string | null; // null = 有効, non-null = 退会済み
  university: string;
  faculty: string;
  graduation_year: number;
};

export type Match = {
  id: string;
  partner: Profile;
  created_at: string;
  last_message: string | null;
};

export type Message = {
  id: string;
  match_id: string;
  sender_id: string | null; // null = 退会済みユーザーの送信メッセージ
  content: string;
  created_at: string;
};
