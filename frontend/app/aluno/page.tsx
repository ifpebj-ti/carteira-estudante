'use client';

import { 
  LayoutDashboard, Users, ArrowRightLeft, FileText, Settings, 
  Search, Bell, ChevronDown, Edit, Printer, 
  ArrowUpRight, ArrowDownRight, Clock, ShieldCheck, Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function AlunoDetailsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-primary-900 text-white flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary-500 p-2 rounded-lg">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg leading-tight">Carteira de<br/>Estudante</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-100 hover:bg-primary-800 transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium text-sm">Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary-800 text-white transition-colors">
            <Users className="w-5 h-5" />
            <span className="font-medium text-sm">Alunos</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-100 hover:bg-primary-800 transition-colors">
            <ArrowRightLeft className="w-5 h-5" />
            <span className="font-medium text-sm">Movimentações</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-100 hover:bg-primary-800 transition-colors">
            <FileText className="w-5 h-5" />
            <span className="font-medium text-sm">Relatórios</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-100 hover:bg-primary-800 transition-colors">
            <Settings className="w-5 h-5" />
            <span className="font-medium text-sm">Configurações</span>
          </a>
        </nav>

        <div className="p-6 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-800 flex items-center justify-center font-bold">
              AD
            </div>
            <div>
              <p className="text-sm font-semibold">Adm. Geral</p>
              <p className="text-xs text-primary-300">admin@belojardim.ifpe.gov.br</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="relative w-96">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Buscar alunos ou carteiras..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="relative text-slate-500 hover:text-slate-700">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                A
              </div>
              <span className="text-sm font-medium text-slate-700">Adm Central</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-auto p-8">
          
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">Ricardo Oliveira Santos</h1>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wide">
                    Ativo
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                  <FileText className="w-4 h-4" /> Matrícula 2024010582
                  <span className="mx-2">•</span>
                  <Settings className="w-4 h-4" /> Engenharia de Software
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors">
                <Edit className="w-4 h-4" /> Editar Dados
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm">
                <Printer className="w-4 h-4" /> Imprimir Carteira
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left Column - Data */}
            <div className="xl:col-span-2 space-y-8">
              
              {/* Informações Detalhadas */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-6 text-slate-800">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <h2 className="text-lg font-semibold">Informações Detalhadas</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Users className="w-3.5 h-3.5"/> Nome Completo</p>
                    <p className="font-medium text-slate-900">Ricardo Oliveira Santos</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><LayoutDashboard className="w-3.5 h-3.5"/> Regime Internato</p>
                    <p className="font-medium text-slate-900">Interno</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> Nº de Matrícula</p>
                    <p className="font-medium text-slate-900">2024010582</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Settings className="w-3.5 h-3.5"/> Status da Matrícula</p>
                    <p className="font-medium text-slate-900">Em Andamento</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Settings className="w-3.5 h-3.5"/> Curso</p>
                    <p className="font-medium text-slate-900">Engenharia de Software</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> Modalidade do Curso</p>
                    <p className="font-medium text-slate-900">Superior</p>
                  </div>
                  <div className="pb-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Clock className="w-3.5 h-3.5"/> Idade</p>
                    <p className="font-medium text-slate-900">26</p>
                  </div>
                  <div className="pb-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Users className="w-3.5 h-3.5"/> E-mail Institucional</p>
                    <p className="font-medium text-slate-900">rs1@discente.ifpe.edu.br</p>
                  </div>
                </div>
              </div>

              {/* Histórico */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-slate-800">Histórico de Movimentações</h2>
                  <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-700">Ver Completo &rsaquo;</a>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Movimento</th>
                        <th className="px-4 py-3 font-semibold">Data</th>
                        <th className="px-4 py-3 font-semibold">Horário</th>
                        <th className="px-4 py-3 font-semibold">Operador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                            <ArrowUpRight className="w-4 h-4" /> Entrada
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">24/05/2024</td>
                        <td className="px-4 py-3 text-slate-600">14:25</td>
                        <td className="px-4 py-3 text-slate-500 italic">Sist. Automático</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-rose-500 font-medium">
                            <ArrowDownRight className="w-4 h-4" /> Saída
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">23/05/2024</td>
                        <td className="px-4 py-3 text-slate-600">21:40</td>
                        <td className="px-4 py-3 text-slate-500 italic">Adm. Julia</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                            <ArrowUpRight className="w-4 h-4" /> Entrada
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">23/05/2024</td>
                        <td className="px-4 py-3 text-slate-600">13:10</td>
                        <td className="px-4 py-3 text-slate-500 italic">Sist. Automático</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Acessos Este Mês</p>
                  <div className="flex items-end justify-between mt-auto">
                    <span className="text-3xl font-bold text-slate-900">42</span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">+5%</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Média Permanência</p>
                  <div className="flex items-end justify-between mt-auto">
                    <span className="text-3xl font-bold text-slate-900">4.2h</span>
                    <Clock className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Status Sistema</p>
                  <div className="flex items-center gap-2 mt-auto">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="font-semibold text-slate-900">Sincronizado</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - ID Card & Digital Cert */}
            <div className="space-y-6">
              
              {/* Carteira Box */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Visualização da Carteira</h2>
                    <p className="text-sm text-slate-500 mt-1">Representação visual da credencial digital.</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                    Digital Ativa
                  </span>
                </div>

                {/* Digital Card Design */}
                <div className="w-full max-w-[320px] mx-auto bg-gradient-to-br from-primary-800 to-primary-950 rounded-2xl shadow-xl overflow-hidden relative">
                  {/* Decorative Elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  
                  {/* Card Header */}
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-primary-200" />
                      <div>
                        <p className="text-[10px] text-primary-200 font-bold leading-tight uppercase tracking-wider">Instituto Federal</p>
                        <p className="text-[9px] text-white/70 leading-tight uppercase">Carteira de Estudante Interno</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 rounded">VÁLIDA 2024</span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex gap-4">
                    <div className="w-20 h-24 bg-white/10 rounded-lg shrink-0 overflow-hidden border-2 border-white/20">
                      <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Foto do aluno" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-[10px] text-primary-300 font-semibold uppercase mb-0.5">Nome do Aluno</p>
                      <p className="text-sm font-bold text-white leading-tight mb-2">RICARDO OLIVEIRA SANTOS</p>
                      
                      <p className="text-[10px] text-primary-300 font-semibold uppercase mb-0.5">Curso</p>
                      <p className="text-xs font-semibold text-white/90 leading-tight">Engenharia de Software</p>
                    </div>
                  </div>

                  {/* Card Footer with QR */}
                  <div className="px-5 pb-5 flex items-end justify-between">
                    <div className="bg-white p-1.5 rounded-lg">
                      <QRCodeSVG value="2024010582-ricardo-ativo" size={56} />
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-[9px] text-primary-300 uppercase font-semibold">Matrícula</p>
                        <p className="text-xs text-white font-bold tracking-wider">2024010582</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-primary-300 uppercase font-semibold">Validade</p>
                        <p className="text-xs text-white font-bold tracking-wider">12/2024</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> Baixar Carteira Digital
                </button>
                <p className="text-xs text-center text-slate-500 mt-3">
                  A carteira digital utiliza QR Code criptografado dinâmico para garantir a autenticidade dos acessos.
                </p>
              </div>

              {/* Certificação Digital */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-primary-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary-50 p-2 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Certificação Digital</h3>
                    <p className="text-xs text-slate-500">Última validação: Há 2 horas</p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Emissão original</span>
                    <span className="font-semibold text-slate-900">12/01/2024</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Próxima renovação</span>
                    <span className="font-semibold text-slate-900">15/07/2024</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-slate-500">Nível de Acesso</span>
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">PADRÃO</span>
                  </div>
                </div>

                <button className="w-full py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 transition-colors flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Logs de Segurança
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
