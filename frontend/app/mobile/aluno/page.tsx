"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Maximize2,
  RefreshCw,
  X,
  Camera,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { getApiBaseUrl, performLogout } from "@/services/auth";
import { formatLocalAcesso, formatVinculoLabel } from "@/services/labels";
import { PessoaPhoto } from "@/components/ui/PessoaPhoto";

// --- INTERFACES ---
interface Movimentacao {
  id: number;
  tipo: string;
  local_acesso?: string;
  data_hora: string;
}

interface Aluno {
  id: number | string;
  matricula: string;
  nome: string;
  cpf?: string;
  tipo_vinculo?: string;
  curso?: string;
  modalidade?: string;
  status_matricula?: string;
  data_nascimento?: string;
  email?: string;
  foto_url?: string;
  status: boolean;
  qr_code_hash?: string;
  qr_token?: string;
  qr_expires_in?: number;
  movimentacoes?: Movimentacao[];
}

function formatarCPF(cpf?: string): string {
  if (!cpf) return "--";
  const limpo = cpf.replace(/\D/g, "");
  if (limpo.length !== 11) return cpf;
  return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function validarArquivoFoto(file: File): string | null {
  if (!file || file.size === 0) {
    return "O arquivo selecionado está vazio.";
  }

  const nomeArquivo = file.name.toLowerCase();
  const temExtensaoValida = ALLOWED_PHOTO_EXTENSIONS.some((ext) =>
    nomeArquivo.endsWith(ext)
  );
  const temMimeValido = ALLOWED_PHOTO_MIME_TYPES.includes(
    file.type.toLowerCase()
  );

  if (!temExtensaoValida && !temMimeValido) {
    return "Formato inválido. Use imagens nos formatos JPG, PNG ou WEBP.";
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return "A imagem excede o tamanho máximo permitido de 5 MB.";
  }

  return null;
}

interface FetchPessoaMeResult {
  aluno: Aluno | null;
  errorMessage?: string;
  unauthorized?: boolean;
}

async function fetchPessoaMe(): Promise<FetchPessoaMeResult> {
  const API_URL = getApiBaseUrl();
  // Rota /me reconhece o titular automaticamente pelo cookie de sessão
  const res = await fetch(`${API_URL}/api/v1/auth/pessoa/me`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (res.status === 401) {
    return { aluno: null, unauthorized: true };
  }

  if (res.status === 403) {
    return {
      aluno: null,
      errorMessage: "Esta carteira digital está desativada ou sem permissão.",
    };
  }

  if (!res.ok) {
    throw new Error("Erro ao carregar sua carteira digital.");
  }

  const data = (await res.json()) as Aluno;
  return { aluno: data };
}

export default function MobileAlunoPage() {
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizandoHistorico, setAtualizandoHistorico] = useState(false);
  const [erro, setErro] = useState("");
  const [isQrExpanded, setIsQrExpanded] = useState(false);

  // Estados para envio da foto do aluno
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [isModalFotoOpen, setIsModalFotoOpen] = useState(false);
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [fotoLocalUrl, setFotoLocalUrl] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState("");
  const [sucessoFoto, setSucessoFoto] = useState("");

  const handleAbrirSeletorFoto = () => {
    if (enviandoFoto) return;
    setErroFoto("");
    setSucessoFoto("");
    fileInputRef.current?.click();
  };

  const handleFotoSelecionada = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const erroValidacao = validarArquivoFoto(file);
    if (erroValidacao) {
      setErroFoto(erroValidacao);
      setArquivoFoto(null);
      setPreviewFoto(null);
      setIsModalFotoOpen(true);
      e.target.value = "";
      return;
    }

    setErroFoto("");
    setSucessoFoto("");
    setArquivoFoto(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewFoto(dataUrl);
      setIsModalFotoOpen(true);
    };
    reader.onerror = () => {
      setErroFoto("Não foi possível processar a prévia da imagem selecionada.");
      setIsModalFotoOpen(true);
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const handleFecharModalFoto = useCallback(() => {
    if (enviandoFoto) return;
    setIsModalFotoOpen(false);
    setArquivoFoto(null);
    setPreviewFoto(null);
    setErroFoto("");
    setSucessoFoto("");
  }, [enviandoFoto]);

  const handleEnviarFoto = async () => {
    if (!aluno || !arquivoFoto) return;

    setEnviandoFoto(true);
    setErroFoto("");
    setSucessoFoto("");

    try {
      const API_URL = getApiBaseUrl();
      const formData = new FormData();
      formData.append("file", arquivoFoto);

      const headers: Record<string, string> = {
        Accept: "application/json",
      };

      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/api/v1/pessoas/${aluno.id}/photo`, {
        method: "POST",
        credentials: "include",
        headers,
        body: formData,
      });

      if (res.status === 401) {
        performLogout();
        return;
      }

      if (!res.ok) {
        const errorJson = await res.json().catch(() => null);
        let mensagem = "Não foi possível enviar a foto.";
        if (errorJson && typeof errorJson.detail === "string") {
          mensagem = errorJson.detail;
        } else if (errorJson && Array.isArray(errorJson.detail)) {
          mensagem = errorJson.detail
            .map((item: { msg?: string }) => item.msg || "Dados inválidos.")
            .join(", ");
        } else if (res.status === 403) {
          mensagem = "Acesso negado: sem permissão para atualizar a foto.";
        } else if (res.status === 413) {
          mensagem = "Arquivo excede o limite máximo permitido de 5 MB.";
        }
        throw new Error(mensagem);
      }

      setSucessoFoto("Foto enviada com sucesso! Atualizando carteira...");
      if (previewFoto) {
        setFotoLocalUrl(previewFoto);
      }

      if (uploadSuccessTimeoutRef.current) {
        clearTimeout(uploadSuccessTimeoutRef.current);
      }
      uploadSuccessTimeoutRef.current = setTimeout(() => {
        uploadSuccessTimeoutRef.current = null;
        setIsModalFotoOpen(false);
        setSucessoFoto("");
        setArquivoFoto(null);
        setPreviewFoto(null);
        void refreshProfile(false);
      }, 1500);
    } catch (err) {
      setErroFoto(
        err instanceof Error ? err.message : "Erro inesperado ao enviar foto."
      );
    } finally {
      setEnviandoFoto(false);
    }
  };

  const applyProfileResult = useCallback(
    (result: FetchPessoaMeResult, showInitialError: boolean) => {
      if (result.unauthorized) {
        performLogout();
        return;
      }
      if (result.errorMessage) {
        if (showInitialError) {
          setErro(result.errorMessage);
        }
        return;
      }
      if (result.aluno) {
        setAluno(result.aluno);
      }
    },
    []
  );

  const refreshProfile = useCallback(
    async (showInitialError: boolean) => {
      try {
        const result = await fetchPessoaMe();
        applyProfileResult(result, showInitialError);
      } catch (err) {
        if (showInitialError) {
          setErro(
            err instanceof Error
              ? err.message
              : "Erro de conexão com o servidor."
          );
        }
      } finally {
        if (showInitialError) {
          setCarregando(false);
        }
      }
    },
    [applyProfileResult]
  );

  const handleManualRefresh = async () => {
    setAtualizandoHistorico(true);
    try {
      await refreshProfile(false);
    } finally {
      setAtualizandoHistorico(false);
    }
  };

  useEffect(() => {
    if (!isQrExpanded) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsQrExpanded(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isQrExpanded]);

  useEffect(() => {
    if (!isModalFotoOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !enviandoFoto) {
        handleFecharModalFoto();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalFotoOpen, enviandoFoto, handleFecharModalFoto]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialProfile = async () => {
      try {
        const result = await fetchPessoaMe();
        if (isMounted) {
          applyProfileResult(result, true);
        }
      } catch (err) {
        if (isMounted) {
          setErro(
            err instanceof Error
              ? err.message
              : "Erro de conexão com o servidor."
          );
        }
      } finally {
        if (isMounted) {
          setCarregando(false);
        }
      }
    };

    void loadInitialProfile();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshProfile(false);
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      if (uploadSuccessTimeoutRef.current) {
        clearTimeout(uploadSuccessTimeoutRef.current);
        uploadSuccessTimeoutRef.current = null;
      }
    };
  }, [applyProfileResult, refreshProfile]);

  const qrExpiresIn = aluno?.qr_expires_in;
  useEffect(() => {
    if (!qrExpiresIn) return;

    const refreshDelayMs = Math.max(qrExpiresIn - 30, 30) * 1000;
    const intervalId = setInterval(() => {
      void refreshProfile(false);
    }, refreshDelayMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [qrExpiresIn, refreshProfile]);

  if (carregando) {
    return (
      <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-500 p-4">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="font-medium text-sm">Carregando credenciais...</p>
      </div>
    );
  }

  if (erro || !aluno) {
    return (
      <div className="flex-1 min-h-[60vh] p-4 flex items-center justify-center">
        <div className="bg-white border border-rose-200 rounded-2xl p-6 flex flex-col items-center text-center gap-4 shadow-sm w-full max-w-sm">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Erro de Acesso
            </h3>
            <p className="text-sm text-slate-600 mb-4">{erro}</p>
          </div>
          <button
            type="button"
            onClick={performLogout}
            className="w-full px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  const qrValue = aluno.qr_token || aluno.qr_code_hash || aluno.matricula;

  return (
    <div className="p-4 pb-8 flex flex-col space-y-5">
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
            <div className="relative w-16 h-20 bg-white/10 rounded-lg shrink-0 overflow-hidden border border-white/20 flex items-center justify-center group">
              {fotoLocalUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoLocalUrl}
                  alt={aluno.nome}
                  className="w-full h-full object-cover"
                />
              ) : (
                <PessoaPhoto
                  src={aluno.foto_url}
                  alt={aluno.nome}
                  sizes="64px"
                  iconClassName="w-7 h-7 text-primary-200"
                />
              )}
              <button
                type="button"
                onClick={handleAbrirSeletorFoto}
                disabled={enviandoFoto}
                aria-label="Enviar ou alterar foto do aluno"
                title="Enviar ou alterar foto"
                className="absolute inset-0 bg-slate-950/25 hover:bg-slate-950/45 focus:bg-slate-950/45 transition-colors flex items-end justify-end p-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/80 rounded-lg"
              >
                <span className="p-1 bg-primary-600 hover:bg-primary-500 text-white rounded-md shadow-md transition-transform group-hover:scale-105 active:scale-95 flex items-center justify-center">
                  <Camera className="w-3 h-3" />
                </span>
              </button>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-[10px] text-primary-300 font-semibold uppercase mb-0.5">
                {formatVinculoLabel(aluno.tipo_vinculo || "ALUNO")}
              </p>
              <p className="text-sm font-bold text-white leading-tight mb-2 line-clamp-2">
                {aluno.nome.toUpperCase()}
              </p>
              <p className="text-[10px] text-primary-300 font-semibold uppercase mb-0.5">
                {aluno.tipo_vinculo && aluno.tipo_vinculo !== "ALUNO"
                  ? "Vínculo"
                  : "Curso"}
              </p>
              <p className="text-[11px] font-semibold text-white/90 leading-tight line-clamp-1">
                {aluno.curso ||
                  (aluno.tipo_vinculo && aluno.tipo_vinculo !== "ALUNO"
                    ? "IFPE Belo Jardim"
                    : "Não informado")}
              </p>
            </div>
          </div>

          <div className="px-5 pb-5 flex items-end justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsQrExpanded(true)}
              aria-label="Ampliar QR Code para leitura"
              className="bg-white p-2 rounded-xl shrink-0 shadow-sm hover:scale-[1.02] transition-transform cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/80"
            >
              <QRCodeSVG value={qrValue} size={108} level="L" marginSize={2} />
            </button>
            <div className="text-right">
              <p className="text-[9px] text-primary-300 uppercase font-semibold">
                {aluno.tipo_vinculo && aluno.tipo_vinculo !== "ALUNO"
                  ? "Identificação"
                  : "Matrícula"}
              </p>
              <p className="text-xs text-white font-bold font-mono tracking-wider">
                {aluno.matricula}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setIsQrExpanded(true)}
            className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" /> Ampliar QR
          </button>
          <button
            type="button"
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" /> Salvar Offline
          </button>
        </div>
      </div>

      {isQrExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="QR Code Ampliado"
          onClick={() => setIsQrExpanded(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col items-center text-center shadow-2xl border border-slate-200 relative"
          >
            <button
              type="button"
              onClick={() => setIsQrExpanded(false)}
              aria-label="Fechar QR Code ampliado"
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900">
              Apresente na Portaria
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {aluno.nome} &bull; {aluno.matricula}
            </p>
            <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-inner">
              <QRCodeSVG value={qrValue} size={225} level="L" marginSize={2} />
            </div>
            <p className="text-[11px] text-slate-400 mt-4">
              QR Code dinâmico renovado automaticamente
            </p>
          </div>
        </div>
      )}

      {/* Informações Detalhadas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" /> Meus Dados
          </h2>
          <button
            type="button"
            onClick={handleAbrirSeletorFoto}
            disabled={enviandoFoto}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer border border-primary-100 disabled:opacity-50"
          >
            <Camera className="w-3.5 h-3.5 text-primary-600" />
            {aluno.foto_url || fotoLocalUrl ? "Alterar Foto" : "Enviar Foto"}
          </button>
        </div>

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
              <LayoutDashboard className="w-3.5 h-3.5" />{" "}
              {aluno.tipo_vinculo && aluno.tipo_vinculo !== "ALUNO"
                ? "Categoria"
                : "Modalidade"}
            </span>
            <span className="text-sm font-medium text-slate-900 mt-0.5">
              {aluno.modalidade ||
                (aluno.tipo_vinculo && aluno.tipo_vinculo !== "ALUNO"
                  ? formatVinculoLabel(aluno.tipo_vinculo)
                  : "Presencial")}
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" /> Acessos Recentes
          </h2>
          <button
            type="button"
            onClick={() => void handleManualRefresh()}
            disabled={atualizandoHistorico}
            aria-label="Atualizar acessos recentes"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${atualizandoHistorico ? "animate-spin" : ""}`}
            />
            Atualizar
          </button>
        </div>

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
                      {formatLocalAcesso(mov.local_acesso)}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-600">
                  {new Date(mov.data_hora).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input oculto para seleção de fotos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Selecionar foto de perfil"
        className="hidden"
        onChange={handleFotoSelecionada}
      />

      {/* Modal de Confirmação e Envio de Foto */}
      {isModalFotoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Enviar Foto de Identificação"
          onClick={handleFecharModalFoto}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-sm w-full flex flex-col items-center text-center shadow-2xl border border-slate-200 relative"
          >
            <button
              type="button"
              onClick={handleFecharModalFoto}
              disabled={enviandoFoto}
              aria-label="Fechar janela de envio de foto"
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center mb-3">
              <Camera className="w-5 h-5" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Foto de Identificação
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {aluno.nome} &bull; {aluno.matricula}
            </p>

            {/* Prévia da imagem */}
            <div className="w-32 h-40 rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-100 shadow-inner relative flex items-center justify-center mb-3">
              {previewFoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewFoto}
                  alt="Prévia da foto selecionada"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                  <Upload className="w-8 h-8 mb-1" />
                  <span className="text-[10px]">Sem prévia</span>
                </div>
              )}
            </div>

            {/* Metadados do arquivo */}
            {arquivoFoto && (
              <p className="text-[11px] text-slate-500 font-mono mb-3 truncate max-w-full px-2">
                {arquivoFoto.name} (
                {(arquivoFoto.size / (1024 * 1024)).toFixed(2)} MB)
              </p>
            )}

            {/* Recomendações */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-left">
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Dica:</strong> Use uma foto recente e nítida (estilo
                3x4), com boa iluminação e rosto centralizado, sem óculos
                escuros ou boné.
              </p>
            </div>

            {/* Alerta de erro */}
            {erroFoto && (
              <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{erroFoto}</span>
              </div>
            )}

            {/* Alerta de sucesso */}
            {sucessoFoto && (
              <div className="w-full mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{sucessoFoto}</span>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={handleEnviarFoto}
                disabled={enviandoFoto || !arquivoFoto || !!sucessoFoto}
                className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
              >
                {enviandoFoto ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando foto...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Confirmar e Enviar
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleAbrirSeletorFoto}
                  disabled={enviandoFoto}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Escolher outra
                </button>
                <button
                  type="button"
                  onClick={handleFecharModalFoto}
                  disabled={enviandoFoto}
                  className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
