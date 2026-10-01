import "./account.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./refinement.css";
import NavigationTransition from "@/components/NavigationTransition";

export const metadata: Metadata = {
  title: "Atlas Research OS",
  description: "Provider-independent AI research, organization, provenance, search, and resumable knowledge workflows.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body><NavigationTransition>{children}</NavigationTransition></body>
    </html>
  );
}
