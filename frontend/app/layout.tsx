import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Project Zenith — The Celestial Eye",
  description:
    "An AI-powered digital observatory. Explore the sky above any location in real time — satellites, the ISS, planets, and constellations — across past and future timestamps.",
  applicationName: "Project Zenith",
  authors: [{ name: "Team DO BRONXS" }],
  keywords: ["astronomy", "ISS", "satellites", "observatory", "AI", "ASTRALWEB"],
};

export const viewport: Viewport = {
  themeColor: "#03000A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} bg-space font-sans text-star antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
