import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Green Power — Gantt Chart Editor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#f0f4f0] text-gray-800 font-sans">{children}</body>
    </html>
  );
}
