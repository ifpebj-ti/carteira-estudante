"use client";

import { useState, useEffect } from "react";
import { getApiBaseUrl, performLogout } from "@/services/auth";
import { formatVinculoLabel } from "@/services/labels";
import {
  Users,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface Movimentacao {
  id: number;
  tipo: string;
  data_hora: string;
  operador_nome?: string | null;
  pessoa_nome?: string;
  pessoa?: { nome: string; tipo_vinculo?: string | null };
}

export default function DashboardPage() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // --- NOVO ESTADO PARA AS MÉTRICAS ---
  const [metricas, setMetricas] = useState({
    totalAlunos: 0,
    movimentacoesHoje: 0,
    entradasHoje: 0,
    saidasHoje: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchMovimentacoesViaAlunos = async () => {
      try {
        setCarregando(true);

        const apiBaseUrl = getApiBaseUrl();

        // 1. Pega a lista básica de todos os alunos (sem movimentações)
        const resAlunos = await fetch(`${apiBaseUrl}/api/v1/pessoas`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (resAlunos.status === 401) {
          performLogout();
          return;
        }

        if (resAlunos.status === 403) {
          throw new Error("Permissão negada para acessar os dados do painel.");
        }

        if (!resAlunos.ok)
          throw new Error(`Erro ao carregar alunos: ${resAlunos.status}`);

        const dadosAlunos = await resAlunos.json();

        if (isMounted) {
          let listaBasica = [];
          if (Array.isArray(dadosAlunos)) listaBasica = dadosAlunos;
          else if (dadosAlunos.items) listaBasica = dadosAlunos.items;
          else if (dadosAlunos.data) listaBasica = dadosAlunos.data;

          let todasMovimentacoes: Movimentacao[] = [];

          // 2. Faz uma requisição detalhada para CADA aluno para pegar o histórico
          const promessasDetalhes = listaBasica.map(
            async (alunoBasico: { matricula: string }) => {
              try {
                const resDetalhe = await fetch(
                  `${apiBaseUrl}/api/v1/pessoas/${alunoBasico.matricula}`,
                  {
                    credentials: "include",
                    headers: { Accept: "application/json" },
                  }
                );

                if (resDetalhe.ok) {
                  const alunoDetalhado = await resDetalhe.json();

                  if (
                    alunoDetalhado.movimentacoes &&
                    Array.isArray(alunoDetalhado.movimentacoes)
                  ) {
                    const movsDoAluno = alunoDetalhado.movimentacoes.map(
                      (m: Movimentacao) => ({
                        ...m,
                        pessoa: {
                          nome: alunoDetalhado.nome,
                          tipo_vinculo: alunoDetalhado.tipo_vinculo,
                        },
                      })
                    );
                    todasMovimentacoes = [
                      ...todasMovimentacoes,
                      ...movsDoAluno,
                    ];
                  }
                }
              } catch (err) {
                console.error(
                  `Erro ao buscar detalhes do aluno ${alunoBasico.matricula}`,
                  err
                );
              }
            }
          );

          // Espera que todas as requisições detalhadas terminem
          await Promise.all(promessasDetalhes);

          // 3. Ordena da mais recente para a mais antiga e pega apenas 5
          todasMovimentacoes.sort((a, b) => {
            return (
              new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
            );
          });

          // --- CÁLCULO DAS MÉTRICAS REAIS ---
          const totalAlunos = listaBasica.length;

          const hoje = new Date().toDateString();
          let entradas = 0;
          let saidas = 0;

          todasMovimentacoes.forEach((mov) => {
            const dataMovimento = new Date(mov.data_hora).toDateString();
            if (dataMovimento === hoje) {
              if (mov.tipo === "ENTRADA") entradas++;
              if (mov.tipo === "SAIDA") saidas++;
            }
          });

          setMetricas({
            totalAlunos: totalAlunos,
            movimentacoesHoje: entradas + saidas,
            entradasHoje: entradas,
            saidasHoje: saidas,
          });
          // --- FIM DO CÁLCULO ---

          setMovimentacoes(todasMovimentacoes.slice(0, 5));
          setErro(null);
        }
      } catch (error) {
        if (isMounted) {
          setErro(error instanceof Error ? error.message : "Erro desconhecido");
        }
      } finally {
        if (isMounted) {
          setCarregando(false);
        }
      }
    };

    fetchMovimentacoesViaAlunos();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatarData = (dataIso: string) => {
    try {
      return new Date(dataIso).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dataIso;
    }
  };

  const formatarHora = (dataIso: string) => {
    try {
      return new Date(dataIso).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "--:--";
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full blur-3xl -mr-20 -mt-20 z-0"></div>

        <div className="relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
            Bem-vindo ao Painel Administrativo
          </h2>
          <p className="text-sm md:text-base text-slate-500 max-w-xl">
            Gerencie identidades estudantis, monitore acessos em tempo real e
            emita carteiras digitais com segurança.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Total de Alunos
            </h3>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-slate-900">
              {carregando ? "-" : metricas.totalAlunos}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary-50 p-2.5 rounded-xl text-primary-600">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Movimentações Hoje
            </h3>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-slate-900">
              {carregando ? "-" : metricas.movimentacoesHoje}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Entradas
            </h3>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-emerald-600">
              {carregando ? "-" : metricas.entradasHoje}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-rose-50 p-2.5 rounded-xl text-rose-600">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Saídas
            </h3>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-3xl font-bold text-rose-600">
              {carregando ? "-" : metricas.saidasHoje}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-5 md:p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Movimentações Recentes
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Últimos registros de acesso nas dependências da universidade.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Titular</th>
                <th className="py-3.5 px-6">Tipo</th>
                <th className="py-3.5 px-6">Operador</th>
                <th className="py-3.5 px-6">Data</th>
                <th className="py-3.5 px-6">Horário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {erro ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-rose-500">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                    <p className="font-semibold">
                      Erro ao carregar movimentações
                    </p>
                    <p className="text-xs mt-1">{erro}</p>
                  </td>
                </tr>
              ) : carregando ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600 mb-2" />
                    Buscando dados no servidor...
                  </td>
                </tr>
              ) : movimentacoes.length > 0 ? (
                movimentacoes.map((mov) => {
                  const nomeExibicao =
                    mov.pessoa?.nome || mov.pessoa_nome || "Desconhecido";
                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-3.5 px-6 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 uppercase">
                            {nomeExibicao.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {nomeExibicao}
                            </p>
                            {mov.pessoa?.tipo_vinculo && (
                              <p className="text-[11px] font-semibold text-slate-500">
                                {formatVinculoLabel(mov.pessoa.tipo_vinculo)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            mov.tipo === "ENTRADA"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {mov.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-600 text-xs">
                        {mov.operador_nome || "Catraca Automática"}
                      </td>
                      <td className="py-3.5 px-6 text-slate-600">
                        {formatarData(mov.data_hora)}
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 font-mono text-xs">
                        {formatarHora(mov.data_hora)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhuma movimentação registrada recentemente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex justify-center">
          <a
            href="/admin/movimentacoes"
            className="text-sm font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1 transition-colors"
          >
            Ver Tudo <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
