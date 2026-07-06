import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Admin Dashboard",
  description: "Modern dashboard for school administration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
