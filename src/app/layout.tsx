import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hand Gesture Game",
  description: "ทดสอบท่ามือด้วย MediaPipe",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0f0f1a] text-white">{children}</body>
    </html>
  );
}
