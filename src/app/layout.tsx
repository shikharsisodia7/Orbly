import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://orbly.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Orbly — Understand Your Instagram Circle",
    template: "%s — Orbly",
  },
  description:
    "Upload your Instagram followers and following export, analyze it locally in your browser, and see who's really in your circle. No login, no password, nothing uploaded.",
  applicationName: "Orbly",
  keywords: [
    "Instagram followers",
    "who doesn't follow me back",
    "Instagram unfollowers",
    "follower analytics",
  ],
  authors: [{ name: "Orbly" }],
  openGraph: {
    type: "website",
    siteName: "Orbly",
    title: "Orbly — Understand Your Instagram Circle",
    description:
      "Upload your Instagram export, analyze it locally, and see who's really in your circle.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Orbly — Understand Your Instagram Circle",
    description:
      "Upload your Instagram export, analyze it locally, and see who's really in your circle.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0D",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
