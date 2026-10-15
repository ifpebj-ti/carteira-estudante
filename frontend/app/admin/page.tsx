'use client';

import { 
  Users, Activity, ArrowUpRight, ArrowDownRight, 
  UserPlus, ChevronRight 
} from 'lucide-react';

// --- MAIN PAGE ---
export default function DashboardPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      
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
            <span className="text-3xl font-bold text-slate-900">x</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">↑ x1% em relação a ontem</span>
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
            <span className="text-3xl font-bold text-slate-900">y</span>
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
            <span className="text-3xl font-bold text-emerald-600">z</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">↑ z1%</span>
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
            <span className="text-3xl font-bold text-rose-600">w</span>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded-md">↓ w1%</span>
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
              {/* Dados */}
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
  );
}