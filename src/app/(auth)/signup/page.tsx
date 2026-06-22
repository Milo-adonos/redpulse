"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, Suspense } from "react";
import { signIn } from "next-auth/react";
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
    onSuccess: async () => {
      localStorage.removeItem("redpulse:draft-token");
      localStorage.removeItem("redpulse:project-draft");

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      const invite = searchParams.get("invite");
      if (invite && result?.ok) {
        acceptInvite.mutate({ token: invite });
      }

      if (result?.ok) {
        router.replace("/dashboard");
        return;
      }

      setError("Compte créé. Connectez-vous pour accéder au dashboard.");
      router.replace("/login?callbackUrl=/dashboard");
    },
    onError: (err) => setError(err.message),
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
          className="mt-2 w-full rounded-full bg-white py-4 text-[14px] font-medium text-black transition-all hover:bg-white/90 hover:shadow-glow-white disabled:opacity-50"
        >
          {signup.isLoading ? "Création…" : "Créer mon compte et accéder au dashboard"}
        </button>
      </form>
    </AuthShell>
  );
}
