'use client';

import { 
  FileText, Settings, Edit, Printer, 
  ArrowUpRight, ArrowDownRight, Clock, Users, LayoutDashboard,
  ShieldCheck, Download, Loader2, Search, Menu, X, AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';

// --- INTERFACES ---
interface Movimentacao {
  id: number;
  tipo: string;
  data_hora: string;
  operador_nome: string;
}

interface Aluno {
  id: number;
  matricula: string;
  nome_completo: string;
  curso: string;
  modalidade: string;
  idade: number;
  email: string;
  foto_url: string;
  status: boolean;
  qr_code_hash: string;
  created_at: string;
  movimentacoes: Movimentacao[];
}

// --- COMPONENTES DE LAYOUT RESPONSIVOS ---
const AdminSidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <>
    {/* Overlay escuro para mobile */}
    {isOpen && (
      <div 
        className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity" 
        onClick={onClose} 
      />
    )}
    
    {/* Sidebar - h-full garante que ela preencha 100% da altura travada do layout pai */}
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
          {/* Botão fechar apenas no mobile */}
          <button onClick={onClose} className="md:hidden p-1 hover:bg-white/10 rounded-lg text-primary-200">
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
          <p className="text-[11px] text-primary-200 truncate">admin@belojardim.ifpe.gov.br</p>
        </div>
      </div>
    </aside>
  </>
);

const AdminHeader = ({ onMenuClick }: { onMenuClick: () => void }) => (
  <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg">
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden sm:flex items-center gap-2">
        <span>Adm Central</span>
        <span>/</span>
        <span className="text-slate-800 font-medium">Detalhes do Aluno</span>
      </div>
      <span className="sm:hidden text-slate-800 font-medium">Detalhes do Aluno</span>
    </div>
    <div className="flex items-center gap-4">
      <div className="relative w-full max-w-[200px] sm:max-w-xs md:w-72">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </span>
        <input 
          type="text" 
          placeholder="Buscar alunos..." 
          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
        />
      </div>
    </div>
  </header>
);

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    // h-screen e overflow-hidden forçam a tela a não rolar globalmente
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden">
      <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        <AdminHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        {/* Aqui é onde a rolagem realmente acontece agora */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

// --- PÁGINA PRINCIPAL ---
export default function AlunoDetailsPage() {
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAluno = async () => {
      try {
        const data = await api<Aluno>('/api/v1/alunos/2024010582');
        setAluno(data);
      } catch (error) {
        const err = error as Error;
        setError(err.message || 'Erro ao carregar dados do aluno');
      } finally {
        setLoading(false);
      }
    };
    fetchAluno();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex h-full items-center justify-center p-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !aluno) {
    return (
      <AdminLayout>
        <div className="flex-1 flex h-full flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-900 mb-2">Erro de Conexão</h2>
            <p className="text-sm text-slate-500 mb-6">{error || 'Não foi possível carregar os dados. Verifique se a API está online.'}</p>
            <Button onClick={() => window.location.reload()} fullWidth>
              Tentar Novamente
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Scrollable Page Content */}
      <div className="p-4 md:p-8">
        
        {/* Page Header - Responsivo */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden shrink-0">
              <img src={aluno.foto_url || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900">{aluno.nome_completo}</h1>
                <span className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold uppercase tracking-wide ${aluno.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {aluno.status ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs md:text-sm text-slate-500">
                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 md:w-4 md:h-4" /> {aluno.matricula}</span>
                <span className="hidden md:inline">•</span>
                <span className="flex items-center gap-1"><Settings className="w-3.5 h-3.5 md:w-4 md:h-4" /> {aluno.curso}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" className="gap-2 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 justify-center">
              <Edit className="w-4 h-4" /> Editar
            </Button>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white justify-center">
              <Printer className="w-4 h-4" /> Imprimir Carteira
            </Button>
          </div>
        </div>

        {/* Grids responsivos */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
          <div className="xl:col-span-2 space-y-6 md:space-y-8">
            
            {/* Informações */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-6">
              <div className="flex items-center gap-2 mb-6 text-slate-800">
                <FileText className="w-5 h-5 text-slate-500" />
                <h2 className="text-base md:text-lg font-semibold">Informações Detalhadas</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 md:gap-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Users className="w-3.5 h-3.5"/> Nome Completo</p>
                  <p className="text-sm md:text-base font-medium text-slate-900">{aluno.nome_completo}</p>
                </div>
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><LayoutDashboard className="w-3.5 h-3.5"/> Regime Internato</p>
                  <p className="text-sm md:text-base font-medium text-slate-900">Interno</p>
                </div>
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> Nº de Matrícula</p>
                  <p className="text-sm md:text-base font-medium text-slate-900">{aluno.matricula}</p>
                </div>
                <div className="border-b border-slate-100 pb-3">
                  <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Settings className="w-3.5 h-3.5"/> Status da Matrícula</p>
                  <p className="text-sm md:text-base font-medium text-slate-900">{aluno.status ? 'Em Andamento' : 'Inativo'}</p>
                </div>
                <div className="border-b border-slate-100 pb-3 sm:pb-0 sm:border-0">
                  <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Settings className="w-3.5 h-3.5"/> Curso</p>
                  <p className="text-sm md:text-base font-medium text-slate-900">{aluno.curso}</p>
                </div>
                <div>
                  <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Users className="w-3.5 h-3.5"/> E-mail Institucional</p>
                  <p className="text-sm md:text-base font-medium text-slate-900 break-all">{aluno.email || '--'}</p>
                </div>
              </div>
            </div>

            {/* Histórico */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-6">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-semibold text-slate-800">Histórico de Movimentações</h2>
                <a href="#" className="text-xs md:text-sm font-medium text-primary-600 hover:text-primary-700">Ver Completo &rsaquo;</a>
              </div>
              
              <div className="-mx-5 md:mx-0 overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[500px]">
                  <thead className="text-[11px] md:text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                    <tr>
                      <th className="px-4 md:px-5 py-3 font-semibold">Movimento</th>
                      <th className="px-4 md:px-5 py-3 font-semibold">Data e Horário</th>
                      <th className="px-4 md:px-5 py-3 font-semibold">Operador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!aluno.movimentacoes || aluno.movimentacoes.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-6 text-center text-slate-500">Nenhuma movimentação registrada</td>
                      </tr>
                    ) : (
                      aluno.movimentacoes.map((mov) => (
                        <tr key={mov.id}>
                          <td className="px-4 md:px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 font-medium ${mov.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-500'}`}>
                              {mov.tipo === 'ENTRADA' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              {mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td className="px-4 md:px-5 py-3 text-slate-600 text-xs md:text-sm">
                            {new Date(mov.data_hora).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 md:px-5 py-3 text-slate-500 italic text-xs md:text-sm truncate max-w-[120px]">{mov.operador_nome}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stats em Grid adaptativo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 flex flex-col">
                <p className="text-[11px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Acessos Este Mês</p>
                <div className="flex items-end justify-between mt-auto">
                  <span className="text-2xl md:text-3xl font-bold text-slate-900">{aluno.movimentacoes?.length || 0}</span>
                  <span className="text-[10px] md:text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">+0%</span>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 flex flex-col">
                <p className="text-[11px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Média Permanência</p>
                <div className="flex items-end justify-between mt-auto">
                  <span className="text-2xl md:text-3xl font-bold text-slate-900">--</span>
                  <Clock className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 md:p-5 flex flex-col sm:col-span-2 md:col-span-1">
                <p className="text-[11px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status Sistema</p>
                <div className="flex items-center gap-2 mt-auto">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold text-slate-900">Sincronizado</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Visualização da Carteira */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-6 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
                <div>
                  <h2 className="text-base md:text-lg font-semibold text-slate-900">Visualização da Carteira</h2>
                  <p className="text-xs md:text-sm text-slate-500 mt-1">Representação visual da credencial digital.</p>
                </div>
                <span className={`w-fit px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-full ${aluno.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {aluno.status ? 'Digital Ativa' : 'Inativa'}
                </span>
              </div>

              {/* Box da credencial otimizado */}
              <div className="w-full max-w-[320px] mx-auto bg-gradient-to-br from-primary-800 to-primary-950 rounded-2xl shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-primary-200" />
                    <div>
                      <p className="text-[9px] md:text-[10px] text-primary-200 font-bold leading-tight uppercase tracking-wider">Instituto Federal</p>
                      <p className="text-[8px] md:text-[9px] text-white/70 leading-tight uppercase">Carteira de Estudante Interno</p>
                    </div>
                  </div>
                  <span className="text-[8px] md:text-[9px] font-bold text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 rounded">VÁLIDA 2024</span>
                </div>

                <div className="p-4 md:p-5 flex gap-3 md:gap-4">
                  <div className="w-16 h-20 md:w-20 md:h-24 bg-white/10 rounded-lg shrink-0 overflow-hidden border-2 border-white/20">
                    <img src={aluno.foto_url || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"} alt="Foto do aluno" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-[9px] md:text-[10px] text-primary-300 font-semibold uppercase mb-0.5">Nome do Aluno</p>
                    <p className="text-xs md:text-sm font-bold text-white leading-tight mb-2 line-clamp-2">{aluno.nome_completo.toUpperCase()}</p>
                    
                    <p className="text-[9px] md:text-[10px] text-primary-300 font-semibold uppercase mb-0.5">Curso</p>
                    <p className="text-[11px] md:text-xs font-semibold text-white/90 leading-tight line-clamp-1">{aluno.curso}</p>
                  </div>
                </div>

                <div className="px-4 pb-4 md:px-5 md:pb-5 flex items-end justify-between">
                  <div className="bg-white p-1.5 rounded-lg shrink-0">
                    <QRCodeSVG value={aluno.qr_code_hash || "sem-hash"} size={48} className="md:w-14 md:h-14" />
                  </div>
                  <div className="flex gap-3 md:gap-4 text-right">
                    <div>
                      <p className="text-[8px] md:text-[9px] text-primary-300 uppercase font-semibold">Matrícula</p>
                      <p className="text-[11px] md:text-xs text-white font-bold tracking-wider">{aluno.matricula}</p>
                    </div>
                    <div>
                      <p className="text-[8px] md:text-[9px] text-primary-300 uppercase font-semibold">Validade</p>
                      <p className="text-[11px] md:text-xs text-white font-bold tracking-wider">12/2024</p>
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full mt-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                <Download className="w-4 h-4" /> Baixar Carteira
              </button>
            </div>
            
            {/* Certificação Digital */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 md:p-6 border-l-4 border-l-primary-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-primary-50 p-2 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm md:text-base">Certificação Digital</h3>
                  <p className="text-[11px] md:text-xs text-slate-500">Última validação: Hoje</p>
                </div>
              </div>
              <button className="w-full py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs md:text-sm font-medium text-slate-700 transition-colors flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Logs de Segurança
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}