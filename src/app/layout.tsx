import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "StudyBond Admin",
    template: "%s — StudyBond Admin",
  },
  description: "Operations console for StudyBond administrators.",
  icons: {
    icon: "/studybond-logo.png",
    apple: "/studybond-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[var(--sb-bg)] text-[var(--sb-text)] antialiased"
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
