'use client';

import { useState } from 'react';
import { 
  Menu, X, Search, Filter, Download, Upload, 
  Edit, CheckCircle, Clock, AlertTriangle, User 
} from 'lucide-react';

// --- COMPONENTES DE LAYOUT ---
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
          <a href="/admin/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Dashboard</a>
          <a href="/admin/alunos" className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/15 text-white text-sm font-medium">Alunos</a>
          <a href="/admin/movimentacoes" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Movimentações</a>
          <a href="/admin/relatorios" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Relatórios</a>
          <a href="/admin/configuracoes" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Configurações</a>
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
        <span>Administração</span>
        <span>/</span>
        <span className="text-primary-600">Gestão de Alunos</span>
      </div>
      <span className="sm:hidden text-slate-800 font-medium">Gestão de Alunos</span>
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

// --- DADOS MOCKADOS ---
const studentsData = [
  { id: 1, nome: 'Gustavo Nogueira de Araújo', curso: 'Engenharia de Software', matricula: '2024102457', email: 'gna1@discente.ifpe.edu.br', status: 'Ativo' },
  { id: 2, nome: 'Maria Oliveira', curso: 'Administração', matricula: '2023102458', email: 'mo1@discente.ifpe.edu.br', status: 'Ativo' },
  { id: 3, nome: 'Pedro Santos', curso: 'Sistemas de Informação', matricula: '2023102459', email: 'ps1@discente.ifpe.edu.br', status: 'Suspenso' },
  { id: 4, nome: 'Ana Beatriz Souza', curso: 'Engenharia Civil', matricula: '2023102460', email: 'abs1@discente.ifpe.edu.br', status: 'Inativo' },
  { id: 5, nome: 'Ricardo Oliveira Santos', curso: 'Engenharia de Software', matricula: '2024010582', email: 'rs1@discente.ifpe.edu.br', status: 'Ativo' },
];

export default function StudentListPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Ativo': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Suspenso': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Inativo': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden text-slate-900">
      <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        <AdminHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Cabeçalho da Página e Ações */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Lista de Alunos</h2>
                <p className="text-sm text-slate-500 mt-1">Gerencie o cadastro, status e emissão de carteiras dos estudantes matriculados.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
                  <Download className="w-4 h-4" /> Exportar Alunos
                </button>
                <button className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-primary-600/20">
                  <Upload className="w-4 h-4" /> Importar Alunos
                </button>
              </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Validação Ativa</h3>
                  <p className="text-xs text-slate-500 mt-1">92% dos alunos possuem carteiras válidas.</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                <div className="bg-amber-50 p-3 rounded-xl text-amber-600 shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Renovações Pendentes</h3>
                  <p className="text-xs text-slate-500 mt-1">14 alunos aguardando atualização de dados.</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                <div className="bg-rose-50 p-3 rounded-xl text-rose-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Inconsistências</h3>
                  <p className="text-xs text-slate-500 mt-1">2 registros com documentos expirados identificados.</p>
                </div>
              </div>
            </div>

            {/* Área de Filtros */}
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Nome, matrícula ou email..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
                  />
                </div>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                  <option value="">Curso</option>
                  <option value="ec">Engenharia de Computação</option>
                  <option value="esw">Engenharia de Software</option>
                </select>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                  <option value="">Status</option>
                  <option value="ativo">Ativo</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="inativo">Inativo</option>
                </select>
                <div className="flex gap-2">
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
                    <option value="">Turma</option>
                    <option value="a">Turma A</option>
                    <option value="b">Turma B</option>
                  </select>
                  <button className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center">
                    <Filter className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de Alunos */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-6 w-16">Foto</th>
                      <th className="py-4 px-6">Nome do Aluno</th>
                      <th className="py-4 px-6">Curso</th>
                      <th className="py-4 px-6">Matrícula</th>
                      <th className="py-4 px-6">E-mail Institucional</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {studentsData.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-3 px-6">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                        </td>
                        <td className="py-3 px-6 font-medium text-slate-900">{student.nome}</td>
                        <td className="py-3 px-6 text-slate-600">{student.curso}</td>
                        <td className="py-3 px-6 text-slate-500 font-mono text-xs">{student.matricula}</td>
                        <td className="py-3 px-6 text-slate-600 font-medium">{student.email}</td>
                        <td className="py-3 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusStyle(student.status)}`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <button className="text-primary-600 hover:text-primary-800 p-2 rounded-lg hover:bg-primary-50 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold">
                            <Edit className="w-4 h-4" /> Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Paginação */}
              <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
                <span>Mostrando <span className="font-medium text-slate-900">1-5</span> de <span className="font-medium text-slate-900">256</span> alunos</span>
                <div className="flex items-center gap-1.5">
                  <button className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 font-medium">Anterior</button>
                  <button className="px-3 py-1.5 border border-primary-600 rounded-xl bg-primary-600 text-white font-medium shadow-sm shadow-primary-600/20">1</button>
                  <button className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-100 transition-colors font-medium">2</button>
                  <button className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-100 transition-colors font-medium">3</button>
                  <button className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-100 transition-colors font-medium">Próximo</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}