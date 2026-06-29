"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export function MessageLimitModal({
  open,
  onOpenChange,
  messagesLimit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messagesLimit: number;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="fixed left-1/2 top-1/2 z-50 w-[min(100%,24rem)] -translate-x-1/2 -translate-y-1/2"
            role="dialog"
            aria-modal
          >
            <div className="rounded-xl border border-[#1a1a1a] bg-[#111111] p-6">
              <h2 className="text-[16px] font-semibold text-white">Limite atteinte</h2>
              <p className="mt-2 text-[14px] text-[#888888]">
                Vous avez atteint votre limite de {messagesLimit} messages ce mois-ci.
              </p>
              <Link
                href="/onboarding/pricing"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[#f97316] px-4 py-3 text-[14px] font-medium text-white transition-colors duration-150 ease-in-out hover:bg-[#ea6c0a]"
                onClick={() => onOpenChange(false)}
              >
                Upgrader mon plan
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
