import { getDiscoverUsersAction } from "@/lib/actions/discover";
import DiscoverClient from "@/components/discover/DiscoverClient";

export default async function DiscoverPage() {
  const { data: initialUsers } = await getDiscoverUsersAction({ page: 0 });

  const users = initialUsers ?? [];

  return (
    <DiscoverClient
      initialUsers={users}
      hasMore={users.length === 20}
    />
  );
}
