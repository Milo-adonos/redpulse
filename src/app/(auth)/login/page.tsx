"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-white/40">
          Chargement…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const emailError = useMemo(
    () => (touched.email ? validateEmail(email) : undefined),
    [email, touched.email],
  );
  const passwordError = useMemo(
    () => (touched.password ? validatePassword(password) : undefined),
    [password, touched.password],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (validateEmail(email) || validatePassword(password)) return;

    setError("");
    setLoading(true);
    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (result?.ok) router.push("/dashboard");
    else setError("Identifiants incorrects");
  }

  return (
    <AuthShell
      title="Bon retour."
      subtitle="Votre espace de performance Reddit vous attend."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/signup" className="text-primary hover:text-primary/80">
            Créer un accès
          </Link>
        </>
      }
    >
      <SocialAuthButtons />
      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}
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
          required
          minLength={8}
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-full bg-[#f97316] py-4 text-[14px] font-medium text-white transition-all hover:bg-[#ea6c0a] disabled:opacity-50"
        >
          {loading ? "Connexion…" : "Entrer dans RedPulse"}
        </button>
      </form>
    </AuthShell>
  );
}
