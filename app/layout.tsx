import React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
// 1. Importe o AuthProvider
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner"; // Importante para os toasts funcionarem globalmente

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Controle de Perdas",
  description: "Controle operacional e gerencial de quebras e descartes",
  generator: "v0.app",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        {/* 2. Envolva toda a aplicação com o AuthProvider */}
        <AuthProvider>
          {children}
          <Analytics />
          <Toaster /> {/* Toast global */}
        </AuthProvider>
      </body>
    </html>
  );
}
