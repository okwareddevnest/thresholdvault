'use client';
import { useCallback, useEffect, useState } from "react";
import { AuthClient } from "@dfinity/auth-client";
import { Principal } from "@dfinity/principal";
import { configureAgentIdentity } from "@/services/icActors";

let sharedClient: AuthClient | null = null;
const subscribers = new Set<(principal: Principal | null) => void>();

async function ensureClient() {
  if (!sharedClient) {
    sharedClient = await AuthClient.create();
  }
  return sharedClient;
}

function notify(principal: Principal | null) {
  subscribers.forEach((cb) => cb(principal));
}

export function useAuthClient() {
  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    ensureClient().then(async (client) => {
      if (!mounted) return;
      setAuthClient(client);
      const authenticated = await client.isAuthenticated();
      if (authenticated) {
        const identity = client.getIdentity();
        configureAgentIdentity(identity);
        setPrincipal(identity.getPrincipal());
      } else {
        configureAgentIdentity(null);
        setPrincipal(null);
      }
      setLoading(false);
    });
    const listener = (value: Principal | null) => {
      if (mounted) {
        setPrincipal(value);
      }
    };
    subscribers.add(listener);
    return () => {
      mounted = false;
      subscribers.delete(listener);
    };
  }, []);

  const login = useCallback(async () => {
    const client = authClient ?? (await ensureClient());
    setAuthClient(client);
    return client.login({
      identityProvider:
        process.env.NEXT_PUBLIC_II_URL ??
        "https://id.ai",
      onSuccess: async () => {
        const identity = client.getIdentity();
        configureAgentIdentity(identity);
        notify(identity.getPrincipal());
      },
    });
  }, [authClient]);

  const logout = useCallback(async () => {
    const client = authClient ?? (await ensureClient());
    await client.logout();
    configureAgentIdentity(null);
    notify(null);
  }, [authClient]);

  return {
    authClient,
    principal,
    principalText:
      principal && principal.toText() !== Principal.anonymous().toText()
        ? principal.toText()
        : "",
    login,
    logout,
    loading,
  };
}
