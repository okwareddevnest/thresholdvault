"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthClient } from "@/hooks/useAuthClient";
import { acceptInvitation, getGuardianByHash } from "@/services/guardianService";
import type { GuardianRecord } from "@/types/vault";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function AcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login, principalText } = useAuthClient();
  const isAuthenticated = !!principalText;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardian, setGuardian] = useState<GuardianRecord | null>(null);

  const vaultIdStr = searchParams.get("vaultId");
  const emailHashHex = searchParams.get("emailHash");

  useEffect(() => {
    if (!vaultIdStr || !emailHashHex) {
      setError("Invalid invitation link.");
      return;
    }

    const fetchGuardian = async () => {
      try {
        const vaultId = BigInt(vaultIdStr);
        const emailHash = hexToBytes(emailHashHex);
        const record = await getGuardianByHash(vaultId, emailHash);
        if (!record) {
          setError("Invitation not found.");
        } else {
          setGuardian(record);
        }
      } catch (err) {
        setError("Failed to load invitation details.");
        console.error(err);
      }
    };

    fetchGuardian();
  }, [vaultIdStr, emailHashHex]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      login();
      return;
    }

    if (!vaultIdStr || !emailHashHex) return;

    setLoading(true);
    try {
      const vaultId = BigInt(vaultIdStr);
      const emailHash = hexToBytes(emailHashHex);
      await acceptInvitation(vaultId, emailHash);
      router.push("/guardian/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-deep-navy text-text-primary">
        <div className="rounded-card border border-error-red/40 bg-error-red/10 p-8 text-center">
          <h1 className="text-xl font-bold text-error-red">Error</h1>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!guardian) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-deep-navy text-text-primary">
        <div className="text-text-secondary">Loading invitation...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-deep-navy text-text-primary">
      <div className="w-full max-w-md rounded-card border border-border-subtle bg-card-background p-8 shadow-vault">
        <div className="text-center">
          <h1 className="font-display text-2xl">Guardian Invitation</h1>
          <p className="mt-2 text-text-secondary">
            You have been invited to protect a ThresholdVault.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div className="rounded border border-border-subtle p-4">
            <p className="text-sm text-text-secondary">Role Alias</p>
            <p className="text-lg font-semibold">{guardian.alias}</p>
          </div>
          
          <div className="rounded border border-border-subtle p-4">
            <p className="text-sm text-text-secondary">Status</p>
            <p className="text-lg font-semibold">{guardian.status}</p>
          </div>

          {guardian.status === "Accepted" ? (
             <div className="mt-6 text-center">
               <p className="text-success-green mb-4">You have already accepted this invitation.</p>
               <button
                onClick={() => router.push("/guardian/dashboard")}
                className="w-full rounded-full bg-icp-cyan px-6 py-3 font-semibold text-deep-navy transition-colors hover:bg-icp-cyan/90"
              >
                Go to Dashboard
              </button>
             </div>
          ) : (
            <button
              onClick={handleAccept}
              disabled={loading}
              className="mt-6 w-full rounded-full bg-icp-cyan px-6 py-3 font-semibold text-deep-navy transition-colors hover:bg-icp-cyan/90 disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : isAuthenticated
                ? "Accept Responsibility"
                : "Sign in to Accept"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AcceptContent />
    </Suspense>
  );
}

