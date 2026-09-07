export default function MovimentacoesPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-primary-900 text-white border-r border-primary-800 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="p-6 border-b border-white/10 flex items-center gap-3">
            <div className="bg-white/10 text-white p-2 rounded-lg font-bold border border-white/20">AD</div>
            <div>
              <h1 className="font-bold text-white text-sm">Carteira de Estudante</h1>
              <p className="text-xs text-primary-200">Campus Belo Jardim</p>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            <a href="/admin/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Dashboard</a>
            <a href="/admin/alunos" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Alunos</a>
            <a href="/admin/movimentacoes" className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/15 text-white text-sm font-medium">Movimentações</a>
            <a href="/admin/relatorios" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Relatórios</a>
            <a href="/admin/configuracoes" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Configurações</a>
          </nav>
        </div>
        <div className="p-4 border-t border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-sm border border-white/20">AG</div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">Adm. Geral</p>
            <p className="text-[11px] text-primary-200 truncate">admin@belojardim.ifpe.gov.br</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Adm Central</span>
            <span>/</span>
            <span className="text-gray-800 font-medium">Movimentações</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-64 hidden sm:block">
              <input type="text" placeholder="Buscar alunos ou carteiras..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Administração / Movimentações</h2>
              <p className="text-sm text-gray-500">Consulte e monitore o fluxo de entrada e saída de estudantes no campus.</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-sm transition-colors flex items-center gap-2 w-fit">
              Exportar Relatório
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Movimentos Hoje</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">1.482</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Entradas (Hoje)</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">756</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Saídas (Hoje)</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">726</p>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 text-sm">Filtros de Busca</h3>
            <p className="text-xs text-gray-400">Refine os resultados da auditoria utilizando os critérios abaixo.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nome do Aluno</label>
                <input type="text" placeholder="Buscar por nome..." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Matrícula</label>
                <input type="text" placeholder="Nº Matricula" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option>Todos</option>
                  <option>Entrada</option>
                  <option>Saída</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button className="bg-gray-800 hover:bg-gray-900 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
                Filtrar
              </button>
            </div>
          </div>

          {/* Table Section */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Nome do Aluno</th>
                    <th className="py-3 px-6">Matrícula</th>
                    <th className="py-3 px-6">Tipo</th>
                    <th className="py-3 px-6">Data</th>
                    <th className="py-3 px-6">Horário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 font-medium text-gray-900">Ricardo Oliveira Santos</td>
                    <td className="py-4 px-6 text-gray-500">2024010582</td>
                    <td className="py-4 px-6"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">Entrada</span></td>
                    <td className="py-4 px-6 text-gray-500">24/05/2024</td>
                    <td className="py-4 px-6 text-gray-500">14:25</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 font-medium text-gray-900">Mariana Santos Silva</td>
                    <td className="py-4 px-6 text-gray-500">2023021145</td>
                    <td className="py-4 px-6"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600">Saída</span></td>
                    <td className="py-4 px-6 text-gray-500">24/05/2024</td>
                    <td className="py-4 px-6 text-gray-500">14:18</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 font-medium text-gray-900">Carlos Eduardo Ferreira</td>
                    <td className="py-4 px-6 text-gray-500">2022818993</td>
                    <td className="py-4 px-6"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">Entrada</span></td>
                    <td className="py-4 px-6 text-gray-500">24/05/2024</td>
                    <td className="py-4 px-6 text-gray-500">13:55</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 font-medium text-gray-900">Ana Beatriz Souza</td>
                    <td className="py-4 px-6 text-gray-500">2024610882</td>
                    <td className="py-4 px-6"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600">Saída</span></td>
                    <td className="py-4 px-6 text-gray-500">24/05/2024</td>
                    <td className="py-4 px-6 text-gray-500">13:42</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="py-4 px-6 font-medium text-gray-900">Fernando Costa Lima</td>
                    <td className="py-4 px-6 text-gray-500">2021626334</td>
                    <td className="py-4 px-6"><span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">Entrada</span></td>
                    <td className="py-4 px-6 text-gray-500">24/05/2024</td>
                    <td className="py-4 px-6 text-gray-500">13:30</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Pagination footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
              <span>Mostrando 1-5 de 256 resultados</span>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1 border border-gray-200 rounded bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-50">Anterior</button>
                <button className="px-3 py-1 border border-blue-600 rounded bg-blue-600 text-white font-medium">1</button>
                <button className="px-3 py-1 border border-gray-200 rounded bg-white text-gray-600 hover:bg-gray-100">2</button>
                <button className="px-3 py-1 border border-gray-200 rounded bg-white text-gray-600 hover:bg-gray-100">3</button>
                <span className="px-2">...</span>
                <button className="px-3 py-1 border border-gray-200 rounded bg-white text-gray-600 hover:bg-gray-100">32</button>
                <button className="px-3 py-1 border border-gray-200 rounded bg-white text-gray-600 hover:bg-gray-100">Próximo</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}