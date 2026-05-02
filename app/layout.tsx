import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { getServerSession } from "next-auth";
import AuthProvider from "@/components/AuthProvider";
import PwaRegister from "@/components/PwaRegister";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://photoeditor.rony.studio"),
  title: {
    default: "Rony Studio",
    template: "%s | Rony Studio",
  },
  description: "Rony Studio is the personal website and creative portfolio of Rony.",
  icons: {
    icon: [{ url: "/photoeditor.svg", type: "image/svg+xml" }],
    shortcut: "/photoeditor.svg",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Rony Studio",
    description:
      "Rony Studio is the personal website and creative portfolio of Rony.",
    url: "https://photoeditor.rony.studio",
    siteName: "Rony Studio",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Rony Studio",
    description:
      "Rony Studio is the personal website and creative portfolio of Rony.",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#0b1220",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider session={session}>{children}</AuthProvider>
        <PwaRegister />
        <Analytics />
      </body>
    </html>
  );
}
