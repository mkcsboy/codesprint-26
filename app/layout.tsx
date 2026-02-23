import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import Script from "next/script"; // <--- IMPORT THIS
import "./globals.css";
import { cn } from "@/lib/utils";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

export const metadata: Metadata = {
  title: "CodeSprint'26 | Retro RPG",
  description: "A High-Stakes Coding Casino",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PYODIDE LOADER - Removed as we are using server action Piston engine now */}
      </head>
      <body className={cn(
        pixelFont.variable,
        "bg-retro-purple text-white font-pixel antialiased min-h-screen selection:bg-retro-green selection:text-black"
      )}>
        <main className="flex flex-col items-center justify-center min-h-screen w-full">
          {children}
        </main>
      </body>
    </html>
  );
}