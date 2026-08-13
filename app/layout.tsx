import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    title: "ACCOUNTING_ALL_PERIODS_V2 — Frozen Header",
    description: "Public read-only VLADBOT accounting view with one frozen header.",
    openGraph: {
      title: "ACCOUNTING_ALL_PERIODS_V2 — Frozen Header",
      description: "VLADBOT accounting sheet with one frozen header",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1716, height: 916, alt: "VLADBOT all-period accounting sheet" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "ACCOUNTING_ALL_PERIODS_V2 — Frozen Header",
      description: "VLADBOT accounting sheet with one frozen header",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
