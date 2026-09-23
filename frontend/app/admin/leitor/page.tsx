'use client';

import { useState, useCallback, useRef } from 'react';
import { History, QrCode, Settings, Bell, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { api } from '@/services/api';

type ScanStatus = 'idle' | 'loading' | 'success' | 'error';

interface ScanResponse {
  status: boolean;
  student_name: string;
  movement_type: string;
}

export default function QrScannerPage() {
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle');
  const [scanMessage, setScanMessage] = useState<{ title: string; subtitle: string } | null>(null);
  const [isScannerPaused, setIsScannerPaused] = useState(false);
  
  // Prevent multiple rapid fires
  const lastScanTime = useRef<number>(0);

  const handleScan = useCallback(async (detectedCodes: any[]) => {
    if (detectedCodes.length === 0 || isScannerPaused || scanStatus === 'loading') return;
    
    const now = Date.now();
    if (now - lastScanTime.current < 3000) return; // debounce 3s
    
    const token = detectedCodes[0].rawValue;
    if (!token) return;

    lastScanTime.current = now;
    setScanStatus('loading');
    setIsScannerPaused(true);

    try {
      const data = await api<ScanResponse>('/api/v1/movimentacao/scan', {
        method: 'POST',
        body: JSON.stringify({
          qr_code_hash: token,
          operator_id: 1, // Mock temporary operator ID
        }),
      });

      if (data.status) {
        setScanStatus('success');
        setScanMessage({
          title: 'Acesso Permitido!',
          subtitle: `${data.student_name} - ${data.movement_type}`,
        });
      }
    } catch (error: any) {
      setScanStatus('error');
      setScanMessage({
        title: 'Acesso Negado',
        subtitle: error.message || 'Token inválido ou expirado.',
      });
    }

    // Reset after 3 seconds
    setTimeout(() => {
      setScanStatus('idle');
      setScanMessage(null);
      setIsScannerPaused(false);
    }, 3000);
  }, [isScannerPaused, scanStatus]);

  const handleError = (error: unknown) => {
    console.error("Camera error:", error);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start text-slate-900">
      <div className="w-full max-w-md min-h-screen bg-slate-50 flex flex-col shadow-2xl relative justify-between">
        
        {/* Top Bar Mobile (Clara) */}
        <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            <div className="bg-primary-600 text-white p-1.5 rounded-lg font-bold text-xs">QR</div>
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

          {/* Visor da Câmera com Yudiel Scanner */}
          <div className="w-full max-w-[320px] bg-slate-900 rounded-3xl border-2 border-primary-500/50 p-2 relative flex flex-col shadow-lg overflow-hidden group">
            
            {/* Tag AO VIVO */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold text-emerald-400">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              AO VIVO
            </div>

            <div className="relative rounded-2xl overflow-hidden aspect-square bg-black">
              <Scanner 
                onScan={handleScan}
                onError={handleError}
                paused={isScannerPaused}
                components={{
                  finder: false,
                }}
                styles={{
                  container: { width: '100%', height: '100%' },
                }}
              />

              {/* Overlays de Loading / Sucesso / Erro */}
              {scanStatus === 'loading' && (
                <div className="absolute inset-0 bg-slate-900/80 z-20 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span className="font-semibold text-sm">Validando...</span>
                </div>
              )}

              {scanStatus === 'success' && scanMessage && (
                <div className="absolute inset-0 bg-emerald-600/95 z-20 flex flex-col items-center justify-center text-white p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                  <ShieldCheck className="w-16 h-16 text-emerald-200 mb-2" />
                  <span className="font-bold text-lg text-center">{scanMessage.title}</span>
                  <span className="text-sm mt-1 text-emerald-100 text-center font-medium">{scanMessage.subtitle}</span>
                </div>
              )}

              {scanStatus === 'error' && scanMessage && (
                <div className="absolute inset-0 bg-red-600/95 z-20 flex flex-col items-center justify-center text-white p-4 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                  <ShieldAlert className="w-16 h-16 text-red-200 mb-2" />
                  <span className="font-bold text-lg text-center">{scanMessage.title}</span>
                  <span className="text-sm mt-1 text-red-100 text-center font-medium">{scanMessage.subtitle}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400 my-4 text-center">
              Aponte o QR Code para a câmera
            </p>
          </div>

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