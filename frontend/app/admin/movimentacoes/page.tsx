"use client";

import { useState, useEffect } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  Loader2,
  AlertCircle,
} from "lucide-react";

// --- INTERFACES ---
interface Movimentacao {
  id: number;
  tipo: string;
  data_hora: string;
  pessoa: { nome: string; matricula: string };
}

export default function MovimentacoesPage() {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // --- ESTADOS PARA OS FILTROS ---
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroMatricula, setFiltroMatricula] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("Todos");

  // --- ESTADO PARA PAGINAÇÃO ---
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 10;

  // --- ESTADO PARA AS MÉTRICAS ---
  const [metricas, setMetricas] = useState({
    movimentacoesHoje: 0,
    entradasHoje: 0,
    saidasHoje: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchTodasMovimentacoes = async () => {
      try {
        setCarregando(true);

        const resAlunos = await fetch("http://localhost:8000/api/v1/pessoas", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (resAlunos.status === 401) {
          window.location.href = "http://localhost:3000/";
          return;
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

          const promessasDetalhes = listaBasica.map(async (alunoBasico) => {
            try {
              const resDetalhe = await fetch(
                `http://localhost:8000/api/v1/pessoas/${alunoBasico.matricula}`,
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
                    (m: any) => ({
                      ...m,
                      pessoa: {
                        nome: alunoDetalhado.nome,
                        matricula: alunoDetalhado.matricula,
                      },
                    })
                  );
                  todasMovimentacoes = [...todasMovimentacoes, ...movsDoAluno];
                }
              }
            } catch (err) {
              console.error(
                `Erro ao buscar detalhes do aluno ${alunoBasico.matricula}`,
                err
              );
            }
          });

          await Promise.all(promessasDetalhes);

          todasMovimentacoes.sort((a, b) => {
            return (
              new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
            );
          });

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
            movimentacoesHoje: entradas + saidas,
            entradasHoje: entradas,
            saidasHoje: saidas,
          });

          setMovimentacoes(todasMovimentacoes);
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

    fetchTodasMovimentacoes();

    return () => {
      isMounted = false;
    };
  }, []);

  // --- LÓGICA DE FILTRAGEM ---
  const movimentacoesFiltradas = movimentacoes.filter((mov) => {
    const matchNome = mov.pessoa.nome
      .toLowerCase()
      .includes(filtroNome.toLowerCase());
    const matchMatricula = mov.pessoa.matricula
      .toLowerCase()
      .includes(filtroMatricula.toLowerCase());
    const matchTipo =
      filtroTipo === "Todos" ||
      (filtroTipo === "Entrada" && mov.tipo === "ENTRADA") ||
      (filtroTipo === "Saída" && mov.tipo === "SAIDA");

    return matchNome && matchMatricula && matchTipo;
  });

  // --- LÓGICA DE PAGINAÇÃO ---
  const totalPaginas = Math.ceil(
    movimentacoesFiltradas.length / itensPorPagina
  );
  const indiceUltimoItem = paginaAtual * itensPorPagina;
  const indicePrimeiroItem = indiceUltimoItem - itensPorPagina;
  const itensAtuais = movimentacoesFiltradas.slice(
    indicePrimeiroItem,
    indiceUltimoItem
  );

  const formatarData = (dataIso: string) => {
    try {
      return new Date(dataIso).toLocaleDateString("pt-BR");
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
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Título e Ação principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">
            Auditoria de Movimentações
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Monitore o fluxo de entrada e saída no campus em tempo real.
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-colors w-full sm:w-auto">
          <Download className="w-4 h-4" /> Exportar Relatório
        </button>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Movimentos Hoje
          </p>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-slate-900">
              {carregando ? "-" : metricas.movimentacoesHoje}
            </span>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Total
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Entradas Hoje
          </p>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-emerald-600">
              {carregando ? "-" : metricas.entradasHoje}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> Acessos
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Saídas Hoje
          </p>
          <div className="flex items-baseline justify-between mt-3">
            <span className="text-3xl font-bold text-rose-600">
              {carregando ? "-" : metricas.saidasHoje}
            </span>
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
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Nome do Aluno
            </label>
            <input
              type="text"
              value={filtroNome}
              onChange={(e) => {
                setFiltroNome(e.target.value);
                setPaginaAtual(1);
              }}
              placeholder="Buscar por nome..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              Matrícula
            </label>
            <input
              type="text"
              value={filtroMatricula}
              onChange={(e) => {
                setFiltroMatricula(e.target.value);
                setPaginaAtual(1);
              }}
              placeholder="Nº Matrícula"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <div className="w-full">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Tipo de Movimento
              </label>
              <select
                value={filtroTipo}
                onChange={(e) => {
                  setFiltroTipo(e.target.value);
                  setPaginaAtual(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              >
                <option value="Todos">Todos</option>
                <option value="Entrada">Entrada</option>
                <option value="Saída">Saída</option>
              </select>
            </div>
            <button className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center h-[42px]">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Table Section */}
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
              ) : itensAtuais.length > 0 ? (
                itensAtuais.map((mov, index) => (
                  <tr
                    key={`${mov.id}-${index}`}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-slate-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0 uppercase">
                        {mov.pessoa.nome.charAt(0)}
                      </div>
                      {mov.pessoa.nome}
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {mov.pessoa.matricula}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          mov.tipo === "ENTRADA"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}
                      >
                        {mov.tipo === "ENTRADA" ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                        {mov.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {formatarData(mov.data_hora)}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                      {formatarHora(mov.data_hora)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhuma movimentação encontrada com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé de Paginação Funcional */}
        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs md:text-sm text-slate-500">
          <span>
            Mostrando{" "}
            <span className="font-medium text-slate-700">
              {movimentacoesFiltradas.length > 0 ? indicePrimeiroItem + 1 : 0} -{" "}
              {Math.min(indiceUltimoItem, movimentacoesFiltradas.length)}
            </span>{" "}
            de{" "}
            <span className="font-medium text-slate-700">
              {movimentacoesFiltradas.length}
            </span>{" "}
            resultados filtrados
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
              disabled={paginaAtual === 1 || carregando}
              className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
            >
              Anterior
            </button>
            <span className="text-xs font-medium text-slate-600">
              Página {paginaAtual} de {totalPaginas || 1}
            </span>
            <button
              onClick={() =>
                setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))
              }
              disabled={
                paginaAtual === totalPaginas || totalPaginas === 0 || carregando
              }
              className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
