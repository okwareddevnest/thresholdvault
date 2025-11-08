import type { NextConfig } from "next";
import nextPWA from "next-pwa";

const runtimeCaching = [
  {
    urlPattern: /^https:\/\/[^/]+\.ic0\.app\/.*/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "thresholdvault-canister-cache",
      networkTimeoutSeconds: 5,
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 60 * 30,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: /\/api\/(vaults|guardians|heartbeat|transactions)/i,
    handler: "NetworkFirst",
    options: {
      cacheName: "thresholdvault-read-model",
      networkTimeoutSeconds: 3,
      expiration: {
        maxEntries: 60,
        maxAgeSeconds: 60 * 60,
      },
      cacheableResponse: {
        statuses: [0, 200],
      },
    },
  },
  {
    urlPattern: ({ request }: { request: Request }) =>
      request.destination === "document" ||
      request.destination === "script" ||
      request.destination === "style",
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "thresholdvault-shell",
      expiration: {
        maxEntries: 40,
        maxAgeSeconds: 60 * 60 * 24,
      },
    },
  },
];

const withPWA = nextPWA({
  dest: "public",
  runtimeCaching,
  disable: false,
  register: true,
  skipWaiting: false,
  buildExcludes: [/middleware-manifest\.json$/],
  publicExcludes: ["!icons/*"],
  workboxOptions: {
    clientsClaim: true,
    cleanupOutdatedCaches: true,
  },
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  output: "export",
  experimental: {
    instrumentationHook: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    unoptimized: true,
  },
};

export default withPWA(nextConfig);
