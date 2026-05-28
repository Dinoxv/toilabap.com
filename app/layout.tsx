import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import ThemeApplier from "@/components/providers/ThemeApplier";
import SettingsPanel from "@/components/layout/SettingsPanel";
import { CredentialsProvider } from "@/lib/context/credentials-context";
import { RequireCredentials } from "@/components/auth/RequireCredentials";
import { ConditionalServiceProvider } from "@/components/providers/ConditionalServiceProvider";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "react-hot-toast";
import DeploymentCheck from "@/components/DeploymentCheck";
import ChunkLoadRecovery from "@/components/ChunkLoadRecovery";

const enableVercelAnalytics =
  process.env.VERCEL === '1' || process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true';

const binancePlex = localFont({
  src: [
    { path: "./font/BinancePlex-Light.woff2", weight: "300", style: "normal" },
    { path: "./font/BinancePlex-Regular.woff2", weight: "400", style: "normal" },
    { path: "./font/BinancePlex-Medium.woff2", weight: "500", style: "normal" },
    { path: "./font/BinancePlex-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-binance",
  display: "swap",
});

const siteUrl = "https://app.toilabap.com";
const ogImage = `https://toilabap.com/landing/hero.png`;

export const metadata: Metadata = {
  title: "app.toilabap.com | Live Trading Terminal",
  description: "Launch the live trading terminal. Real-time multi-exchange charts, market scanner, divergence detection, and instant execution. Trade on Binance and Hyperliquid directly from your browser.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/branding/toilabap.com-icon.png", type: "image/png" },
    ],
    shortcut: ["/branding/toilabap.com-icon.png"],
    apple: ["/branding/toilabap.com-icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "app.toilabap.com — Live Trading Terminal",
    description: "Launch the advanced trading terminal with real-time charts, market scanner, divergence detection, and multi-exchange support.",
    siteName: "app.toilabap.com",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "toilabap.com Trading Terminal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "app.toilabap.com — Multi-Exchange Trading Terminal",
    description: "Live trading terminal with real-time charts, market scanner, divergence detection, and instant multi-exchange execution.",
    images: [ogImage],
  },
  authors: [{ name: "app.toilabap.com", url: "https://app.toilabap.com" }],
  keywords: [
    "Hyperliquid",
    "Binance",
    "trading terminal",
    "toilabap.com",
    "algo trading platform",
    "smart money concept",
    "crypto trading",
    "CEX/DEX trading",
    "technical analysis",
    "market scanner",
    "trading signals",
    "scalping",
    "DeFi",
    "multi-exchange trading",
    "perpetual trading",
    "crypto terminal",
    "real-time charts",
    "order execution",
    "divergence detection",
    "multi-timeframe analysis",
  ],
  other: {
    "ai-content-declaration": "toilabap.com is a professional multi-exchange trading terminal. Visit https://toilabap.com for more information.",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="alternate" hrefLang="en" href="https://app.toilabap.com" />
        <link rel="alternate" hrefLang="vi" href="https://app.toilabap.com" />
        <link rel="alternate" hrefLang="zh" href="https://app.toilabap.com" />
        <link rel="alternate" hrefLang="x-default" href="https://app.toilabap.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "app.toilabap.com",
              url: siteUrl,
              description: "Live trading terminal with real-time charts, market scanner, divergence detection, and multi-exchange order execution.",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              author: {
                "@type": "Organization",
                name: "toilabap.com",
                url: "https://toilabap.com",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${binancePlex.variable} subpixel-antialiased`}
        suppressHydrationWarning
      >
        <ChunkLoadRecovery />
        <DeploymentCheck />
        <CredentialsProvider>
          <ThemeApplier />
          <SettingsPanel />
          <RequireCredentials>
            <ConditionalServiceProvider>
              {children}
            </ConditionalServiceProvider>
          </RequireCredentials>
        </CredentialsProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--background-secondary)',
              color: 'var(--primary)',
              border: '1px solid var(--border-frame)',
              fontFamily: 'var(--font-binance), BinancePlex, sans-serif',
              fontSize: '12px',
            },
            success: {
              icon: null,
              style: {
                border: '1px solid var(--status-bullish)',
              },
            },
            error: {
              icon: null,
              style: {
                border: '1px solid var(--status-bearish)',
              },
            },
          }}
        />
        {enableVercelAnalytics ? <Analytics /> : null}
      </body>
    </html>
  );
}
