/* eslint-disable check-file/folder-naming-convention */
import type { Metadata } from "next";

import "../globals.css";

export const metadata: Metadata = {
  title: "Offline",
  description: "Offline fallback page.",
};

export default function OfflineLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className="bg-background text-foreground min-h-dvh antialiased">
        {children}
      </body>
    </html>
  );
}
