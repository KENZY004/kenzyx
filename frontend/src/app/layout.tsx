import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kenyx — The Community-Driven Coding Platform",
    template: "%s | Kenyx",
  },
  description:
    "Kenyx is a production-grade coding platform where developers solve and create algorithmic problems. "+
    "Real-time execution, community problem creation, battle mode, and leaderboards.",
  keywords: ["kenyx", "coding", "algorithms", "leetcode alternative", "competitive programming"],
  openGraph: {
    title: "Kenyx — The Community-Driven Coding Platform",
    description: "Solve problems, create challenges, and compete with developers worldwide.",
    type: "website",
    url: "https://kenyx.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kenyx — Coding Platform",
    description: "The community-driven alternative to LeetCode.",
  },
};

import { GoogleOAuthProvider } from "@react-oauth/google";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-kenyx-bg text-kenyx-text-primary antialiased">
        <GoogleOAuthProvider clientId="332742377041-pfl6ift3df8b1bq8hlmihsnpfjohr89h.apps.googleusercontent.com">
          <Navbar />
          <main>{children}</main>
        </GoogleOAuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#0d1117",
              color: "#e6edf3",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "10px",
              fontSize: "13px",
            },
            success: { iconTheme: { primary: "#a8ff3e", secondary: "#07090b" } },
            error:   { iconTheme: { primary: "#f85149", secondary: "#fff" } },
          }}
        />
      </body>
    </html>
  );
}
