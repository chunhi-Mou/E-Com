import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AuthGuard } from "@/components/AuthGuard";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SearchScrim } from "@/components/SearchScrim";
import { ImageDropzone } from "@/components/ImageDropzone";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { Toaster } from "@/components/Toaster";
import { RouteCurtain } from "@/components/RouteCurtain";

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Lumina: mua sắm bằng giọng nói, hình ảnh và văn bản", template: "%s | Lumina" },
  description: "Trải nghiệm mua sắm thông minh thế hệ mới với công nghệ tìm kiếm bằng văn bản, giọng nói và hình ảnh.",
};

export const viewport: Viewport = { themeColor: "#FFFFFF", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnam.variable} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col" suppressHydrationWarning>
        <Providers>
          <AuthGuard>
            <Header />
            <SearchScrim />
            <main id="main" className="flex-1">{children}</main>
            <Footer />
            <ImageDropzone />
            <VoiceAssistant />
            <Toaster />
          </AuthGuard>
          <RouteCurtain />
        </Providers>
      </body>
    </html>
  );
}
