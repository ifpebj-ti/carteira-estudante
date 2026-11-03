"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

// Lembre-se: se ao usar o console.log você descobrir que o backend
// envia nomes diferentes (ex: "cpf_pessoa" em vez de "cpf"), atualize aqui!
export interface Aluno {
  id: string | number;
  nome: string;
  matricula: string;
  cpf: string;
  status: "VALIDO" | "SUSPENSO";
}

export default function StudentListPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Requisição real para o backend FastAPI
    fetch("http://localhost:8000/api/v1/pessoas")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Erro na requisição: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        // Isso vai cuspir o objeto inteiro no seu F12!
        console.log("DADOS VINDOS DO BACKEND:", data);
        setAlunos(data);
      })
      .catch((error) => {
        console.error("Falha ao buscar a lista de pessoas:", error);
      })
      .finally(() => {
        setCarregando(false);
      });
  }, []);

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
          <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm shadow-primary-600/20">
            <Upload className="w-4 h-4" /> Importar
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
            <h3 className="font-bold text-slate-900">Acesso Liberado</h3>
            <p className="text-xs text-slate-500 mt-1">
              Maioria dos alunos com status válido.
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Pendências</h3>
            <p className="text-xs text-slate-500 mt-1">
              Alunos aguardando regularização.
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="bg-rose-50 p-3 rounded-xl text-rose-600 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Suspensos</h3>
            <p className="text-xs text-slate-500 mt-1">
              Acesso bloqueado na portaria.
            </p>
          </div>
        </div>
      </div>

      {/* Área de Filtros */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative md:col-span-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, matrícula ou CPF..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <div className="flex gap-2">
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500/20">
              <option value="">Status</option>
              <option value="VALIDO">Válidos</option>
              <option value="SUSPENSO">Suspensos</option>
            </select>
            <button className="bg-slate-900 hover:bg-slate-800 text-white p-2.5 rounded-xl transition-colors shrink-0 flex items-center justify-center">
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
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Carregando dados dos alunos do banco...
                  </td>
                </tr>
              ) : alunos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Nenhum aluno encontrado no sistema.
                  </td>
                </tr>
              ) : (
                alunos.map((aluno) => (
                  <tr
                    key={aluno.id}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="py-4 px-6 font-medium text-slate-900">
                      {aluno.nome}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                      {aluno.matricula}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                      {aluno.cpf}
                    </td>
                    <td className="py-4 px-6">
                      {aluno.status === "VALIDO" ? (
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
                      {/* Link dinâmico apontando para a pasta [id] que criamos */}
                      <Link
                        href={`/admin/editar/${aluno.id}`}
                        className="text-primary-600 hover:text-primary-800 p-2 rounded-lg hover:bg-primary-50 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
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

        {/* Paginação */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
          <span>
            Total:{" "}
            <span className="font-medium text-slate-900">{alunos.length}</span>{" "}
            alunos
          </span>
          <div className="flex items-center gap-1.5">
            <button className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50 font-medium">
              Anterior
            </button>
            <button className="px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-600 hover:bg-slate-100 transition-colors font-medium">
              Próximo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
