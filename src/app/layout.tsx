import "allotment/dist/style.css"
import "./globals.css";

import type { Metadata } from "next";
import { Fira_Code, Plus_Jakarta_Sans } from "next/font/google";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";


const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lavender Muse Studio",
  description: "A soft, polished creative studio app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body className={`${plusJakartaSans.variable} ${firaCode.variable} antialiased`}>
        <Providers>
            {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
