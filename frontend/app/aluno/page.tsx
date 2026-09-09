'use client';

import { 
  FileText, Settings, Edit, Printer, 
  ArrowUpRight, ArrowDownRight, Clock, Users, LayoutDashboard,
  ShieldCheck, Download, Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { useState, useEffect } from 'react';
import { api } from '@/services/api';

// Interface matching AlunoDetailResponse
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

export default function AlunoDetailsPage() {
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Para fins de teste, usamos uma matrícula fixa
    const fetchAluno = async () => {
      try {
        const data = await api<Aluno>('/api/v1/alunos/2024010582');
        setAluno(data);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar dados do aluno');
      } finally {
        setLoading(false);
      }
    };
    fetchAluno();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !aluno) {
    return (
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-rose-500 font-semibold mb-2">{error || 'Aluno não encontrado'}</p>
              <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Header />
        <div className="flex-1 overflow-auto p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                <img src={aluno.foto_url || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-900">{aluno.nome_completo}</h1>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${aluno.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {aluno.status ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                  <FileText className="w-4 h-4" /> Matrícula {aluno.matricula}
                  <span className="mx-2">•</span>
                  <Settings className="w-4 h-4" /> {aluno.curso}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" /> Editar Dados
              </Button>
              <Button className="gap-2">
                <Printer className="w-4 h-4" /> Imprimir Carteira
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-8">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-6 text-slate-800">
                  <FileText className="w-5 h-5 text-slate-500" />
                  <h2 className="text-lg font-semibold">Informações Detalhadas</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Users className="w-3.5 h-3.5"/> Nome Completo</p>
                    <p className="font-medium text-slate-900">{aluno.nome_completo}</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><LayoutDashboard className="w-3.5 h-3.5"/> Regime Internato</p>
                    <p className="font-medium text-slate-900">Interno</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> Nº de Matrícula</p>
                    <p className="font-medium text-slate-900">{aluno.matricula}</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Settings className="w-3.5 h-3.5"/> Status da Matrícula</p>
                    <p className="font-medium text-slate-900">{aluno.status ? 'Em Andamento' : 'Inativo'}</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Settings className="w-3.5 h-3.5"/> Curso</p>
                    <p className="font-medium text-slate-900">{aluno.curso}</p>
                  </div>
                  <div className="border-b border-slate-100 pb-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> Modalidade do Curso</p>
                    <p className="font-medium text-slate-900">{aluno.modalidade || 'Superior'}</p>
                  </div>
                  <div className="pb-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Clock className="w-3.5 h-3.5"/> Idade</p>
                    <p className="font-medium text-slate-900">{aluno.idade || '--'}</p>
                  </div>
                  <div className="pb-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2"><Users className="w-3.5 h-3.5"/> E-mail Institucional</p>
                    <p className="font-medium text-slate-900">{aluno.email || '--'}</p>
                  </div>
                </div>
              </div>

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
                        <th className="px-4 py-3 font-semibold">Data e Horário</th>
                        <th className="px-4 py-3 font-semibold">Operador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {aluno.movimentacoes.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-4 text-center text-slate-500">Nenhuma movimentação registrada</td>
                        </tr>
                      ) : (
                        aluno.movimentacoes.map((mov) => (
                          <tr key={mov.id}>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 font-medium ${mov.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                {mov.tipo === 'ENTRADA' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                {mov.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {new Date(mov.data_hora).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-4 py-3 text-slate-500 italic">{mov.operador_nome}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Acessos Este Mês</p>
                  <div className="flex items-end justify-between mt-auto">
                    <span className="text-3xl font-bold text-slate-900">{aluno.movimentacoes.length}</span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">+0%</span>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Média Permanência</p>
                  <div className="flex items-end justify-between mt-auto">
                    <span className="text-3xl font-bold text-slate-900">--</span>
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

            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Visualização da Carteira</h2>
                    <p className="text-sm text-slate-500 mt-1">Representação visual da credencial digital.</p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${aluno.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {aluno.status ? 'Digital Ativa' : 'Inativa'}
                  </span>
                </div>

                <div className="w-full max-w-[320px] mx-auto bg-gradient-to-br from-primary-800 to-primary-950 rounded-2xl shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  
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

                  <div className="p-5 flex gap-4">
                    <div className="w-20 h-24 bg-white/10 rounded-lg shrink-0 overflow-hidden border-2 border-white/20">
                      <img src={aluno.foto_url || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80"} alt="Foto do aluno" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-[10px] text-primary-300 font-semibold uppercase mb-0.5">Nome do Aluno</p>
                      <p className="text-sm font-bold text-white leading-tight mb-2">{aluno.nome_completo.toUpperCase()}</p>
                      
                      <p className="text-[10px] text-primary-300 font-semibold uppercase mb-0.5">Curso</p>
                      <p className="text-xs font-semibold text-white/90 leading-tight">{aluno.curso}</p>
                    </div>
                  </div>

                  <div className="px-5 pb-5 flex items-end justify-between">
                    <div className="bg-white p-1.5 rounded-lg">
                      <QRCodeSVG value={aluno.qr_code_hash} size={56} />
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-[9px] text-primary-300 uppercase font-semibold">Matrícula</p>
                        <p className="text-xs text-white font-bold tracking-wider">{aluno.matricula}</p>
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

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-primary-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary-50 p-2 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Certificação Digital</h3>
                    <p className="text-xs text-slate-500">Última validação: {new Date(aluno.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Emissão original</span>
                    <span className="font-semibold text-slate-900">{new Date(aluno.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Próxima renovação</span>
                    <span className="font-semibold text-slate-900">--</span>
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