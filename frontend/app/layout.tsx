import { Roboto } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/hooks/useAuth";

const roboto = Roboto({ 
  weight: ['400', '500', '700'],
  subsets: ["latin"], 
  // Já não precisamos do 'variable' aqui!
});

export const metadata: Metadata = {
  title: "Carteira de Estudante - IFPE",
  description: "Sistema de controle e identificação de estudantes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body
        /* Aqui está a magia: usamos roboto.className diretamente */
        className={`${roboto.className} antialiased min-h-screen bg-slate-50 text-slate-900`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}