'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Menu, X, LogOut 
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Pegamos a URL atual para saber qual menu deixar "aceso"
  const pathname = usePathname();
  const isActive = (path: string) => pathname?.includes(path);

  // Define o título do cabeçalho com base na URL
  const getPageTitle = () => {
    if (isActive('dashboard')) return 'Dashboard';
    if (isActive('alunos')) return 'Gestão de Alunos';
    if (isActive('movimentacoes')) return 'Movimentações';
    if (isActive('relatorios')) return 'Relatórios';
    if (isActive('configuracoes')) return 'Configurações';
    return 'Administração';
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden text-slate-900">
      
      {/* Overlay mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-primary-900 text-white border-r border-primary-800 flex flex-col justify-between transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shrink-0 h-full`}>
        <div>
          <div className="p-6 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 text-white p-2 rounded-lg font-bold border border-white/20">AD</div>
              <div>
                <h1 className="font-bold text-white text-sm">Carteira de Estudante</h1>
                <p className="text-xs text-primary-200">Campus Belo Jardim</p>
              </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1 hover:bg-white/10 rounded-lg text-primary-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            <a href="/admin/dashboard" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('dashboard') ? 'bg-white/15 text-white' : 'text-primary-200 hover:bg-white/10 hover:text-white'}`}>Dashboard</a>
            <a href="/admin/alunos" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('alunos') ? 'bg-white/15 text-white' : 'text-primary-200 hover:bg-white/10 hover:text-white'}`}>Alunos</a>
            <a href="/admin/movimentacoes" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('movimentacoes') ? 'bg-white/15 text-white' : 'text-primary-200 hover:bg-white/10 hover:text-white'}`}>Movimentações</a>
            <a href="/admin/relatorios" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('relatorios') ? 'bg-white/15 text-white' : 'text-primary-200 hover:bg-white/10 hover:text-white'}`}>Relatórios</a>
            <a href="/admin/configuracoes" className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive('configuracoes') ? 'bg-white/15 text-white' : 'text-primary-200 hover:bg-white/10 hover:text-white'}`}>Configurações</a>
          </nav>
        </div>
        <div className="p-4 border-t border-white/10 flex items-center gap-3 mb-4 md:mb-0">
          <div className="w-9 h-9 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-sm border border-white/20 shrink-0">AG</div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">Adm. Geral</p>
            <p className="text-[11px] text-primary-200 truncate">admin@belojardim.ifpe.edu.br</p>
          </div>
        </div>
      </aside>

      {/* --- HEADER E CONTEÚDO PRINCIPAL --- */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        <header className="relative z-20 h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <button 
              type="button"
              onClick={() => setIsMobileMenuOpen(true)} 
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
              <span>Adm Central</span>
              <span>/</span>
              <span className="text-primary-600">{getPageTitle()}</span>
            </div>
            <span className="sm:hidden text-slate-800 font-medium">{getPageTitle()}</span>
          </div>

          {/* Botão de Logout Direto */}
          <div className="flex items-center">
            <a 
              href="http://127.0.0.1:8000/api/v1/auth/logout" 
              className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors border border-transparent hover:border-rose-200"
            >
              <span className="hidden sm:inline">Sair da conta</span>
              <LogOut className="w-5 h-5" />
            </a>
          </div>
        </header>

        {/* O Next.js injeta a sua página exata aqui dentro automaticamente! */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}