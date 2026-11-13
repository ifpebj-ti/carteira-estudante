"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  CameraOff,
  Clock,
  History,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  Scanner,
  outline,
  prepareZXingModule,
  useDevices,
  type IDetectedBarcode,
  type IScannerError,
  type IScannerHandle,
  type ScannerErrorKind,
} from "@yudiel/react-qr-scanner";
import { ApiError, api } from "@/services/api";
import { performLogout } from "@/services/auth";
import { formatLocalAcesso, formatVinculoLabel } from "@/services/labels";
import { PessoaPhoto, isRenderablePhotoSrc } from "@/components/ui/PessoaPhoto";

if (typeof window !== "undefined") {
  // Host zxing_reader.wasm locally so scanning does not stall on external CDNs
  prepareZXingModule({
    overrides: {
      locateFile: (path, prefix) =>
        path.endsWith(".wasm") ? "/wasm/zxing_reader.wasm" : `${prefix}${path}`,
    },
  });
}

type ScanStatus = "idle" | "loading" | "success" | "error";
type LeitorTab = "leitor" | "historico";

interface ScanResponse {
  status: boolean;
  student_name: string;
  student_photo_url?: string | null;
  student_tipo_vinculo?: string | null;
  movement_type: string;
  local_acesso?: string;
}

interface ScanFeedbackMessage {
  title: string;
  subtitle: string;
  vinculoLabel?: string;
  photoUrl?: string | null;
}

interface HistoricoMovimentacao {
  id: number;
  pessoa_id: number;
  pessoa_nome: string;
  pessoa_tipo_vinculo?: string | null;
  tipo: string;
  local_acesso: string;
  data_hora: string;
}

const OPERATOR_SESSION_MISMATCH_MESSAGE =
  "Sua sessão atual foi substituída por uma conta sem permissão de portaria (ex.: aluno logado no mesmo navegador). Use uma Janela Privativa para testar os dois perfis juntos.";

const CAMERA_ERROR_MESSAGES: Record<
  Exclude<ScannerErrorKind, "unknown">,
  { title: string; description: string }
> = {
  "permission-denied": {
    title: "Permissão da câmera bloqueada",
    description:
      "Libere o acesso à câmera nas permissões do navegador e tente novamente.",
  },
  "no-camera": {
    title: "Nenhuma câmera detectada",
    description:
      "Conecte uma webcam a este dispositivo ou acesse o leitor por um celular/notebook com câmera.",
  },
  "in-use": {
    title: "Câmera ocupada",
    description:
      "Outro aplicativo ou aba está usando a câmera no momento. Feche-o e tente novamente.",
  },
  overconstrained: {
    title: "Configuração incompatível",
    description:
      "A câmera não aceitou os parâmetros padrão de vídeo. Tente selecionar outra câmera.",
  },
  "insecure-context": {
    title: "Conexão segura necessária",
    description:
      "Os navegadores bloqueiam a câmera fora de HTTPS ou localhost. Acesse via HTTPS ou http://localhost:3000.",
  },
  unsupported: {
    title: "Navegador sem suporte",
    description:
      "Este navegador não oferece suporte à captura de vídeo (MediaDevices API).",
  },
  aborted: {
    title: "Abertura interrompida",
    description:
      "A inicialização da câmera foi cancelada pelo sistema. Tente novamente.",
  },
  security: {
    title: "Bloqueio de segurança",
    description:
      "As políticas de segurança do navegador impediram o acesso à câmera.",
  },
  "type-error": {
    title: "Parâmetros inválidos",
    description:
      "Não foi possível aplicar as configurações de vídeo da câmera.",
  },
};

function isScannerError(error: unknown): error is IScannerError {
  return (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    "message" in error
  );
}

function getCameraErrorDetails(error: IScannerError): {
  title: string;
  description: string;
} {
  if (error.kind !== "unknown") {
    return CAMERA_ERROR_MESSAGES[error.kind];
  }
  return {
    title: "Não foi possível acessar a câmera",
    description:
      error.message ||
      "Verifique as permissões do navegador e se há uma câmera conectada.",
  };
}

export default function QrScannerPage() {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [scanMessage, setScanMessage] = useState<ScanFeedbackMessage | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<LeitorTab>("leitor");
  const [historico, setHistorico] = useState<HistoricoMovimentacao[]>([]);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);
  const [historicoError, setHistoricoError] = useState<string | null>(null);

  const devices = useDevices();
  const scannerRef = useRef<IScannerHandle | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [useRelaxedConstraints, setUseRelaxedConstraints] = useState(false);
  const [cameraError, setCameraError] = useState<IScannerError | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [scannerKey, setScannerKey] = useState(0);

  // Prevent multiple rapid fires without stopping the active camera track
  const isProcessingScanRef = useRef(false);
  const lastScanTime = useRef<number>(0);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOperatorAuthError = useCallback((error: unknown): boolean => {
    if (!(error instanceof ApiError)) return false;
    if (error.status === 401) {
      performLogout();
      return true;
    }
    if (error.status === 403) {
      setSessionError(OPERATOR_SESSION_MISMATCH_MESSAGE);
      return true;
    }
    return false;
  }, []);

  const fetchHistorico = useCallback(async () => {
    setIsLoadingHistorico(true);
    setHistoricoError(null);
    try {
      const items = await api<HistoricoMovimentacao[]>(
        "/api/v1/movimentacao/historico?limit=30"
      );
      setHistorico(items);
      setSessionError(null);
    } catch (error: unknown) {
      if (handleOperatorAuthError(error)) return;
      setHistoricoError(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o histórico."
      );
    } finally {
      setIsLoadingHistorico(false);
    }
  }, [handleOperatorAuthError]);

  useEffect(() => {
    let isMounted = true;

    const verifyOperatorSession = async () => {
      try {
        await api("/api/v1/auth/me");
        if (isMounted) {
          setSessionError(null);
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        handleOperatorAuthError(error);
      }
    };

    void verifyOperatorSession();
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        void verifyOperatorSession();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, [handleOperatorAuthError]);

  const handleSelectTab = useCallback(
    (tab: LeitorTab) => {
      if (tab === "leitor" && activeTab === "leitor") return;
      setActiveTab(tab);
      if (tab === "historico") {
        setIsCameraReady(false);
        void fetchHistorico();
      }
    },
    [activeTab, fetchHistorico]
  );

  const videoConstraints = useMemo<MediaTrackConstraints>(() => {
    if (useRelaxedConstraints) {
      return selectedDeviceId
        ? { deviceId: selectedDeviceId, width: {}, height: {} }
        : { facingMode: undefined, width: {}, height: {} };
    }

    if (selectedDeviceId) {
      return {
        deviceId: { exact: selectedDeviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      };
    }

    return {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    };
  }, [selectedDeviceId, useRelaxedConstraints]);

  useEffect(() => {
    const videoEl = scannerRef.current?.getVideoElement();
    if (!videoEl) return;

    const markReady = () => {
      if (videoEl.srcObject) {
        setIsCameraReady(true);
        setCameraError(null);
      }
    };

    videoEl.addEventListener("playing", markReady);
    videoEl.addEventListener("loadeddata", markReady);

    return () => {
      videoEl.removeEventListener("playing", markReady);
      videoEl.removeEventListener("loadeddata", markReady);
    };
  }, [scannerKey, selectedDeviceId, useRelaxedConstraints]);

  const handleScan = useCallback(
    async (detectedCodes: IDetectedBarcode[]) => {
      if (detectedCodes.length === 0 || isProcessingScanRef.current) return;

      const now = Date.now();
      if (now - lastScanTime.current < 3000) return; // debounce 3s

      const token = detectedCodes[0]?.rawValue?.trim();
      if (!token) return;

      isProcessingScanRef.current = true;
      lastScanTime.current = now;
      setScanStatus("loading");

      try {
        const data = await api<ScanResponse>("/api/v1/movimentacao/scan", {
          method: "POST",
          body: JSON.stringify({
            qr_code_hash: token,
            local_acesso: "PORTARIA",
          }),
        });

        const vinculoLabel = data.student_tipo_vinculo
          ? formatVinculoLabel(data.student_tipo_vinculo)
          : undefined;
        const movimentoLabel =
          data.movement_type === "ENTRADA" ? "Entrada" : "Saída";

        if (data.status) {
          setScanStatus("success");
          setScanMessage({
            title: "Acesso Permitido!",
            subtitle: `${data.student_name} - ${movimentoLabel} • ${formatLocalAcesso(data.local_acesso)}`,
            vinculoLabel,
            photoUrl: data.student_photo_url,
          });
        } else {
          setScanStatus("error");
          setScanMessage({
            title: "Acesso Negado",
            subtitle: `${data.student_name} - Acesso bloqueado.`,
            vinculoLabel,
            photoUrl: data.student_photo_url,
          });
        }
      } catch (error: unknown) {
        if (handleOperatorAuthError(error)) {
          isProcessingScanRef.current = false;
          setScanStatus("idle");
          setScanMessage(null);
          return;
        }
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Token inválido ou expirado.";
        setScanStatus("error");
        setScanMessage({
          title: "Acesso Negado",
          subtitle: errorMessage,
        });
      }

      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      // Reset after 3 seconds
      resetTimeoutRef.current = setTimeout(() => {
        setScanStatus("idle");
        setScanMessage(null);
        isProcessingScanRef.current = false;
        resetTimeoutRef.current = null;
      }, 3000);
    },
    [handleOperatorAuthError]
  );

  const handleError = useCallback(
    (error: unknown) => {
      console.error("Camera error:", error);
      const normalizedError: IScannerError = isScannerError(error)
        ? error
        : {
            kind: "unknown",
            message: error instanceof Error ? error.message : String(error),
            cause: error,
          };

      if (
        normalizedError.kind === "overconstrained" &&
        !useRelaxedConstraints
      ) {
        setUseRelaxedConstraints(true);
        setIsCameraReady(false);
        setCameraError(null);
        setScannerKey((prev) => prev + 1);
        return;
      }

      setIsCameraReady(false);
      setCameraError(normalizedError);
    },
    [useRelaxedConstraints]
  );

  const handleRetryCamera = () => {
    setCameraError(null);
    setIsCameraReady(false);
    setUseRelaxedConstraints(false);
    setScannerKey((prev) => prev + 1);
  };

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setCameraError(null);
    setIsCameraReady(false);
    setUseRelaxedConstraints(false);
    setScannerKey((prev) => prev + 1);
  };

  const cameraErrorDetails = cameraError
    ? getCameraErrorDetails(cameraError)
    : null;

  return (
    <>
      {/* Sub-header Breadcrumb (Claro) */}
      <div className="px-4 py-2.5 bg-slate-50 text-xs text-slate-500 flex items-center gap-2 border-b border-slate-200 shrink-0">
        <span className="text-primary-600 font-semibold">Leitor</span>
        <span>&gt;</span>
        <span className="text-slate-700 font-medium">
          {activeTab === "leitor" ? "Escanear QR" : "Histórico"}
        </span>
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 p-4 flex flex-col items-center justify-center">
        <div
          className={
            activeTab === "leitor"
              ? "w-full flex flex-col items-center space-y-4"
              : "hidden"
          }
        >
          <div className="text-center space-y-1 mb-2">
            <h1 className="text-xl font-bold text-slate-900">Escaneamento</h1>
            <p className="text-xs text-slate-500">
              Posicione para validação de acesso
            </p>
          </div>

          {/* Visor da Câmera com Yudiel Scanner */}
          <div className="w-full max-w-[320px] bg-slate-900 rounded-3xl border-2 border-primary-500/50 p-2 relative flex flex-col shadow-lg overflow-hidden group">
            {/* Status da Câmera */}
            {cameraError || sessionError ? (
              <div className="absolute top-4 left-4 z-30 flex items-center gap-1.5 bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold text-rose-300">
                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                {sessionError ? "SESSÃO INATIVA" : "INDISPONÍVEL"}
              </div>
            ) : isCameraReady ? (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-400">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                AO VIVO
              </div>
            ) : (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-300">
                <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                INICIANDO
              </div>
            )}

            <div className="relative rounded-2xl overflow-hidden aspect-square bg-black">
              <Scanner
                key={scannerKey}
                ref={scannerRef}
                onScan={handleScan}
                onError={handleError}
                formats={["qr_code"]}
                constraints={videoConstraints}
                paused={Boolean(
                  cameraError || sessionError || activeTab !== "leitor"
                )}
                allowMultiple={true}
                scanDelay={4500}
                retryDelay={150}
                components={{
                  finder: false,
                  tracker: outline,
                }}
                styles={{
                  container: { width: "100%", height: "100%" },
                }}
              />

              {!cameraErrorDetails &&
                !sessionError &&
                scanStatus === "idle" && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 z-10">
                    <div className="w-full h-full relative">
                      <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-primary-400 rounded-tl-xl" />
                      <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-primary-400 rounded-tr-xl" />
                      <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-primary-400 rounded-bl-xl" />
                      <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-primary-400 rounded-br-xl" />
                    </div>
                  </div>
                )}

              {/* Sessão substituída por conta sem permissão de operador */}
              {sessionError && (
                <div className="absolute inset-0 bg-slate-950/95 z-20 flex flex-col items-center justify-center text-white p-5 text-center">
                  <ShieldAlert className="w-10 h-10 text-rose-400 mb-3" />
                  <span className="font-bold text-sm text-white">
                    Sessão de portaria inativa
                  </span>
                  <p className="text-xs mt-1.5 text-slate-300 leading-relaxed">
                    {sessionError}
                  </p>
                  <button
                    type="button"
                    onClick={performLogout}
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Entrar como Porteiro
                  </button>
                </div>
              )}

              {/* Erro ao acessar a câmera */}
              {cameraErrorDetails && !sessionError && (
                <div className="absolute inset-0 bg-slate-950/95 z-20 flex flex-col items-center justify-center text-white p-5 text-center">
                  <CameraOff className="w-10 h-10 text-amber-400 mb-3" />
                  <span className="font-bold text-sm text-white">
                    {cameraErrorDetails.title}
                  </span>
                  <p className="text-xs mt-1.5 text-slate-300 leading-relaxed">
                    {cameraErrorDetails.description}
                  </p>
                  <button
                    type="button"
                    onClick={handleRetryCamera}
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Tentar novamente
                  </button>
                </div>
              )}

              {/* Overlays de Loading / Sucesso / Erro */}
              {scanStatus === "loading" && (
                <div className="absolute inset-0 bg-slate-900/80 z-20 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span className="font-semibold text-sm">Validando...</span>
                </div>
              )}

              {(scanStatus === "success" || scanStatus === "error") &&
                scanMessage && (
                  <div
                    className={`absolute inset-0 z-20 flex flex-col items-center justify-center text-white p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200 ${
                      scanStatus === "success"
                        ? "bg-emerald-600/95"
                        : "bg-red-600/95"
                    }`}
                  >
                    {isRenderablePhotoSrc(scanMessage.photoUrl) ? (
                      <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/80 shadow-md mb-2 bg-white/10 flex items-center justify-center">
                        <PessoaPhoto
                          src={scanMessage.photoUrl}
                          alt={scanMessage.title}
                          sizes="64px"
                        />
                      </div>
                    ) : scanStatus === "success" ? (
                      <ShieldCheck className="w-16 h-16 text-emerald-200 mb-2" />
                    ) : (
                      <ShieldAlert className="w-16 h-16 text-red-200 mb-2" />
                    )}
                    <span className="font-bold text-lg text-center">
                      {scanMessage.title}
                    </span>
                    {scanMessage.vinculoLabel && (
                      <span className="mt-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[11px] font-bold uppercase tracking-wider">
                        {scanMessage.vinculoLabel}
                      </span>
                    )}
                    <span
                      className={`text-sm mt-1.5 text-center font-medium ${
                        scanStatus === "success"
                          ? "text-emerald-100"
                          : "text-red-100"
                      }`}
                    >
                      {scanMessage.subtitle}
                    </span>
                  </div>
                )}
            </div>

            <p className="text-[11px] text-slate-400 my-4 text-center">
              Aponte o QR Code para a câmera
            </p>
          </div>

          {devices.length > 1 && (
            <div className="w-full max-w-[320px] flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
              <Camera className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                aria-label="Selecionar câmera"
                value={selectedDeviceId}
                onChange={(e) => handleSelectDevice(e.target.value)}
                className="w-full text-xs text-slate-700 bg-transparent focus:outline-none"
              >
                <option value="">Câmera padrão (automática)</option>
                {devices.map((device, index) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Câmera ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {activeTab === "historico" && (
          <div className="w-full flex-1 flex flex-col space-y-4 self-stretch">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Histórico de Acessos
                </h1>
                <p className="text-xs text-slate-500">
                  Últimos registros validados na portaria
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchHistorico()}
                disabled={isLoadingHistorico}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isLoadingHistorico ? "animate-spin" : ""}`}
                />
                Atualizar
              </button>
            </div>

            {sessionError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center space-y-3">
                <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto" />
                <p className="text-sm font-bold text-slate-900">
                  Sessão de portaria inativa
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {sessionError}
                </p>
                <button
                  type="button"
                  onClick={performLogout}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Entrar como Porteiro
                </button>
              </div>
            ) : isLoadingHistorico ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                <span className="text-xs font-medium">
                  Carregando histórico...
                </span>
              </div>
            ) : historicoError ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-center space-y-2">
                <ShieldAlert className="w-7 h-7 text-rose-500 mx-auto" />
                <p className="text-xs font-medium text-rose-700">
                  {historicoError}
                </p>
              </div>
            ) : historico.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-600">
                  Nenhuma movimentação registrada ainda.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 overflow-y-auto pb-2">
                {historico.map((mov) => (
                  <div
                    key={mov.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-xl shrink-0 ${mov.tipo === "ENTRADA" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                      >
                        {mov.tipo === "ENTRADA" ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {mov.pessoa_nome}
                        </p>
                        <p className="text-[11px] font-semibold text-primary-700">
                          {formatVinculoLabel(mov.pessoa_tipo_vinculo)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {mov.tipo === "ENTRADA" ? "Entrada" : "Saída"} &bull;{" "}
                          {formatLocalAcesso(mov.local_acesso)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-600 shrink-0 text-right">
                      {new Date(mov.data_hora).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Navegação Inferior estilo App Mobile (Clara) */}
      <nav className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-around z-20 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] shrink-0">
        <button
          type="button"
          onClick={() => handleSelectTab("leitor")}
          className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === "leitor"
              ? "text-primary-600"
              : "text-slate-400 hover:text-primary-600"
          }`}
        >
          <QrCode className="w-6 h-6" />
          <span
            className={`text-[10px] ${activeTab === "leitor" ? "font-bold" : "font-medium"}`}
          >
            Leitor
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleSelectTab("historico")}
          className={`flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === "historico"
              ? "text-primary-600"
              : "text-slate-400 hover:text-primary-600"
          }`}
        >
          <History className="w-6 h-6" />
          <span
            className={`text-[10px] ${activeTab === "historico" ? "font-bold" : "font-medium"}`}
          >
            Histórico
          </span>
        </button>
      </nav>
    </>
  );
}
