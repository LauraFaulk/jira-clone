import type { Metadata } from "next";
import { Geist, Geist_Mono, Sour_Gummy, Oldenburg, Elsie } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sourGummy = Sour_Gummy({
  variable: "--font-sour-gummy",
  subsets: ["latin"],
});

const oldenburg = Oldenburg({
  weight: "400",
  variable: "--font-oldenburg",
  subsets: ["latin"],
});

const elsie = Elsie({
  weight: "900", 
  variable: "--font-elsie",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Emi-vation Station",
  description: "Intake and Project Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sourGummy.variable} ${oldenburg.variable} ${elsie.variable} antialiased bg-gray-950 text-gray-100`}
      >
        {children}
      </body>
    </html>
  );
}