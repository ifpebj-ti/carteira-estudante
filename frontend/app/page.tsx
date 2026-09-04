'use client';

import { useState } from 'react';
import { Contact, ShieldCheck, CheckCircle2, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      router.push('/aluno');
    } catch (err) {
      // Generic error as per security guidelines
      setError('Credenciais inválidas ou erro no servidor. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      {/* Left Column - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative bg-primary-900 text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
            alt="Campus entrance" 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
        </div>
        
        <div className="relative z-10 p-12 flex flex-col justify-center h-full max-w-xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/30">
              <Contact className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Carteira de<br />Estudante
            </h1>
          </div>
          
          <h2 className="text-xl font-medium mb-12 text-white/90">
            Controle e identificação dos alunos de forma segura e eficiente.
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/80">
              <ShieldCheck className="w-5 h-5 text-green-400" />
              <span>Autenticação institucional segura</span>
            </div>
            <div className="flex items-center gap-3 text-white/80">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span>Acesso restrito a administradores e alunos</span>
            </div>
          </div>
          
          <div className="absolute bottom-12 left-12 flex items-center gap-2 text-white/60 text-sm font-semibold tracking-widest uppercase">
            <span>IFPE - Campus Belo Jardim</span>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Acesse sua conta</h2>
            <p className="mt-2 text-sm text-slate-600">
              Utilize suas credenciais institucionais para entrar no sistema.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <Input
                id="email"
                type="text"
                required
                label="E-mail ou matrícula"
                placeholder="seu.email@exemplo.com.br"
                icon={<Contact className="w-5 h-5" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="password">
                    Senha
                  </label>
                  <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                    Esqueci minha senha
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  icon={<Lock className="w-5 h-5" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                Lembrar acesso
              </label>
            </div>

            <Button type="submit" fullWidth disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
            
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500 font-medium">OU</span>
              </div>
            </div>

            <Button type="button" variant="outline" fullWidth className="mt-6 gap-3">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Entrar com Google
            </Button>
          </form>
          
          <div className="mt-8 pt-8 text-center">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} CARTEIRA DE ESTUDANTE INTERNO
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

