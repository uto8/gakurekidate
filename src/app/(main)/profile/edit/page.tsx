import { redirect } from "next/navigation";
import { getMyProfileAction } from "@/lib/actions/profile";
import EditProfileForm from "@/components/profile/EditProfileForm";

export default async function ProfileEditPage() {
  const { data: profile, error } = await getMyProfileAction();

  if (error || !profile) {
    redirect("/onboarding");
  }

  return <EditProfileForm profile={profile} />;
}
