export interface AuthTokenPayload {
  sub?: string;
  account_type?: string;
  role?: string;
  perfil?: string;
  exp?: number;
}

const OPERATOR_HOME_ROUTES: Record<string, string> = {
  ADMIN: "/admin",
  PORTEIRO: "/mobile/leitor",
};

/**
 * Resolve a rota inicial a partir do tipo de conta e papel do usuário autenticado.
 * Suporta tokens do login unificado (`account_type` + `role`) e do OAuth Google (`perfil`).
 */
export function resolveHomeRoute(
  accountType?: string | null,
  role?: string | null
): string | null {
  if (accountType === "pessoa") {
    return "/mobile/aluno";
  }

  if (accountType === "operador" || (!accountType && role)) {
    const normalizedRole = role?.toUpperCase();
    return normalizedRole
      ? (OPERATOR_HOME_ROUTES[normalizedRole] ?? null)
      : null;
  }

  return null;
}

/**
 * Decodifica o payload de um JWT sem verificação criptográfica apenas para roteamento de UI.
 * A validação de assinatura e permissões é sempre feita pelo backend.
 */
export function decodeJwtPayload(token: string): AuthTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    const payload = JSON.parse(json) as AuthTokenPayload;

    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getEffectiveRole(
  payload: AuthTokenPayload
): string | undefined {
  return payload.role || payload.perfil;
}

export function isOperatorSession(payload: AuthTokenPayload): boolean {
  if (payload.account_type === "operador") {
    return true;
  }

  const role = getEffectiveRole(payload)?.toUpperCase();
  return !payload.account_type && (role === "ADMIN" || role === "PORTEIRO");
}

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

/**
 * Limpa eventual token legado em localStorage e redireciona ao endpoint de logout
 * do backend para remover o cookie HttpOnly `access_token`.
 */
export function performLogout(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem("token");
  // Redirecionamento completo para o endpoint FastAPI de logout remover o cookie HttpOnly.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `${getApiBaseUrl()}/api/v1/auth/logout`;
}
