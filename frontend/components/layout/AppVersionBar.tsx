import { Tag } from "lucide-react";

/**
 * Retorna a versão da aplicação injetada no build via `NEXT_PUBLIC_APP_VERSION`,
 * com fallback seguro para `"dev"` em ambiente local.
 */
export function getAppVersion(): string {
  const rawVersion = process.env.NEXT_PUBLIC_APP_VERSION || "dev";
  const normalized = rawVersion.trim();
  return normalized || "dev";
}

interface AppVersionBarProps {
  className?: string;
}

export function AppVersionBar({ className = "" }: AppVersionBarProps) {
  const version = getAppVersion();

  return (
    <div
      data-testid="app-version-bar"
      aria-label={`Versão da aplicação: ${version}`}
      className={`bg-slate-100/80 border-b border-slate-200 py-1.5 flex items-center justify-end gap-1.5 text-[11px] text-slate-500 shrink-0 ${className}`.trim()}
    >
      <Tag className="w-3 h-3 text-primary-600 shrink-0" aria-hidden="true" />
      <span>Versão</span>
      <span className="font-mono font-semibold text-slate-700">{version}</span>
    </div>
  );
}
