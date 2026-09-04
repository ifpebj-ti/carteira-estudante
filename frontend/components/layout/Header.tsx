import { Search, Bell, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/Input';

export const Header = () => {
  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
      <div className="w-96">
        <Input 
          type="text" 
          placeholder="Buscar alunos ou carteiras..." 
          icon={<Search className="w-5 h-5" />}
          className="bg-slate-50 border-slate-200 focus:bg-white"
        />
      </div>
      <div className="flex items-center gap-6">
        <button className="relative text-slate-500 hover:text-slate-700">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
            A
          </div>
          <span className="text-sm font-medium text-slate-700">Adm Central</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </header>
  );
};
