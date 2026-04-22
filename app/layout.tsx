import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://repo-infra-cost.example.com"),
  title: "Repo Infra Cost | GitHub URL to Hosting Cost Estimates",
  description:
    "Paste a GitHub repo URL and get practical self-hosted vs managed hosting cost estimates across AWS, Fly.io, Railway, and Vercel.",
  keywords: [
    "cloud cost estimate",
    "github repo analysis",
    "aws cost calculator",
    "vercel pricing",
    "fly io pricing",
    "railway pricing",
    "developer tools"
  ],
  openGraph: {
    title: "Repo Infra Cost",
    description:
      "Analyze package.json and Dockerfile from a GitHub URL and compare infra costs at 1k, 10k, and 100k MAU.",
    type: "website",
    url: "https://repo-infra-cost.example.com"
  },
  twitter: {
    card: "summary_large_image",
    title: "Repo Infra Cost",
    description:
      "Understand what your repo will cost on AWS, Fly.io, Railway, and Vercel before you commit."
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${display.variable} ${mono.variable} min-h-screen bg-[#0d1117] font-sans text-slate-100 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
