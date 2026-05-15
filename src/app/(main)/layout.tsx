import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTotalUnreadCountAction } from "@/lib/actions/messages";
import BottomNav from "@/components/layout/BottomNav";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: education } = await supabase
    .from("educations")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!education) {
    redirect("/onboarding");
  }

  const { data: totalUnread } = await getTotalUnreadCountAction(user.id);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav userId={user.id} initialUnreadCount={totalUnread ?? 0} />
    </div>
  );
}
