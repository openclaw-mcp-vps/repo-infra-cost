import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  metadataBase: new URL("https://repo-infra-cost.com"),
  title: "Repo Infra Cost | GitHub URL to Hosting Cost Estimates",
  description:
    "Paste a GitHub URL and get self-host vs managed hosting cost estimates across AWS, Fly.io, Railway, and Vercel at 1k, 10k, and 100k MAU.",
  openGraph: {
    title: "Repo Infra Cost",
    description:
      "Estimate hosting costs from a GitHub URL before you pick your stack. Compare AWS, Fly.io, Railway, and Vercel in minutes.",
    type: "website",
    url: "https://repo-infra-cost.com"
  },
  twitter: {
    card: "summary_large_image",
    title: "Repo Infra Cost",
    description:
      "Paste GitHub URL. Get realistic hosting cost breakdowns for AWS, Fly.io, Railway, and Vercel."
  },
  alternates: {
    canonical: "/"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Script src="https://assets.lemonsqueezy.com/lemon.js" strategy="afterInteractive" />
        {children}
      </body>
    </html>
  );
}
