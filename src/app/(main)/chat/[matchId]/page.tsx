import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMatchAction, getMessagesAction } from "@/lib/actions/messages";
import ChatHeader from "@/components/chat/ChatHeader";
import ChatView from "@/components/chat/ChatView";

type Props = {
  params: Promise<{ matchId: string }>;
};

export default async function ChatPage({ params }: Props) {
  const { matchId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const [matchResult, messagesResult] = await Promise.all([
    getMatchAction(matchId),
    getMessagesAction(matchId),
  ]);

  if (matchResult.error || !matchResult.data) {
    notFound();
  }

  const { partner } = matchResult.data;
  const initialMessages = messagesResult.data ?? [];

  return (
    // fixed inset-0 z-50 でBottomNav(z-40)を隠してチャット専用の全画面UIにする
    <div className="fixed inset-0 bg-gk-base z-50 flex flex-col">
      <ChatHeader partner={partner} />
      <div className="flex-1 overflow-hidden pt-14">
        <ChatView
          matchId={matchId}
          currentUserId={user.id}
          partner={partner}
          initialMessages={initialMessages}
        />
      </div>
    </div>
  );
}
