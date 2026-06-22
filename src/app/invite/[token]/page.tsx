import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  if (session?.user) {
    redirect(`/dashboard?invite=${token}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-5 text-center">
      <p className="text-[11px] uppercase tracking-wider text-primary">
        Invitation RedPulse
      </p>
      <h1 className="mt-4 text-2xl font-bold text-white">
        Vous avez été invité·e à rejoindre une équipe
      </h1>
      <p className="mt-3 max-w-md text-sm text-white/40">
        Créez votre compte ou connectez-vous pour accepter l&apos;invitation et
        accéder au dashboard.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/signup?invite=${token}`}
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black"
        >
          Créer un compte
        </Link>
        <Link
          href={`/login?invite=${token}`}
          className="rounded-full border border-white/10 px-6 py-3 text-sm text-white/70"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}
