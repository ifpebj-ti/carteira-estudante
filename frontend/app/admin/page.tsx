'use client';

import { useState } from 'react';
import { 
  Menu, X, Search, Users, Activity, 
  ArrowUpRight, ArrowDownRight, UserPlus, ChevronRight 
} from 'lucide-react';

// --- LAYOUT COMPONENTS ---
const AdminSidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <>
    {isOpen && (
      <div 
        className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity" 
        onClick={onClose} 
      />
    )}
    <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-primary-900 text-white border-r border-primary-800 flex flex-col justify-between transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shrink-0 h-full`}>
      <div>
        <div className="p-6 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 text-white p-2 rounded-lg font-bold border border-white/20">AD</div>
            <div>
              <h1 className="font-bold text-white text-sm">Carteira de Estudante</h1>
              <p className="text-xs text-primary-200">Campus Belo Jardim</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="md:hidden p-1 hover:bg-white/10 rounded-lg text-primary-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {/* Dashboard highlighted */}
          <a href="/admin/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/15 text-white text-sm font-medium">Dashboard</a>
          <a href="/admin/alunos" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Alunos</a>
          <a href="/admin/movimentacoes" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Movimentações</a>
          <a href="/admin/relatorios" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Relatórios</a>
          <a href="/admin/configuracoes" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Configurações</a>
        </nav>
      </div>
      <div className="p-4 border-t border-white/10 flex items-center gap-3 mb-4 md:mb-0">
        <div className="w-9 h-9 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-sm border border-white/20 shrink-0">AG</div>
        <div className="overflow-hidden">
          <p className="text-xs font-bold text-white truncate">Adm. Geral</p>
          <p className="text-[11px] text-primary-200 truncate">admin@belojardim.ifpe.gov.br</p>
        </div>
      </div>
    </aside>
  </>
);

const AdminHeader = ({ onMenuClick }: { onMenuClick: () => void }) => (
  <header className="relative z-20 h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <button 
        type="button"
        onClick={onMenuClick} 
        className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden sm:flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
        <span>Adm Central</span>
        <span>/</span>
        <span className="text-primary-600">Dashboard</span>
      </div>
      <span className="sm:hidden text-slate-800 font-medium">Dashboard</span>
    </div>
    <div className="flex items-center gap-4">
      <div className="relative w-full max-w-[200px] sm:max-w-xs md:w-72">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </span>
        <input 
          type="text" 
          placeholder="Buscar alunos ou carteiras..." 
          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
        />
      </div>
    </div>
  </header>
);

// --- MOCK DATA ---
const recentMovementsData = [
  { id: 1, name: 'Ricardo Oliveira', type: 'ENTRADA', date: '24 Mai 2024', time: '14:25' },
  { id: 2, name: 'Mariana Santos', type: 'SAIDA', date: '24 Mai 2024', time: '14:18' },
  { id: 3, name: 'Carlos Eduardo', type: 'ENTRADA', date: '24 Mai 2024', time: '13:55' },
  { id: 4, name: 'Ana Beatriz Souza', type: 'SAIDA', date: '24 Mai 2024', time: '13:42' },
  { id: 5, name: 'Fernando Costa', type: 'ENTRADA', date: '24 Mai 2024', time: '13:30' },
];

// --- MAIN PAGE ---
export default function DashboardPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden text-slate-900">
      <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        <AdminHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
            
            {/* Welcome Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl -mr-20 -mt-20 z-0"></div>
              
              <div className="relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Bem-vindo ao Painel Administrativo</h2>
                <p className="text-sm md:text-base text-slate-500 max-w-xl">
                  Gerencie identidades estudantis, monitore acessos em tempo real e emita carteiras digitais com segurança.
                </p>
              </div>
              
              <div className="relative z-10 shrink-0 w-full md:w-auto">
                <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl shadow-sm shadow-primary-600/20 transition-all active:scale-[0.98]">
                  <UserPlus className="w-5 h-5" /> Editar Aluno
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Total de Alunos</h3>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-slate-900">256</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">↑ 12% em relação a ontem</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary-50 p-2.5 rounded-xl text-primary-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Movimentações Hoje</h3>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-slate-900">242</span>
                  <span className="text-xs font-medium text-slate-500">Fluxo em tempo real</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Entradas</h3>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-emerald-600">128</span>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">↑ 5%</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-rose-50 p-2.5 rounded-xl text-rose-600">
                    <ArrowDownRight className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Saídas</h3>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold text-rose-600">114</span>
                  <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded-md">↓ 2%</span>
                </div>
              </div>
              
            </div>

            {/* Recent Movements Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 md:p-6 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Movimentações Recentes</h3>
                  <p className="text-xs text-slate-500 mt-1">Últimos registros de acesso nas dependências da universidade.</p>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Nome do Aluno</th>
                      <th className="py-3.5 px-6">Tipo</th>
                      <th className="py-3.5 px-6">Data</th>
                      <th className="py-3.5 px-6">Horário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {recentMovementsData.map((mov) => (
                      <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-6 font-medium text-slate-900 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                            {mov.name.charAt(0)}
                          </div>
                          {mov.name}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${mov.type === 'ENTRADA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                            {mov.type === 'ENTRADA' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-600">{mov.date}</td>
                        <td className="py-3.5 px-6 text-slate-500 font-mono text-xs">{mov.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex justify-center">
                <a href="/admin/movimentacoes" className="text-sm font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1 transition-colors">
                  Ver Tudo <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}