import type { Metadata } from "next";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "StudyBond Admin",
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)] antialiased"
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
