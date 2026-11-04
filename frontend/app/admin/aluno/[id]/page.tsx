"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  FileText,
  Settings,
  Edit,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Users,
  LayoutDashboard,
  ShieldCheck,
  Download,
  Loader2,
  AlertCircle,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

// --- INTERFACES ALINHADAS COM O BACKEND ---
interface Movimentacao {
  id: number;
  tipo: string;
  data_hora: string;
  operador_nome: string;
}

interface Aluno {
  id: number | string;
  matricula: string;
  nome: string;
  cpf?: string;
  curso?: string;
  modalidade?: string;
  status_matricula?: string;
  data_nascimento?: string;
  email?: string;
  foto_url?: string;
  status: boolean; // true para Ativo/Liberado, false para Inativo/Suspenso
  qr_code_hash?: string;
  created_at?: string;
  movimentacoes?: Movimentacao[];
}

// Máscara utilitária para CPF (XXX.XXX.XXX-XX)
function formatarCPF(cpf?: string): string {
  if (!cpf) return "--";
  const limpo = cpf.replace(/\D/g, "");
  if (limpo.length !== 11) return cpf;
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default function AlunoDetailsPage() {
  const params = useParams();
  // O Next.js passa o nome da pasta [id] para os params, mas sabemos que é a matrícula
  const matricula = params?.id as string;

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let isMounted = true;
    if (!matricula) return;

    const fetchAluno = async () => {
      setCarregando(true);
      setErro("");
      try {
        const apiBaseUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const token = localStorage.getItem("token");
        const res = await fetch(`${apiBaseUrl}/api/v1/pessoas/${matricula}`, {
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          throw new Error(
            `Erro na requisição ao backend: status ${res.status}`
          );
        }

        const data = await res.json();

        if (isMounted) {
          setAluno(data);
        }
      } catch (err) {
        if (isMounted) {
          const errorObject = err as Error;
          setErro(
            errorObject.message ||
              "Erro ao carregar os dados do aluno no servidor."
          );
        }
      } finally {
        if (isMounted) {
          setCarregando(false);
        }
      }
    };

    fetchAluno();

    return () => {
      isMounted = false;
    };
  }, [matricula]);

  if (carregando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="font-medium text-sm">Carregando dados do estudante...</p>
      </div>
    );
  }

  if (erro || !aluno) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Erro ao carregar perfil
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto mb-4">
              {erro ||
                "Não foi possível carregar os dados. Verifique se a API está online ou se a matrícula informada existe."}
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/alunos"
              className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Voltar à Lista
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/alunos"
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors hidden sm:block"
            title="Voltar para a lista"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="relative w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden shrink-0 z-0">
            <Image
              src={
                aluno.foto_url ||
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80"
              }
              alt={aluno.nome}
              fill
              sizes="(max-width: 768px) 56px, 64px"
              className="object-cover"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">
                {aluno.nome}
              </h1>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] md:text-xs font-semibold uppercase tracking-wide ${
                  aluno.status
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-rose-100 text-rose-700 border border-rose-200"
                }`}
              >
                {aluno.status ? "Ativo / Liberado" : "Inativo / Suspenso"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs md:text-sm text-slate-500">
              <span className="flex items-center gap-1 font-mono">
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />{" "}
                {aluno.matricula}
              </span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1">
                <Settings className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400" />{" "}
                {aluno.curso || "Curso não informado"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Link
            href={`/admin/editar/${aluno.matricula}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold justify-center transition-colors shadow-sm"
          >
            <Edit className="w-4 h-4" /> Editar Perfil
          </Link>
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold justify-center transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" /> Imprimir Carteira
          </button>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        <div className="xl:col-span-2 space-y-6 md:space-y-8">
          {/* Informações Detalhadas */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8">
            <div className="flex items-center gap-2 mb-6 text-slate-800">
              <FileText className="w-5 h-5 text-slate-500" />
              <h2 className="text-base md:text-lg font-bold">
                Informações Detalhadas
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 md:gap-y-6">
              <div className="border-b border-slate-100 pb-3">
                <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> Nome Completo
                </p>
                <p className="text-sm md:text-base font-medium text-slate-900">
                  {aluno.nome}
                </p>
              </div>

              <div className="border-b border-slate-100 pb-3">
                <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" /> CPF
                </p>
                <p className="text-sm md:text-base font-medium text-slate-900 font-mono">
                  {formatarCPF(aluno.cpf)}
                </p>
              </div>

              <div className="border-b border-slate-100 pb-3">
                <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> Nº de Matrícula
                </p>
                <p className="text-sm md:text-base font-medium text-slate-900 font-mono">
                  {aluno.matricula}
                </p>
              </div>

              <div className="border-b border-slate-100 pb-3">
                <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" /> Status da Matrícula
                </p>
                <p className="text-sm md:text-base font-medium text-slate-900">
                  {aluno.status_matricula ||
                    (aluno.status ? "Ativo" : "Inativo")}
                </p>
              </div>

              <div className="border-b border-slate-100 pb-3 sm:pb-0 sm:border-0">
                <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <LayoutDashboard className="w-3.5 h-3.5" /> Curso / Modalidade
                </p>
                <p className="text-sm md:text-base font-medium text-slate-900">
                  {aluno.curso || "Não informado"}
                  {aluno.modalidade ? ` (${aluno.modalidade})` : ""}
                </p>
              </div>

              <div>
                <p className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" /> E-mail Institucional
                </p>
                <p className="text-sm md:text-base font-medium text-slate-900 break-all">
                  {aluno.email || "--"}
                </p>
              </div>
            </div>
          </div>

          {/* Histórico de Movimentações */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-base md:text-lg font-bold text-slate-800">
                Histórico de Movimentações
              </h2>
              <button className="text-xs md:text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors">
                Ver Completo &rsaquo;
              </button>
            </div>

            <div className="-mx-5 md:mx-0 overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[500px]">
                <thead className="text-[11px] md:text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Movimento</th>
                    <th className="px-5 py-3 font-semibold">Data e Horário</th>
                    <th className="px-5 py-3 font-semibold">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!aluno.movimentacoes || aluno.movimentacoes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-8 text-center text-slate-500"
                      >
                        Nenhuma movimentação registrada para este aluno.
                      </td>
                    </tr>
                  ) : (
                    aluno.movimentacoes.map((mov) => (
                      <tr
                        key={mov.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 font-medium ${
                              mov.tipo === "ENTRADA"
                                ? "text-emerald-600"
                                : "text-rose-500"
                            }`}
                          >
                            {mov.tipo === "ENTRADA" ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownRight className="w-4 h-4" />
                            )}
                            {mov.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 text-sm font-mono">
                          {new Date(mov.data_hora).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-5 py-4 text-slate-500 italic text-sm truncate max-w-[120px]">
                          {mov.operador_nome || "Catraca Automática"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Acessos Registrados
              </p>
              <div className="flex items-end justify-between mt-auto">
                <span className="text-3xl font-bold text-slate-900">
                  {aluno.movimentacoes?.length || 0}
                </span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                  Ativo
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Média Permanência
              </p>
              <div className="flex items-end justify-between mt-auto">
                <span className="text-3xl font-bold text-slate-900">--</span>
                <Clock className="w-5 h-5 text-slate-400" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col sm:col-span-2 md:col-span-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Status no Sistema
              </p>
              <div className="flex items-center gap-2 mt-auto">
                <div
                  className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                    aluno.status ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                ></div>
                <span className="font-semibold text-slate-900">
                  {aluno.status ? "Sincronizado" : "Bloqueado"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Carteira Digital e Certificação */}
        <div className="space-y-6">
          {/* Visualização da Carteira Digital */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Carteira Digital
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Representação visual da credencial.
                </p>
              </div>
              <span
                className={`w-fit px-2.5 py-1 text-xs font-bold rounded-full ${
                  aluno.status
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {aluno.status ? "Digital Ativa" : "Inativa"}
              </span>
            </div>

            {/* Cartão de Identificação Visual */}
            <div className="w-full max-w-[320px] mx-auto bg-gradient-to-br from-primary-800 to-primary-950 rounded-2xl shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>

              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-primary-200" />
                  <div>
                    <p className="text-[10px] text-primary-200 font-bold leading-tight uppercase tracking-wider">
                      Instituto Federal
                    </p>
                    <p className="text-[9px] text-white/70 leading-tight uppercase">
                      Carteira de Estudante Digital
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 rounded">
                  VÁLIDA
                </span>
              </div>

              <div className="p-5 flex gap-4">
                <div className="relative w-20 h-24 bg-white/10 rounded-lg shrink-0 overflow-hidden border-2 border-white/20 z-0">
                  <Image
                    src={
                      aluno.foto_url ||
                      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80"
                    }
                    alt="Foto do aluno"
                    fill
                    sizes="(max-width: 768px) 64px, 80px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[10px] text-primary-300 font-semibold uppercase mb-0.5">
                    Nome do Aluno
                  </p>
                  <p className="text-sm font-bold text-white leading-tight mb-2 line-clamp-2">
                    {aluno.nome.toUpperCase()}
                  </p>

                  <p className="text-[10px] text-primary-300 font-semibold uppercase mb-0.5">
                    Curso
                  </p>
                  <p className="text-xs font-semibold text-white/90 leading-tight line-clamp-1">
                    {aluno.curso || "Não informado"}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 flex items-end justify-between">
                <div className="bg-white p-1.5 rounded-lg shrink-0">
                  <QRCodeSVG
                    value={aluno.qr_code_hash || aluno.matricula || "sem-hash"}
                    size={56}
                  />
                </div>
                <div className="flex gap-4 text-right">
                  <div>
                    <p className="text-[9px] text-primary-300 uppercase font-semibold">
                      Matrícula
                    </p>
                    <p className="text-xs text-white font-bold tracking-wider font-mono">
                      {aluno.matricula}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button className="w-full mt-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm">
              <Download className="w-4 h-4" /> Baixar Carteira
            </button>
          </div>

          {/* Certificação Digital / Logs */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 border-l-4 border-l-primary-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary-50 p-2.5 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  Certificação Digital
                </h3>
                <p className="text-xs text-slate-500">
                  Status de validação em tempo real
                </p>
              </div>
            </div>
            <button className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <ShieldCheck className="w-4 h-4" /> Ver Logs de Segurança
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
