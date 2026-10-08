import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vidzly - TikTok Downloader",
  description:
    "Unduh video dan slideshow TikTok dengan cepat dan mudah.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}