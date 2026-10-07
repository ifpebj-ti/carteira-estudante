'use client';

import { ArrowUpRight, ArrowDownRight, Download, Filter } from 'lucide-react';

export default function MovimentacoesPage() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Título e Ação principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Auditoria de Movimentações</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">Monitore o fluxo de entrada e saída no campus em tempo real.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-colors w-full sm:w-auto">
          <Download className="w-4 h-4" /> Exportar Relatório
        </button>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Movimentos Hoje</p>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-slate-900">1.482</span>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Total</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entradas Hoje</p>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-emerald-600">756</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> Acessos
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Saídas Hoje</p>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-rose-600">726</span>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3" /> Acessos
            </span>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-800">
          <Filter className="w-4 h-4 text-slate-500" />
          <h3 className="font-bold text-sm">Filtros de Busca</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Nome do Aluno</label>
            <input type="text" placeholder="Buscar por nome..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Matrícula</label>
            <input type="text" placeholder="Nº Matrícula" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" />
          </div>
          
          {/* Botão de filtro atualizado e agrupado com o Select */}
          <div className="flex items-end gap-2">
            <div className="w-full">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo de Movimento</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                <option>Todos</option>
                <option>Entrada</option>
                <option>Saída</option>
              </select>
            </div>
            {/* O botão quadrado escuro com o ícone, igual à lista de alunos */}
            <button className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center h-[42px]">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Section com suporte a scroll horizontal no mobile */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Nome do Aluno</th>
                <th className="py-3.5 px-6">Matrícula</th>
                <th className="py-3.5 px-6">Tipo</th>
                <th className="py-3.5 px-6">Data</th>
                <th className="py-3.5 px-6">Horário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-medium text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">RO</div>
                  Ricardo Oliveira Santos
                </td>
                <td className="py-4 px-6 text-slate-500">2024010582</td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Entrada
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500">24/05/2026</td>
                <td className="py-4 px-6 text-slate-500 font-mono text-xs">14:25</td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-6 font-medium text-slate-900 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">MS</div>
                  Mariana Santos Silva
                </td>
                <td className="py-4 px-6 text-slate-500">2023021145</td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                    <ArrowDownRight className="w-3.5 h-3.5" /> Saída
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-500">24/05/2026</td>
                <td className="py-4 px-6 text-slate-500 font-mono text-xs">14:18</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Pagination footer */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs md:text-sm text-slate-500">
          <span>Mostrando <span className="font-medium text-slate-700">1-2</span> de <span className="font-medium text-slate-700">256</span> resultados</span>
          <div className="flex items-center gap-1.5">
            <button className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 text-xs font-medium">Anterior</button>
            <button className="px-3 py-1.5 border border-primary-600 rounded-xl bg-primary-600 text-white font-medium text-xs">1</button>
            <button className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 hidden sm:block text-xs font-medium">2</button>
            <span className="px-1 text-slate-400 hidden sm:block">...</span>
            <button className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 text-xs font-medium">Próximo</button>
          </div>
        </div>
      </div>

    </div>
  );
}