"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShieldCheck, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  // Estados do formulário
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Fazendo o POST para a rota unificada
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login, senha }),
        credentials: "include", // Garante o recebimento do cookie de sessão
      });

      if (!response.ok) {
        if (response.status === 401)
          throw new Error("Login ou senha incorretos.");
        if (response.status === 403)
          throw new Error("Esta conta está desativada.");
        throw new Error("Erro ao conectar com o servidor.");
      }

      const data = await response.json();

      // Roteamento inteligente baseado no tipo de conta
      if (data.account_type === "operador") {
        router.push("/admin/dashboard");
      } else if (data.account_type === "pessoa") {
        router.push("/mobile/aluno");
      } else {
        throw new Error("Tipo de conta não reconhecido pelo sistema.");
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-900 overflow-x-hidden">
      {/* Lado Esquerdo - Branding (Visível APENAS no Desktop) */}
      <div className="hidden md:flex md:w-1/2 bg-primary-900 relative flex-col justify-between p-12 overflow-hidden shrink-0 min-h-screen">
        {/* Imagem de Fundo do Campus com opacidade e gradiente */}
        <div className="absolute inset-0 z-0 opacity-60 bg-cover bg-center bg-no-repeat mix-blend-overlay"></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary-900/60 to-primary-950/70"></div>

        {/* Bloco de Identificação */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="bg-primary-950/40 p-2.5 rounded-2xl border border-white/20 backdrop-blur-md shadow-lg shrink-0">
            <ShieldCheck className="w-8 h-8 text-primary-200" />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-wider text-base uppercase leading-tight">
              CARTEIRA DE IDENTIFICAÇÃO
            </h1>
            <p className="text-primary-200 font-medium text-sm tracking-wide uppercase mt-0.5">
              IFPE BELO JARDIM
            </p>
          </div>
        </div>

        {/* Texto descritivo central */}
        <div className="relative z-10 max-w-md my-auto py-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Carteira de Identificação <br />
            IFPE Belo Jardim
          </h2>
          <p className="text-primary-100/80 text-base leading-relaxed">
            Sistema oficial de gestão de credenciais estudantis do campus.
            Autenticação institucional segura e controle da movimentação no
            campus.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-primary-300/70 text-xs font-medium uppercase tracking-wider">
          <span>Campus Belo Jardim - PE</span>
        </div>
      </div>

      {/* Lado Direito (ou Tela Inteira no Mobile) - Área do Formulário de Login */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-slate-50 relative z-10 min-h-screen md:min-h-0">
        {/* Identificação compacta visível apenas no mobile */}
        <div className="md:hidden flex items-center gap-3 mb-8 w-full max-w-md">
          <div className="bg-primary-900 p-2.5 rounded-xl text-white shadow-sm shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-slate-900 font-bold tracking-tight text-sm uppercase leading-tight">
              CARTEIRA DE IDENTIFICAÇÃO
            </h1>
            <p className="text-primary-600 font-semibold text-xs tracking-wide uppercase mt-0.5">
              IFPE BELO JARDIM
            </p>
          </div>
        </div>

        {/* Cartão Central de Login */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 flex flex-col">
          <div className="text-center sm:text-left mb-6">
            <div className="mb-4 flex justify-center sm:justify-start">
              <Image
                src="/image.png"
                alt="Logótipo institucional IFPE"
                width={200}
                height={60}
                className="object-contain"
              />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Acesse sua conta
            </h3>
            <p className="text-sm text-slate-500">
              Utilize sua conta institucional para entrar no sistema.
            </p>
          </div>

          {/* Caixa de Texto Informativa */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-center sm:text-left">
            <p className="text-xs text-slate-600 leading-relaxed">
              <strong className="text-black font-extrabold">
                Carteira destinada a identificação de alunos e servidores do
                IFPE do Campus Belo Jardim
              </strong>
              .
            </p>
          </div>

          {/* Alerta de Erro */}
          {error && (
            <div className="mb-6 bg-rose-50 border-l-4 border-rose-500 p-3 rounded-md flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700 font-medium">{error}</p>
            </div>
          )}

          {/* Formulário de Login Híbrido */}
          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div>
              <label
                htmlFor="login"
                className="block text-sm font-semibold text-slate-700 mb-1.5"
              >
                Matrícula, E-mail ou Login
              </label>
              <input
                id="login"
                type="text"
                required
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="Ex: 20241EWBJ0999"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="senha"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Senha
                </label>
                <a
                  href="#"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <input
                  id="senha"
                  type={showPassword ? "text" : "password"}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Conectando...
                </>
              ) : (
                "Entrar no Sistema"
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative flex items-center mb-6">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">
              Ou continue com
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Botão de Login com o Google */}
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/login/google`}
            className="w-full relative flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-primary-500 hover:bg-slate-50 text-slate-800 font-bold text-sm py-3.5 px-4 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Entrar com Google
          </a>
        </div>

        <p className="text-xs text-slate-400 mt-8 text-center">
          &copy; {new Date().getFullYear()} Instituto Federal de Pernambuco.
          Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
