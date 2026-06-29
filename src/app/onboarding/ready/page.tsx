import { redirect } from "next/navigation";

export default async function ReadyRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const params = await searchParams;
  const session = params.session;
  if (session) {
    redirect(`/onboarding/result?session=${session}`);
  }
  redirect("/");
}
