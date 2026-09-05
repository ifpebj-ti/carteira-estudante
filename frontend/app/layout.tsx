import { Inter } from 'next/font/google'
import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '@/hooks/useAuth'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Carteira de Estudante - IFPE',
  description: 'Sistema de controle e identificação de estudantes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased min-h-screen bg-slate-50 text-slate-900`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
