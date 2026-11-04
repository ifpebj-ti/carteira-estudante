"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  X,
} from "lucide-react";

interface PessoaDetail {
  id: string | number;
  matricula: string;
  nome: string;
  cpf: string;
  tipo_vinculo: string;
  modalidade?: string;
  curso?: string;
  data_nascimento?: string;
  status_matricula?: string;
  is_interno?: boolean;
  email?: string;
  foto_url?: string;
  status: boolean;
  qr_code_hash?: string;
  created_at?: string; // <-- Adicionado para o TypeScript não reclamar
  movimentacoes?: any[];
}

export default function EditStudentPage() {
  const params = useParams();
  const router = useRouter();
  // O Next.js pega o [id] da pasta e coloca no params
  const matricula = params.id as string;

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [notificacao, setNotificacao] = useState<{
    tipo: "sucesso" | "erro";
    titulo: string;
    mensagem: string;
  } | null>(null);
  const [formData, setFormData] = useState<Partial<PessoaDetail>>({});
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchAluno = async () => {
      if (!matricula) return;

      try {
        setCarregando(true);
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
          throw new Error("Aluno não encontrado ou erro no servidor.");
        }

        const data = await res.json();
        if (isMounted) {
          setFormData(data);
          setErro(null);
        }
      } catch (error) {
        if (isMounted) {
          setErro(error instanceof Error ? error.message : "Erro ao carregar");
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSalvar = async () => {
    try {
      setSalvando(true);
      setNotificacao(null);

      // Criamos uma cópia dos dados para limpar campos que o backend costuma rejeitar
      const dadosParaEnviar = { ...formData };

      // Removemos campos que geralmente são apenas de leitura (ajuste conforme o seu backend)
      delete dadosParaEnviar.id;
      delete dadosParaEnviar.matricula;
      delete dadosParaEnviar.qr_code_hash;
      delete dadosParaEnviar.created_at;
      delete dadosParaEnviar.movimentacoes;

      const apiBaseUrl =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBaseUrl}/api/v1/pessoas/${matricula}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(dadosParaEnviar),
      });

      if (!res.ok) {
        // Tenta capturar a mensagem de erro exata que o FastAPI enviou
        const erroBackend = await res
          .json()
          .catch(() => ({ detail: `Erro inesperado (${res.status}).` }));

        let mensagemErro = "Não foi possível salvar as alterações.";
        if (typeof erroBackend.detail === "string") {
          mensagemErro = erroBackend.detail;
        } else if (Array.isArray(erroBackend.detail)) {
          mensagemErro = erroBackend.detail
            .map((item: { msg?: string }) =>
              (item.msg || "Valor inválido.").replace(/^Value error,\s*/i, "")
            )
            .join(" ");
        }

        throw new Error(mensagemErro);
      }

      setNotificacao({
        tipo: "sucesso",
        titulo: "Cadastro atualizado",
        mensagem: "As alterações do discente foram salvas com sucesso.",
      });

      redirectTimeoutRef.current = setTimeout(() => {
        router.push("/admin/alunos");
      }, 1200);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setNotificacao({
        tipo: "erro",
        titulo: "Não foi possível salvar",
        mensagem:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro inesperado ao comunicar com o servidor.",
      });
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="font-medium text-sm">
          Carregando informações do aluno...
        </p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto flex flex-col items-center text-center gap-4 mt-10">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <h3 className="text-lg font-bold text-slate-900">Erro ao carregar</h3>
        <p className="text-sm text-slate-600">{erro}</p>
        <button
          onClick={() => router.push("/admin/alunos")}
          className="mt-4 px-4 py-2 bg-slate-100 rounded-xl font-semibold hover:bg-slate-200 cursor-pointer"
        >
          Voltar para a Lista
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 md:space-y-8">
      {notificacao && (
        <div
          role={notificacao.tipo === "erro" ? "alert" : "status"}
          className={`fixed top-5 right-5 z-50 w-[calc(100%-2.5rem)] max-w-md rounded-2xl border p-4 shadow-lg transition-all flex items-start gap-3 ${
            notificacao.tipo === "sucesso"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {notificacao.tipo === "sucesso" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold">{notificacao.titulo}</p>
            <p className="text-xs mt-0.5 opacity-90">{notificacao.mensagem}</p>
          </div>
          <button
            type="button"
            onClick={() => setNotificacao(null)}
            aria-label="Fechar notificação"
            className="p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/alunos")}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Modificar Informações do Aluno
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Editando: {formData.nome}
          </p>
        </div>
      </div>

      {/* Formulário Dinâmico */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-8 flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 flex-1">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
              Nome Completo
            </label>
            <input
              type="text"
              name="nome"
              value={formData.nome || ""}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
              Matrícula
            </label>
            <input
              type="text"
              value={formData.matricula || ""}
              disabled
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              value={formData.email || ""}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
              Curso
            </label>
            <input
              type="text"
              name="curso"
              value={formData.curso || ""}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase">
              CPF
            </label>
            <input
              type="text"
              name="cpf"
              value={formData.cpf || ""}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 py-2 mt-8"></div>

        {/* Ações do Formulário */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => router.push("/admin/alunos")}
            className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-colors text-center cursor-pointer shadow-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando || notificacao?.tipo === "sucesso"}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-md shadow-primary-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
          >
            {salvando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : notificacao?.tipo === "sucesso" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {salvando
              ? "Salvando..."
              : notificacao?.tipo === "sucesso"
                ? "Salvo!"
                : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}
