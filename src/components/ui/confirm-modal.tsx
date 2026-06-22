"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
  success = false,
  successMessage,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  success?: boolean;
  successMessage?: string;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(onClose, 1800);
      return () => clearTimeout(t);
    }
  }, [success, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-1/2 top-1/2 z-50 w-[min(100%,24rem)] -translate-x-1/2 -translate-y-1/2"
            role="dialog"
            aria-modal
            aria-labelledby="modal-title"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-[hsl(var(--surface-elevated))] p-6 shadow-glass">
              {success ? (
                <div className="py-4 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                    ✓
                  </div>
                  <p className="mt-4 text-sm font-medium text-white">
                    {successMessage ?? "C'est fait."}
                  </p>
                </div>
              ) : (
                <>
                  <h2
                    id="modal-title"
                    className="text-base font-semibold tracking-[-0.02em] text-white"
                  >
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/45">{body}</p>
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 rounded-full border border-white/[0.08] py-2.5 text-[13px] text-white/60 transition-colors hover:border-white/15 hover:text-white"
                    >
                      {cancelLabel}
                    </button>
                    <button
                      ref={confirmRef}
                      type="button"
                      onClick={() => {
                        onConfirm?.();
                      }}
                      className={cn(
                        "flex-1 rounded-full py-2.5 text-[13px] font-medium text-white transition-colors",
                        variant === "destructive"
                          ? "bg-red-500/90 hover:bg-red-500"
                          : "bg-primary hover:bg-primary/90",
                      )}
                    >
                      {confirmLabel}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
