'use client';

import React from 'react';
import { LogOut } from 'lucide-react';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start">
      
      {/* Container principal simulando app mobile no desktop, e 100% width no celular */}
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col shadow-2xl relative overflow-hidden">
        
        {/* Top Bar Mobile Global */}
        <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="bg-primary-900 text-white p-1.5 rounded-lg font-bold text-xs">IF</div>
            <span className="font-bold text-slate-800 text-sm">Carteira Estudantil</span>
          </div>
          
          {/* Botão de Logout Direto (Sem dropdown) */}
          <a 
            href="http://127.0.0.1:8000/api/v1/auth/logout"
            className="p-2 text-rose-600 hover:bg-rose-100 hover:text-rose-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            title="Sair da conta"
          >
            <LogOut className="w-5 h-5" />
          </a>
        </header>

        {/* O conteúdo específico da Carteira ou do Leitor entra aqui! */}
        <div className="flex-1 flex flex-col relative h-full">
          {children}
        </div>

      </div>
    </div>
  );
}