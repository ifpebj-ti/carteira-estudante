"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  FileText,
  Users,
  LayoutDashboard,
  ShieldCheck,
  Download,
  Loader2,
  AlertCircle,
  CreditCard,
  Camera, 
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
  email?: string;
  foto_url?: string | null;
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
  const [imgError, setImgError] = useState(false);
  
  // Novos estados para o upload da foto
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMeusDados = async () => {
      setCarregando(true);
      setErro("");
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${API_URL}/api/v1/auth/pessoa/me`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        if (res.status === 401 || res.status === 403) {
          router.push("/");
          return;
        }

        if (!res.ok) throw new Error("Erro ao carregar sua carteira digital.");

        const data = await res.json();
        if (isMounted) setAluno(data);
      } catch (err) {
        if (isMounted) {
          const errorObject = err as Error;
          setErro(errorObject.message || "Erro de conexão com o servidor.");
        }
      } finally {
        if (isMounted) setCarregando(false);
      }
    };

    fetchMeusDados();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // --- NOVA FUNÇÃO DE UPLOAD SEGUINDO O MÉTODO DO ADMIN ---
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !aluno) return;

    // 1. Lemos o arquivo e convertemos para Base64 (texto)
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        setUploadingFoto(true);
        const base64Foto = reader.result as string;

        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        
        // 2. Disparamos o PATCH exatamente como na tela de edição
        const res = await fetch(`${API_URL}/api/v1/pessoas/${aluno.matricula}`, {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ foto_url: base64Foto }),
        });

        if (!res.ok) throw new Error("Falha ao salvar a imagem no banco.");

        // 3. Atualizamos a foto na tela instantaneamente sem recarregar a página
        setAluno({ ...aluno, foto_url: base64Foto });
        setImgError(false); // Remove o erro caso a foto anterior estivesse quebrada
      } catch (err) {
        alert("Não foi possível atualizar a foto. Tente uma imagem menor.");
      } finally {
        setUploadingFoto(false);
        // Limpa o input para permitir escolher a mesma foto novamente se der erro
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  };

  if (carregando) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-500 bg-slate-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <p className="font-medium text-sm">Carregando credenciais...</p>
      </div>
    );
  }

  if (erro || !aluno) {
    return (
      <div className="p-4 h-full flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-rose-200 rounded-2xl p-6 flex flex-col items-center text-center gap-4 shadow-sm w-full">
          <AlertCircle className="w-10 h-10 text-rose-500" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">Erro de Acesso</h3>
          <p className="text-sm text-slate-600 mb-4">{erro}</p>
          <button onClick={() => router.push("/")} className="w-full px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold shadow-sm">
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  const imagemSegura = (aluno.foto_url && !imgError) 
    ? aluno.foto_url 
    : "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80";

  return (
    <div className="bg-slate-50 p-4 md:p-6 flex flex-col space-y-6 w-full max-w-md mx-auto h-full overflow-y-auto pb-10">
      
      {/* Input invisível que abre a galeria/câmera do celular */}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFotoChange} 
        className="hidden" 
      />

      {/* Cabeçalho de Perfil com Botão de Upload */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          
          {/* Avatar clicável para envio de foto */}
          <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <div className="relative w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden shrink-0 border-2 border-slate-200 shadow-sm">
              {uploadingFoto ? (
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              ) : (
                <Image src={imagemSegura} alt={aluno.nome} fill sizes="56px" className="object-cover" onError={() => setImgError(true)} />
              )}
            </div>
            {/* Ícone de câmera no canto da foto */}
            {!uploadingFoto && (
              <div className="absolute bottom-0 right-0 bg-primary-600 rounded-full p-1.5 shadow-md border-2 border-white">
                <Camera className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
          
          <div>
            <h1 className="text-sm font-bold text-slate-900 line-clamp-1">{aluno.nome}</h1>
            <p className="text-xs text-slate-500 font-mono">{aluno.matricula}</p>
          </div>
        </div>
      </div>

      {/* Carteira Digital Visual */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 relative overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-900">Carteira Digital</h2>
          <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider ${aluno.status ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
            {aluno.status ? "Ativa" : "Inativa"}
          </span>
        </div>

        <div className="w-full bg-gradient-to-br from-[#457c66] to-[#254538] rounded-2xl shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          
          <div className="p-4 border-b border-white/10 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-white/90" />
            <div>
              <p className="text-[10px] text-white/90 font-bold leading-tight uppercase tracking-wider">Instituto Federal</p>
              <p className="text-[9px] text-white/70 leading-tight uppercase">Belo Jardim</p>
            </div>
          </div>

          <div className="p-5 flex gap-4">
            <div className="relative w-16 h-20 bg-white/10 rounded-lg shrink-0 overflow-hidden border border-white/20">
              <Image src={imagemSegura} alt="Foto do aluno" fill className="object-cover" onError={() => setImgError(true)} />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-[10px] text-white/70 font-semibold uppercase mb-0.5">Estudante</p>
              <p className="text-sm font-bold text-white leading-tight mb-2 line-clamp-2">{aluno.nome.toUpperCase()}</p>
              <p className="text-[10px] text-white/70 font-semibold uppercase mb-0.5">Curso</p>
              <p className="text-[11px] font-semibold text-white/90 leading-tight line-clamp-1">{aluno.curso || "Não informado"}</p>
            </div>
          </div>

          <div className="px-5 pb-5 flex items-end justify-between">
            <div className="bg-white p-1.5 rounded-lg shrink-0 shadow-sm">
              <QRCodeSVG value={aluno.qr_code_hash || aluno.matricula} size={50} />
            </div>
            <div className="text-right">
              <p className="text-[9px] text-white/70 uppercase font-semibold">Matrícula</p>
              <p className="text-xs text-white font-bold font-mono tracking-wider">{aluno.matricula}</p>
            </div>
          </div>
        </div>

        <button className="w-full mt-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
          <Download className="w-4 h-4" /> Salvar Offline
        </button>
      </div>

      {/* Informações Detalhadas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-8">
        <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" /> Meus Dados
        </h2>
        
        <div className="space-y-4">
          <div className="flex flex-col border-b border-slate-100 pb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> CPF</span>
            <span className="text-sm font-medium text-slate-900 font-mono mt-0.5">{formatarCPF(aluno.cpf)}</span>
          </div>
          <div className="flex flex-col border-b border-slate-100 pb-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5"><LayoutDashboard className="w-3.5 h-3.5" /> Modalidade</span>
            <span className="text-sm font-medium text-slate-900 mt-0.5">{aluno.modalidade || "Presencial"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> E-mail Institucional</span>
            <span className="text-sm font-medium text-slate-900 mt-0.5 break-all">{aluno.email || "--"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}