'use client';

import { ShieldCheck, GraduationCap, Mail, Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      
      {/* Lado Esquerdo - Branding (Escondido no celular, ocupa 50% no desktop) */}
      <div className="hidden md:flex md:w-1/2 bg-primary-900 relative flex-col justify-between p-12 overflow-hidden">
        
        {/* Imagem de Fundo do Campus com opacidade ajustada e gradiente */}
        <div 
          className="absolute inset-0 z-0 opacity-60 bg-cover bg-center bg-no-repeat mix-blend-overlay"
          style={{ backgroundImage: "url('/ifpe_belo_jardim.jpeg')" }}
        ></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary-900/60 to-primary-950/70"></div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 backdrop-blur-sm">
            <ShieldCheck className="w-8 h-8 text-primary-300" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide uppercase">
            IFPE <span className="text-primary-300 font-medium">Belo Jardim</span>
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            Gestão Digital de <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 to-emerald-300">
              Credenciais Estudantis
            </span>
          </h1>
          <p className="text-primary-100/80 text-lg leading-relaxed">
            Plataforma administrativa para controle de acessos, emissão de carteiras digitais dinâmicas e auditoria de movimentações do campus.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-primary-300/60 text-sm font-medium">
          <GraduationCap className="w-5 h-5" />
          <span>Sistema de Controle de Acesso Restrito</span>
        </div>
      </div>

      {/* Lado Direito - Área de Login (Ocupa 100% no celular, 50% no desktop) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative z-10">
        
        {/* Header mobile (visível apenas em telas pequenas) */}
        <div className="md:hidden flex items-center gap-2 mb-10">
          <div className="bg-primary-900 p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-lg font-bold text-primary-900 tracking-wide uppercase">
            IFPE <span className="text-primary-600 font-medium">Belo Jardim</span>
          </span>
        </div>

        {/* Cartão Central de Login */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10">
          <div className="mb-8 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesso ao Sistema</h2>
            <p className="text-sm text-slate-500">
              Insira suas credenciais ou utilize sua conta institucional.
            </p>
          </div>

          <div className="space-y-5">

            {/* Formulário Tradicional de E-mail e Senha */}
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail Institucional</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input 
                    type="email" 
                    placeholder="admin@belojardim.ifpe.gov.br" 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">Senha</label>
                  <a href="#" className="text-xs font-semibold text-primary-600 hover:text-primary-700">Esqueceu a senha?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm py-3.5 px-4 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-sm shadow-primary-600/20"
                >
                  Entrar no Sistema
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Divisor "OU" */}
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-xs text-slate-400 uppercase tracking-wider font-medium">ou</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Botão de Login com o Google */}
            <button 
              className="w-full relative flex items-center justify-center gap-3 bg-white border-2 border-slate-200 hover:border-primary-500 hover:bg-slate-50 text-slate-700 font-semibold text-sm py-3.5 px-4 rounded-xl transition-all duration-200 active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuar com Google
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-8 text-center">
          &copy; {new Date().getFullYear()} Instituto Federal de Pernambuco.<br className="sm:hidden" /> Todos os direitos reservados.
        </p>
      </div>

    </div>
  );
}