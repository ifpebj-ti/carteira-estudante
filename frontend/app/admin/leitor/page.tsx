'use client';

import { useState } from 'react';
import { Camera, History, QrCode, Settings, Bell } from 'lucide-react';

export default function QrScannerPage() {
  const [simulated, setSimulated] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start text-slate-900">
      
      {/* Container simulando app mobile */}
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col shadow-2xl relative justify-between">
        
        {/* Top Bar Mobile (Clara) */}
        <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="bg-primary-600 text-white p-1.5 rounded-lg font-bold text-xs">QR</div>
            {/* Título limpo, sem o "INTERNO" */}
            <span className="font-bold text-slate-800 text-sm block leading-tight">Carteira de Estudante</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <Bell className="w-5 h-5 cursor-pointer hover:text-primary-600 transition-colors" />
            <Settings className="w-5 h-5 cursor-pointer hover:text-primary-600 transition-colors" />
          </div>
        </header>

        {/* Sub-header Breadcrumb (Claro) */}
        <div className="px-4 py-2.5 bg-slate-50 text-xs text-slate-500 flex items-center gap-2 border-b border-slate-200">
          <span className="text-primary-600 font-semibold">Leitor</span>
          <span>&gt;</span>
          <span className="text-slate-700 font-medium">Escanear QR</span>
        </div>

        {/* Conteúdo principal */}
        <main className="flex-1 p-4 flex flex-col items-center justify-center space-y-4">
          
          <div className="text-center space-y-1 mb-2">
            <h1 className="text-xl font-bold text-slate-900">Escaneamento</h1>
            <p className="text-xs text-slate-500">Posicione para validação de acesso</p>
          </div>

          {/* Visor simulado da câmera (Mantido escuro para simular a lente) */}
          <div className="w-full max-w-[300px] h-[340px] bg-slate-900 rounded-3xl border-2 border-primary-500/50 p-4 relative flex flex-col items-center justify-center shadow-lg overflow-hidden group">
            
            {/* Tag AO VIVO */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-400">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              AO VIVO
            </div>

            {/* Mock do QR Code Central no visor */}
            <div className="relative w-48 h-48 border-2 border-dashed border-primary-400/70 rounded-2xl flex items-center justify-center bg-primary-950/40">
              <QrCode className="w-28 h-28 text-primary-400/40 animate-pulse" />
              
              {simulated && (
                <div className="absolute inset-0 bg-emerald-500/95 rounded-2xl flex flex-col items-center justify-center text-white p-2 animate-fadeIn backdrop-blur-sm">
                  <span className="font-bold text-sm">Acesso Permitido!</span>
                  <span className="text-xs mt-1">João da Silva</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 mt-5 text-center">
              Aponte o QR Code para a câmera
            </p>
          </div>

          <p className="text-[11px] text-slate-500 text-center mt-2">
            Posicione o QR Code dentro da área indicada.
          </p>

          {/* Botão de Simulação de Leitura */}
          <button 
            onClick={() => {
              setSimulated(true);
              setTimeout(() => setSimulated(false), 2500);
            }}
            className="w-full max-w-[300px] flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] text-sm mt-4"
          >
            <Camera className="w-5 h-5" /> Simular Leitura
          </button>

        </main>

        {/* Navegação Inferior estilo App Mobile (Clara) */}
        <nav className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-around z-20 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
          <button className="flex flex-col items-center gap-1.5 text-primary-600">
            <QrCode className="w-6 h-6" />
            <span className="text-[10px] font-bold">Leitor</span>
          </button>
          <button className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-primary-600 transition-colors">
            <History className="w-6 h-6" />
            <span className="text-[10px] font-medium">Histórico</span>
          </button>
        </nav>

      </div>
    </div>
  );
}