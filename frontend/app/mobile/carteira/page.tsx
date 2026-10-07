'use client';

import { ShieldCheck, Download, ArrowLeft } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function DigitalWalletPage() {
  return (
    <>
      {/* Sub-header de Navegação */}
      <div className="px-4 py-3 flex items-center justify-between bg-white/60 backdrop-blur-md border-b border-slate-100 z-10">
        <button className="text-slate-600 hover:text-slate-900 p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-slate-800 text-base">Minha Carteira</h1>
        {/* Div vazia com a mesma largura do botão ArrowLeft para manter o título centralizado */}
        <div className="w-7"></div>
      </div>

      {/* Conteúdo rolável */}
      <main className="flex-1 p-4 space-y-4 pb-24 overflow-y-auto">
        
        {/* Card da Carteira Digital (Estilo ID Card) */}
        <div className="w-full bg-gradient-to-br from-primary-800 to-primary-950 rounded-2xl shadow-xl overflow-hidden relative text-white p-5 border border-white/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
          
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary-200" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-200">Carteira de Estudante Interno</span>
            </div>
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></span>
          </div>

          <div className="flex gap-4 items-center">
            <div className="w-20 h-24 bg-white/10 rounded-xl overflow-hidden border-2 border-white/20 shrink-0">
              <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150" alt="Foto" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">João da Silva</h2>
              <p className="text-xs text-primary-200 mt-1">Matrícula: <span className="text-white font-semibold">2023102457</span></p>
              <p className="text-xs text-primary-200 mt-0.5">Curso: <span className="text-white font-semibold">Engenharia de Computação</span></p>
            </div>
          </div>
        </div>

        {/* Seção do QR Code Central */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 flex flex-col items-center text-center">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner mb-3">
            <QRCodeSVG value="joao-silva-2023102457-hash-dinamico" size={180} />
          </div>
          <p className="text-xs text-slate-500 max-w-[240px]">
            Apresente este QR Code nas entradas e saídas do campus.
          </p>
        </div>

        {/* Badge de Validade */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-900">Carteira válida</p>
            <p className="text-[11px] text-emerald-700">Atualizada em 08/08/2026 às 07:40</p>
          </div>
        </div>

        <p className="text-[11px] text-center text-slate-400 italic">
          Esta carteira é pessoal e intransferível.
        </p>

      </main>

      {/* Rodapé fixo com botão de ação */}
      <footer className="absolute bottom-0 inset-x-0 bg-white/80 backdrop-blur-md p-4 border-t border-slate-200 z-20">
        <button className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-600/30 transition-all active:scale-[0.98] text-sm">
          <Download className="w-4 h-4" /> Baixar Carteira (PDF)
        </button>
      </footer>
    </>
  );
}