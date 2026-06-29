"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import {
  AuthShell,
  AuthDivider,
  SocialAuthButtons,
} from "@/components/auth/auth-shell";
import {
  FloatingInput,
  validateEmail,
  validatePassword,
} from "@/components/ui/floating-input";
import { api } from "@/trpc/react";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white/40">
          Chargement…
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, password: false });
  const [error, setError] = useState("");

  const draftToken =
    searchParams.get("draft") ??
    (typeof window !== "undefined"
      ? localStorage.getItem("redpulse:draft-token")
      : null);
  const fromOnboarding =
    searchParams.get("from") === "onboarding" || !!draftToken;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("redpulse:project-draft");
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as { projectName?: string };
      if (draft.projectName && !name) {
        setName(draft.projectName);
      }
    } catch {
      // ignore
    }
  }, [name]);

  const acceptInvite = api.team.acceptInvite.useMutation();

  const emailError = useMemo(
    () => (touched.email ? validateEmail(email) : undefined),
    [email, touched.email],
  );
  const passwordError = useMemo(
    () => (touched.password ? validatePassword(password) : undefined),
    [password, touched.password],
  );
  const nameError = useMemo(
    () => (touched.name && name.length < 2 ? "Nom requis (2 car. min.)" : undefined),
    [name, touched.name],
  );

  const signup = api.auth.signup.useMutation({
    onSuccess: async (data) => {
      localStorage.removeItem("redpulse:draft-token");
      localStorage.removeItem("redpulse:project-draft");
      localStorage.removeItem("redpulse:onboarding-draft");

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        await update({ teamId: data.teamId });
        const invite = searchParams.get("invite");
        if (invite) {
          acceptInvite.mutate({ token: invite });
        }
        router.replace("/dashboard");
        return;
      }

      if (result?.error === "CredentialsSignin") {
        setError(
          "Compte créé. Mot de passe incorrect lors de la connexion auto — connectez-vous manuellement.",
        );
      } else {
        setError(
          `Compte créé. Connexion auto échouée${result?.error ? ` (${result.error})` : ""} — connectez-vous avec votre email et mot de passe.`,
        );
      }
      router.replace(`/login?callbackUrl=/dashboard&email=${encodeURIComponent(email)}`);
    },
    onError: (err) => {
      if (err.message.includes("déjà utilisé")) {
        setError(
          "Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email.",
        );
        return;
      }
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (nameError || validateEmail(email) || validatePassword(password)) return;
    setError("");
    signup.mutate({
      name,
      email,
      password,
      draftToken: draftToken ?? undefined,
    });
  }

  return (
    <AuthShell
      title={fromOnboarding ? "Créez votre compte" : "Rejoignez RedPulse."}
      subtitle={
        fromOnboarding
          ? "Dernière étape — votre projet sera lié à ce compte et vous accéderez au dashboard."
          : "L'infrastructure invisible derrière votre croissance Reddit."
      }
      footer={
        <>
          Déjà membre ?{" "}
          <Link href="/login" className="text-primary hover:text-primary/80">
            Se connecter
          </Link>
        </>
      }
    >
      {!fromOnboarding && (
        <>
          <SocialAuthButtons />
          <AuthDivider />
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}
        <FloatingInput
          id="name"
          label="Nom complet"
          value={name}
          onChange={setName}
          error={nameError}
          required
        />
        <FloatingInput
          id="email"
          label="Email professionnel"
          type="email"
          value={email}
          onChange={setEmail}
          error={emailError}
          required
        />
        <FloatingInput
          id="password"
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          error={passwordError}
          hint="8 caractères minimum"
          required
          minLength={8}
        />
        <button
          type="submit"
          disabled={signup.isLoading}
          className="mt-2 w-full rounded-full bg-[#f97316] py-4 text-[14px] font-medium text-white transition-all hover:bg-[#ea6c0a] disabled:opacity-50"
        >
          {signup.isLoading ? "Création…" : "Créer mon compte et accéder au dashboard"}
        </button>
      </form>
    </AuthShell>
  );
}
