"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Download,
  Upload,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  Edit,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";

// Interface alinhada com o modelo real do banco de dados (Pessoa)
export interface Aluno {
  id: string | number;
  nome: string;
  matricula: string;
  cpf: string;
  curso?: string;
  modalidade?: string;
  status_matricula?: string;
  status: boolean; // true para liberado/ativo, false para suspenso
  email?: string;
  foto_url?: string;
}

// Máscara utilitária rápida para formatação de CPF (XXX.XXX.XXX-XX)
function formatarCPF(cpf: string): string {
  if (!cpf) return "--";
  const limpo = cpf.replace(/\D/g, "");
  if (limpo.length !== 11) return cpf;
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export default function StudentListPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [gatilhoRecarga, setGatilhoRecarga] = useState(0);

  // Estados dos Filtros Reativos
  const [termoBusca, setTermoBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"" | "VALIDO" | "SUSPENSO">(
    ""
  );

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const itensPorPagina = 8;

  // Handlers para filtros que resetam a paginação diretamente no evento
  const handleBuscaChange = (valor: string) => {
    setTermoBusca(valor);
    setPaginaAtual(1);
  };

  const handleFiltroStatusChange = (valor: "" | "VALIDO" | "SUSPENSO") => {
    setFiltroStatus(valor);
    setPaginaAtual(1);
  };

  const handleLimparFiltros = () => {
    setTermoBusca("");
    setFiltroStatus("");
    setPaginaAtual(1);
  };

  // Handler para recarga manual
  const handleRecarregar = () => {
    setCarregando(true);
    setErro(null);
    setGatilhoRecarga((prev) => prev + 1);
  };

  // Efeito para busca de dados compatível com as regras de efeito do React 19 / ESLint
  useEffect(() => {
    let isMounted = true;

    const carregarAlunos = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/v1/pessoas", {
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          if (res.status === 404) {
            throw new Error(
              "A rota de listagem (/api/v1/pessoas) ainda não foi disponibilizada no backend (HTTP 404). Aguardando liberação do endpoint pelo time de API."
            );
          }
          throw new Error(
            `Erro na requisição ao backend: status ${res.status}`
          );
        }

        const data = await res.json();
        console.log("DADOS VINDOS DO BACKEND:", data);

        if (isMounted) {
          if (Array.isArray(data)) {
            setAlunos(data);
          } else {
            setAlunos([]);
          }
          setErro(null);
        }
      } catch (error) {
        if (isMounted) {
          const mensagem =
            error instanceof Error
              ? error.message
              : "Falha ao se comunicar com o servidor do backend.";
          console.error("Falha ao buscar a lista de pessoas:", error);
          setErro(mensagem);
          setAlunos([]);
        }
      } finally {
        if (isMounted) {
          setCarregando(false);
        }
      }
    };

    void carregarAlunos();

    return () => {
      isMounted = false;
    };
  }, [gatilhoRecarga]);

  // Filtros aplicados em tempo real (Nome, Matrícula ou CPF + Status)
  const alunosFiltrados = useMemo(() => {
    return alunos.filter((aluno) => {
      // 1. Filtro por Status
      if (filtroStatus === "VALIDO" && !aluno.status) return false;
      if (filtroStatus === "SUSPENSO" && aluno.status) return false;

      // 2. Filtro por Termo de Busca
      if (!termoBusca.trim()) return true;

      const termo = termoBusca.toLowerCase().trim();
      const termoApenasDigitos = termo.replace(/\D/g, "");

      const nomeMatch = aluno.nome?.toLowerCase().includes(termo);
      const matriculaMatch = aluno.matricula?.toLowerCase().includes(termo);
      const cpfMatch =
        aluno.cpf?.includes(termo) ||
        (termoApenasDigitos.length > 0 &&
          aluno.cpf?.includes(termoApenasDigitos)) ||
        formatarCPF(aluno.cpf || "")
          .toLowerCase()
          .includes(termo);

      return Boolean(nomeMatch || matriculaMatch || cpfMatch);
    });
  }, [alunos, termoBusca, filtroStatus]);

  // Cálculos dinâmicos para as métricas do topo
  const totalAlunos = alunos.length;
  const totalValidos = useMemo(
    () => alunos.filter((a) => a.status === true).length,
    [alunos]
  );
  const totalSuspensos = useMemo(
    () => alunos.filter((a) => a.status === false).length,
    [alunos]
  );
  const totalPendencias = useMemo(
    () =>
      alunos.filter(
        (a) =>
          a.status_matricula &&
          a.status_matricula.toLowerCase() !== "ativo" &&
          a.status_matricula.toLowerCase() !== "concluída"
      ).length,
    [alunos]
  );

  // Paginação dinâmica
  const totalPaginas = Math.ceil(alunosFiltrados.length / itensPorPagina) || 1;
  const alunosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return alunosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [alunosFiltrados, paginaAtual, itensPorPagina]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho da Página e Ações */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lista de Alunos</h2>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie o cadastro, status e acesso dos estudantes ao campus.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer shadow-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors cursor-pointer shadow-sm shadow-primary-600/20">
            <Upload className="w-4 h-4" /> Importar
          </button>
        </div>
      </div>

      {/* Cards de Métricas Dinâmicas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Acesso Liberado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <h3 className="font-bold text-slate-900">Acesso Liberado</h3>
              <span className="text-2xl font-extrabold text-emerald-600">
                {totalValidos}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {totalAlunos > 0
                ? `${Math.round((totalValidos / totalAlunos) * 100)}% dos alunos com status ativo`
                : "Alunos com autorização de entrada"}
            </p>
          </div>
        </div>

        {/* Pendências / Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <h3 className="font-bold text-slate-900">Pendências</h3>
              <span className="text-2xl font-extrabold text-amber-600">
                {totalPendencias}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {totalAlunos > 0
                ? `Total de ${totalAlunos} cadastros registrados`
                : "Aguardando regularização cadastral"}
            </p>
          </div>
        </div>

        {/* Suspensos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="bg-rose-50 p-3 rounded-xl text-rose-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline justify-between">
              <h3 className="font-bold text-slate-900">Suspensos</h3>
              <span className="text-2xl font-extrabold text-rose-600">
                {totalSuspensos}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Acesso bloqueado na portaria e catraca
            </p>
          </div>
        </div>
      </div>

      {/* Banner Amigável de Erro / Aviso de Rota Pendente */}
      {erro && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-900 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">
                Aviso de Comunicação com a API
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">{erro}</p>
            </div>
          </div>
          <button
            onClick={handleRecarregar}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-amber-300 hover:bg-amber-100/70 text-amber-900 rounded-xl transition-colors shrink-0 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${carregando ? "animate-spin" : ""}`}
            />
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Área de Filtros Reativos */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Campo de Busca */}
          <div className="relative md:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => handleBuscaChange(e.target.value)}
              placeholder="Buscar por nome, matrícula ou CPF..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            />
            {termoBusca && (
              <button
                onClick={handleLimparFiltros}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Seletor de Status e Ação de Filtro */}
          <div className="flex gap-2">
            <select
              value={filtroStatus}
              onChange={(e) =>
                handleFiltroStatusChange(
                  e.target.value as "" | "VALIDO" | "SUSPENSO"
                )
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 cursor-pointer transition-colors"
            >
              <option value="">Todos os Status</option>
              <option value="VALIDO">Acesso Liberado (Válidos)</option>
              <option value="SUSPENSO">Acesso Bloqueado (Suspensos)</option>
            </select>
            <button
              onClick={handleLimparFiltros}
              title="Limpar todos os filtros"
              className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center cursor-pointer shadow-sm"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabela Dinâmica de Alunos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6 w-1/3">Nome do Aluno</th>
                <th className="py-4 px-6">Matrícula</th>
                <th className="py-4 px-6">CPF</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {carregando ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                      <span>Carregando dados dos alunos do banco...</span>
                    </div>
                  </td>
                </tr>
              ) : erro && alunos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                      <AlertCircle className="w-8 h-8 text-amber-500" />
                      <p className="font-semibold text-slate-800">
                        Não foi possível carregar os alunos
                      </p>
                      <p className="text-xs text-slate-500">
                        O backend ainda não disponibilizou o endpoint de
                        consulta ou está temporariamente offline.
                      </p>
                      <button
                        onClick={handleRecarregar}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Recarregar página
                      </button>
                    </div>
                  </td>
                </tr>
              ) : alunosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="font-semibold text-slate-700">
                        {alunos.length === 0
                          ? "Nenhum aluno encontrado no sistema."
                          : "Nenhum aluno corresponde aos filtros aplicados."}
                      </p>
                      {alunos.length > 0 && (
                        <button
                          onClick={handleLimparFiltros}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
                        >
                          Limpar filtros de busca
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                alunosPaginados.map((aluno) => (
                  <tr
                    key={aluno.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-4 px-6 font-medium text-slate-900">
                      <div>
                        <span>{aluno.nome}</span>
                        {aluno.curso && (
                          <span className="block text-xs font-normal text-slate-400 mt-0.5">
                            {aluno.curso}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-xs">
                      {aluno.matricula}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-mono text-xs">
                      {formatarCPF(aluno.cpf)}
                    </td>
                    <td className="py-4 px-6">
                      {aluno.status ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Válido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Suspenso
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link
                        href={`/admin/editar`}
                        className="text-primary-600 hover:text-primary-800 p-2 rounded-lg hover:bg-primary-50 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                        title="Editar Aluno"
                      >
                        <Edit className="w-4 h-4" /> Editar
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação Dinâmica */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <span>
            Mostrando{" "}
            <span className="font-medium text-slate-900">
              {alunosFiltrados.length === 0
                ? "0"
                : `${(paginaAtual - 1) * itensPorPagina + 1}-${Math.min(
                    paginaAtual * itensPorPagina,
                    alunosFiltrados.length
                  )}`}
            </span>{" "}
            de{" "}
            <span className="font-medium text-slate-900">
              {alunosFiltrados.length}
            </span>{" "}
            alunos
            {totalAlunos > alunosFiltrados.length && (
              <span className="text-xs text-slate-400 ml-1">
                (filtrados de um total de {totalAlunos})
              </span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaginaAtual((prev) => Math.max(prev - 1, 1))}
              disabled={paginaAtual <= 1 || carregando}
              className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs cursor-pointer shadow-xs"
            >
              Anterior
            </button>
            <span className="text-xs font-medium text-slate-600 px-1">
              Página {paginaAtual} de {totalPaginas}
            </span>
            <button
              onClick={() =>
                setPaginaAtual((prev) => Math.min(prev + 1, totalPaginas))
              }
              disabled={paginaAtual >= totalPaginas || carregando}
              className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs cursor-pointer shadow-xs"
            >
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
