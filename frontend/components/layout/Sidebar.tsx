import { LayoutDashboard, Users, ArrowRightLeft, FileText, Settings } from 'lucide-react';

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-primary-900 text-white flex flex-col hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-primary-500 p-2 rounded-lg">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg leading-tight">Carteira de<br/>Estudante</span>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-100 hover:bg-primary-800 transition-colors">
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-medium text-sm">Dashboard</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary-800 text-white transition-colors">
          <Users className="w-5 h-5" />
          <span className="font-medium text-sm">Alunos</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-100 hover:bg-primary-800 transition-colors">
          <ArrowRightLeft className="w-5 h-5" />
          <span className="font-medium text-sm">Movimentações</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-100 hover:bg-primary-800 transition-colors">
          <FileText className="w-5 h-5" />
          <span className="font-medium text-sm">Relatórios</span>
        </a>
        <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-primary-100 hover:bg-primary-800 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="font-medium text-sm">Configurações</span>
        </a>
      </nav>

      <div className="p-6 mt-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-800 flex items-center justify-center font-bold">
            AD
          </div>
          <div>
            <p className="text-sm font-semibold">Adm. Geral</p>
            <p className="text-xs text-primary-300">admin@belojardim.ifpe.gov.br</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
