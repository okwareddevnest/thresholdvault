"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { RiFingerprintLine, RiCloseLine } from "react-icons/ri";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  loading?: boolean;
};

export function LoginModal({ isOpen, onClose, onLogin, loading }: Props) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-deep-navy/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border-subtle bg-card-background shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-2 text-text-secondary hover:bg-white/5 hover:text-text-primary"
          >
            <RiCloseLine className="text-2xl" />
          </button>

          <div className="flex flex-col items-center p-8 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white p-4 shadow-lg">
              {/* Internet Identity Logo Placeholder - using Infinity symbol as approximation or the actual logo if available */}
              <span className="text-4xl font-bold text-black">∞</span>
            </div>

            <h2 className="mb-2 font-display text-2xl text-text-primary">
              Internet Identity
            </h2>
            <p className="mb-8 text-text-secondary">
              Securely connect to ThresholdVault using your passkey. No passwords, no tracking.
            </p>

            <button
              onClick={onLogin}
              disabled={loading}
              className="group relative flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 font-semibold text-black transition hover:bg-gray-100 disabled:opacity-70"
            >
              {loading ? (
                <span>Connecting...</span>
              ) : (
                <>
                  <RiFingerprintLine className="text-xl" />
                  <span>Sign in with Internet Identity</span>
                </>
              )}
            </button>

            <div className="mt-6 flex items-center gap-2 text-xs text-text-secondary">
              <span>Powered by</span>
              <span className="font-semibold text-text-primary">Internet Computer</span>
            </div>
          </div>
          
          <div className="border-t border-border-subtle bg-deep-navy/30 px-8 py-4 text-center text-xs text-text-secondary">
            By connecting, you agree to our Terms of Service and Privacy Policy.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

