"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  FileText,
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
  LogOut,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

// --- INTERFACES ---
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
  status: boolean;
  qr_code_hash?: string;
  movimentacoes?: Movimentacao[];
}

function formatarCPF(cpf?: string): string {
  if (!cpf) return "--";
  const limpo = cpf.replace(/\D/g, "");
  if (limpo.length !== 11) return cpf;
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default function MobileAlunoPage() {
  const router = useRouter();
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchMeusDados = async () => {
      setCarregando(true);
      setErro("");
      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        // Rota /me reconhece o aluno automaticamente pelo cookie de sessão
        const res = await fetch(`${API_URL}/api/v1/auth/pessoa/me`, {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (res.status === 401 || res.status === 403) {
          router.push("/"); // Volta para o login se o cookie for inválido
          return;
        }

        if (!res.ok) {
          throw new Error("Erro ao carregar sua carteira digital.");
        }

        const data = await res.json();

        if (isMounted) {
          setAluno(data);
        }
      } catch (err) {
        if (isMounted) {
          const errorObject = err as Error;
          setErro(errorObject.message || "Erro de conexão com o servidor.");
        }
      } finally {
        if (isMounted) {
          setCarregando(false);
        }
      }
    };

    fetchMeusDados();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    // Aqui você pode adicionar a chamada para a rota de logout no backend, se existir
    router.push("/");
  };

  if (carregando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-500 bg-slate-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="font-medium text-sm">Carregando credenciais...</p>
      </div>
    );
  }

  if (erro || !aluno) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-rose-200 rounded-2xl p-6 flex flex-col items-center text-center gap-4 shadow-sm w-full max-w-sm">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Erro de Acesso
            </h3>
            <p className="text-sm text-slate-600 mb-4">{erro}</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col space-y-6 max-w-lg mx-auto">
      {/* Cabeçalho Mobile */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden shrink-0">
            <Image
              src={
                aluno.foto_url ||
                "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80"
              }
              alt={aluno.nome}
              fill
              sizes="48px"
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 line-clamp-1">
              {aluno.nome}
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {aluno.matricula}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Carteira Digital Visual */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-900">
            Carteira Digital
          </h2>
          <span
            className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider ${aluno.status ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
          >
            {aluno.status ? "Ativa" : "Inativa"}
          </span>
        </div>

        <div className="w-full bg-gradient-to-br from-primary-800 to-primary-950 rounded-2xl shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>

          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-200" />
            <div>
              <p className="text-[10px] text-primary-200 font-bold leading-tight uppercase tracking-wider">
                Instituto Federal
              </p>
              <p className="text-[9px] text-white/70 leading-tight uppercase">
                Belo Jardim
              </p>
            </div>
          </div>

          <div className="p-5 flex gap-4">
            <div className="relative w-16 h-20 bg-white/10 rounded-lg shrink-0 overflow-hidden border border-white/20">
              <Image
                src={
                  aluno.foto_url ||
                  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80"
                }
                alt="Foto do aluno"
                fill
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-[10px] text-primary-300 font-semibold uppercase mb-0.5">
                Estudante
              </p>
              <p className="text-sm font-bold text-white leading-tight mb-2 line-clamp-2">
                {aluno.nome.toUpperCase()}
              </p>
              <p className="text-[10px] text-primary-300 font-semibold uppercase mb-0.5">
                Curso
              </p>
              <p className="text-[11px] font-semibold text-white/90 leading-tight line-clamp-1">
                {aluno.curso || "Não informado"}
              </p>
            </div>
          </div>

          <div className="px-5 pb-5 flex items-end justify-between">
            <div className="bg-white p-1.5 rounded-lg shrink-0 shadow-sm">
              <QRCodeSVG
                value={aluno.qr_code_hash || aluno.matricula}
                size={50}
              />
            </div>
            <div className="text-right">
              <p className="text-[9px] text-primary-300 uppercase font-semibold">
                Matrícula
              </p>
              <p className="text-xs text-white font-bold font-mono tracking-wider">
                {aluno.matricula}
              </p>
            </div>
          </div>
        </div>

        <button className="w-full mt-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
          <Download className="w-4 h-4" /> Salvar Offline
        </button>
      </div>

      {/* Informações Detalhadas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" /> Meus Dados
        </h2>

        <div className="space-y-4">
          <div className="flex flex-col border-b border-slate-100 pb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> CPF
            </span>
            <span className="text-sm font-medium text-slate-900 font-mono mt-0.5">
              {formatarCPF(aluno.cpf)}
            </span>
          </div>
          <div className="flex flex-col border-b border-slate-100 pb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" /> Modalidade
            </span>
            <span className="text-sm font-medium text-slate-900 mt-0.5">
              {aluno.modalidade || "Presencial"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> E-mail Institucional
            </span>
            <span className="text-sm font-medium text-slate-900 mt-0.5 break-all">
              {aluno.email || "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Histórico de Acessos Recentes */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" /> Acessos Recentes
        </h2>

        <div className="space-y-3">
          {!aluno.movimentacoes || aluno.movimentacoes.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">
              Nenhum acesso registrado.
            </p>
          ) : (
            aluno.movimentacoes.slice(0, 5).map((mov) => (
              <div
                key={mov.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${mov.tipo === "ENTRADA" ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}
                  >
                    {mov.tipo === "ENTRADA" ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900">
                      {mov.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {mov.operador_nome || "Catraca"}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-600">
                  {new Date(mov.data_hora).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
