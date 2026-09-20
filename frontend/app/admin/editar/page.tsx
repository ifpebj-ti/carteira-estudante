'use client';

import { useState } from 'react';
import { 
  Menu, X, Search, Camera, Trash2, Save, AlertCircle, 
  ShieldCheck, Smartphone, CheckCircle, Image as ImageIcon
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
          <button onClick={onClose} className="md:hidden p-1 hover:bg-white/10 rounded-lg text-primary-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          <a href="/admin/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-colors">Dashboard</a>
          {/* Aba 'Alunos' em destaque */}
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
  <header className="relative z-20 h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <button 
        type="button"
        onClick={onMenuClick} 
        className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden sm:flex items-center gap-2">
        <span>Adm Central</span>
        <span>/</span>
        <span className="text-slate-800 font-medium">Editar Aluno</span>
      </div>
      <span className="sm:hidden text-slate-800 font-medium">Editar Aluno</span>
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

// --- PÁGINA PRINCIPAL ---
export default function EditStudentPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden text-slate-900">
      <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        <AdminHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
            
            {/* Header da Página */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Modificar Informações do Aluno</h2>
              <p className="text-sm text-slate-500 mt-1">Edite as informações acadêmicas e pessoais do aluno cadastrado.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              
              {/* Coluna Esquerda: Foto */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-slate-400" /> Foto do Aluno
                  </h3>
                  
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-40 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden mb-4 relative group">
                      <img 
                        src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200" 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    <div className="bg-blue-50 text-blue-800 text-[11px] md:text-xs p-3 rounded-lg flex gap-2.5 mb-5 w-full">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                      <p>Esta imagem será impressa na carteira de estudante. Utilize fotos com fundo neutro e boa iluminação para garantir a legibilidade.</p>
                    </div>

                    <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                      <Camera className="w-4 h-4" /> Capturar via Webcam
                    </button>
                  </div>
                </div>

                {/* Cards de Dicas do Sistema (Baseado no PDF) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3 shadow-sm">
                    <div className="bg-emerald-50 p-2 rounded-lg h-fit text-emerald-600"><CheckCircle className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Confirmação de Alterações</h4>
                      <p className="text-xs text-slate-500 mt-1">As alterações serão aplicadas imediatamente após a confirmação.</p>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3 shadow-sm">
                    <div className="bg-primary-50 p-2 rounded-lg h-fit text-primary-600"><Smartphone className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Carteira Digital</h4>
                      <p className="text-xs text-slate-500 mt-1">Disponível imediatamente após aprovação no app do aluno.</p>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3 shadow-sm">
                    <div className="bg-amber-50 p-2 rounded-lg h-fit text-amber-600"><ShieldCheck className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Segurança</h4>
                      <p className="text-xs text-slate-500 mt-1">Dados protegidos por criptografia de ponta a ponta.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna Central/Direita: Formulário */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8 flex flex-col">
                <h3 className="text-base font-bold text-slate-800 mb-2">Editar Informações</h3>
                <p className="text-xs text-slate-500 mb-6">Preencha todos os campos obrigatórios identificados.</p>

                <form className="space-y-5 flex-1">
                  
                  {/* Grid de Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Nome Completo</label>
                      <input 
                        type="text" 
                        defaultValue="Ricardo Oliveira Santos"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Matrícula</label>
                      <input 
                        type="text" 
                        defaultValue="2024010582"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">E-mail Institucional</label>
                      <input 
                        type="email" 
                        defaultValue="rs1@discente.ifpe.edu.br"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Curso</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                        <option>Engenharia de Software</option>
                        <option>Sistemas para Internet</option>
                        <option>Informática para Internet</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Idade</label>
                        <input 
                          type="number" 
                          defaultValue="26"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Regime</label>
                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                          <option>Interno</option>
                          <option>Externo</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Status da Matrícula</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                        <option>Em Andamento</option>
                        <option>Trancada</option>
                        <option>Concluída</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Modalidade do Curso</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500">
                        <option>Técnico</option>
                        <option>Subsequente</option>
                        <option>Integrado</option>
                        <option>Superior</option>
                      </select>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-200 py-2 mt-6"></div>

                  {/* Ações do Formulário */}
                  <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-auto">
                    <button type="button" className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center justify-center gap-2">
                      <Trash2 className="w-4 h-4" /> Limpar Campos
                    </button>
                    <button type="button" className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-colors text-center">
                      Cancelar
                    </button>
                    <button type="button" className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-md shadow-primary-600/20 flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" /> Salvar Alterações
                    </button>
                  </div>

                </form>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}