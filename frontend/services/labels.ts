export const VINCULO_LABELS: Record<string, string> = {
  ALUNO: "Estudante",
  PROFESSOR: "Professor(a)",
  SERVIDOR: "Servidor(a)",
  COORDENACAO: "Coordenação",
};

export const LOCAL_ACESSO_LABELS: Record<string, string> = {
  PORTARIA: "Portaria",
};

/**
 * Converte o enum de vínculo institucional em rótulo legível na interface.
 */
export function formatVinculoLabel(vinculo?: string | null): string {
  if (!vinculo) {
    return "Titular";
  }
  return VINCULO_LABELS[vinculo] || vinculo;
}

/**
 * Converte o identificador de ponto de acesso em rótulo amigável ao usuário.
 */
export function formatLocalAcesso(local?: string | null): string {
  if (!local) {
    return "Portaria";
  }
  return LOCAL_ACESSO_LABELS[local] || local;
}
