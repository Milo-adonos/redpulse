"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export function FloatingInput({
  id,
  label,
  type = "text",
  value,
  onChange,
  error,
  hint,
  required,
  minLength,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [focused, setFocused] = useState(false);
  const filled = value.length > 0;
  const raised = focused || filled;

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        minLength={minLength}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "peer w-full rounded-xl border bg-white/[0.03] px-4 pb-2.5 pt-6 text-sm text-white outline-none transition-all",
          "placeholder:text-transparent focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
          error ? "border-red-500/50" : "border-white/[0.08]",
        )}
        placeholder={label}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute left-4 text-muted-foreground transition-all duration-200",
          raised
            ? "top-2 text-[10px] uppercase tracking-wider text-white/40"
            : "top-1/2 -translate-y-1/2 text-sm",
        )}
      >
        {label}
      </label>
      {(error || hint) && (
        <p
          className={cn(
            "mt-1.5 text-[11px]",
            error ? "text-red-400" : "text-white/30",
          )}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function validateEmail(email: string) {
  if (!email) return "Email requis";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Email invalide";
  return undefined;
}

export function validatePassword(password: string) {
  if (!password) return "Mot de passe requis";
  if (password.length < 8) return "8 caractères minimum";
  return undefined;
}
