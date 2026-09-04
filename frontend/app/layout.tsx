import './globals.css'
import type { Metadata } from 'next'

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
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  )
}
