"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  Search, 
  Edit, 
  Users, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle 
} from "lucide-react";

interface Pessoa {
  id: number;
  matricula: string;
  nome: string;
  cpf: string;
  tipo_vinculo: string;
  curso?: string;
  status_matricula?: string;
  status: boolean;
  foto_url?: string;
  email?: string;
}

export default function ListaAlunosPage() {
  const [alunos, setAlunos] = useState<Pessoa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchAlunos = async () => {
      try {
        setCarregando(true);
        const res = await fetch("http://localhost:8000/api/v1/pessoas", {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`Erro ao carregar dados: ${res.status}`);
        }

        const data = await res.json();
        if (isMounted) {
          // Filtra apenas ALUNOS caso o backend retorne professores e servidores misturados
          const apenasAlunos = data.filter((p: Pessoa) => p.tipo_vinculo === "ALUNO");
          setAlunos(apenasAlunos);
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

    fetchAlunos();

    return () => {
      isMounted = false;
    };
  }, []);

  const alunosFiltrados = alunos.filter(
    (aluno) =>
      aluno.nome.toLowerCase().includes(busca.toLowerCase()) ||
      aluno.matricula.includes(busca)
  );

  if (carregando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="font-medium text-sm">Carregando dados dos alunos do banco...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex flex-col items-center text-center gap-4">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Erro de Conexão</h3>
            <p className="text-sm text-slate-600">{erro}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Alunos</h2>
          <p className="text-sm text-slate-500 mt-1">
            Gira os estudantes, matrículas e credenciais de acesso.
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total de Alunos</p>
            <h3 className="text-2xl font-bold text-slate-900">{alunos.length}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Matrículas Ativas</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {alunos.filter((a) => a.status_matricula !== "Evadido" && a.status_matricula !== "Trancado").length}
            </h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Evadidos/Trancados</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {alunos.filter((a) => a.status_matricula === "Evadido" || a.status_matricula === "Trancado").length}
            </h3>
          </div>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Pesquisar por nome ou matrícula..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-transparent border-none focus:outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400"
        />
      </div>

      {/* Tabela de Alunos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Aluno</th>
                <th className="px-6 py-4">Matrícula / CPF</th>
                <th className="px-6 py-4">Curso</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {alunosFiltrados.length > 0 ? (
                alunosFiltrados.map((aluno) => (
                  <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                          <Image
                            src={aluno.foto_url || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100"}
                            alt={aluno.nome}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex flex-col">
                          <Link 
                            href={`/admin/aluno/${aluno.matricula}`}
                            className="font-semibold text-slate-900 hover:text-primary-600 hover:underline transition-colors"
                          >
                            {aluno.nome}
                          </Link>
                          <p className="text-xs text-slate-500">{aluno.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-700">{aluno.matricula}</p>
                      <p className="text-xs text-slate-500">{aluno.cpf}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 font-medium">{aluno.curso || "Não informado"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        aluno.status_matricula === 'Ativo' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {aluno.status_matricula || "Ativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/admin/editar/${aluno.matricula}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Editar Aluno"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}