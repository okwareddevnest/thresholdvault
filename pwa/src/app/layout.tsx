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
