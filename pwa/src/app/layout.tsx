import type { Metadata, Viewport } from "next";
import { inter, jetBrainsMono, spaceGrotesk } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThresholdVault",
  description:
    "Autonomous Bitcoin inheritance vaults powered by ICP threshold cryptography.",
  applicationName: "ThresholdVault",
  manifest: "/manifest.json",
  metadataBase: new URL("https://thresholdvault.xyz"),
  icons: {
    icon: [
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    title: "ThresholdVault",
    statusBarStyle: "black-translucent",
    capable: true,
  },
  formatDetection: {
    telephone: false,
  },
  keywords: [
    "Bitcoin inheritance",
    "threshold cryptography",
    "ICP",
    "tECDSA",
    "vetKeys",
  ],
};

export const viewport: Viewport = {
  themeColor: "#0A0E27",
  backgroundColor: "#0A0E27",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetBrainsMono.variable}`}
    >
      <body className="bg-deep-navy text-text-primary antialiased font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
