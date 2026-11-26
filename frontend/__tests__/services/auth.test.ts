import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodeJwtPayload,
  getApiBaseUrl,
  getEffectiveRole,
  isOperatorSession,
  performLogout,
  resolveHomeRoute,
} from "@/services/auth";

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createJwt(payload: Record<string, unknown>): string {
  const header = encodeBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encodeBase64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe("services/auth", () => {
  const originalLocation = window.location;

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  describe("decodeJwtPayload", () => {
    it("decodes a valid JWT payload including UTF-8 characters", () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const token = createJwt({
        sub: "42",
        account_type: "pessoa",
        role: "Coordenação",
        exp: futureExp,
      });

      const payload = decodeJwtPayload(token);
      expect(payload).toEqual({
        sub: "42",
        account_type: "pessoa",
        role: "Coordenação",
        exp: futureExp,
      });
    });

    it("returns null for expired tokens", () => {
      const pastExp = Math.floor(Date.now() / 1000) - 10;
      const token = createJwt({
        sub: "42",
        account_type: "pessoa",
        exp: pastExp,
      });

      expect(decodeJwtPayload(token)).toBeNull();
    });

    it("returns null for malformed or incomplete JWT strings", () => {
      expect(decodeJwtPayload("invalid")).toBeNull();
      expect(decodeJwtPayload("a..c")).toBeNull();
      expect(decodeJwtPayload("a.not-valid-base64.c")).toBeNull();
      expect(decodeJwtPayload(`a.${encodeBase64Url("not-json")}.c`)).toBeNull();
    });
  });

  describe("getEffectiveRole", () => {
    it("prefers role over perfil and falls back to perfil", () => {
      expect(getEffectiveRole({ role: "ADMIN", perfil: "PORTEIRO" })).toBe(
        "ADMIN"
      );
      expect(getEffectiveRole({ perfil: "PORTEIRO" })).toBe("PORTEIRO");
      expect(getEffectiveRole({})).toBeUndefined();
    });
  });

  describe("resolveHomeRoute", () => {
    it("resolves route for pessoa accounts", () => {
      expect(resolveHomeRoute("pessoa", "ALUNO")).toBe("/mobile/aluno");
      expect(resolveHomeRoute("pessoa", "PROFESSOR")).toBe("/mobile/aluno");
    });

    it("resolves routes for operador accounts case-insensitively", () => {
      expect(resolveHomeRoute("operador", "ADMIN")).toBe("/admin");
      expect(resolveHomeRoute("operador", "admin")).toBe("/admin");
      expect(resolveHomeRoute("operador", "PORTEIRO")).toBe("/mobile/leitor");
    });

    it("supports legacy OAuth tokens without account_type", () => {
      expect(resolveHomeRoute(undefined, "ADMIN")).toBe("/admin");
      expect(resolveHomeRoute(null, "PORTEIRO")).toBe("/mobile/leitor");
    });

    it("returns null for unknown account types or roles", () => {
      expect(resolveHomeRoute("operador", "DESCONHECIDO")).toBeNull();
      expect(resolveHomeRoute("operador", null)).toBeNull();
      expect(resolveHomeRoute("desconhecido", "ADMIN")).toBeNull();
      expect(resolveHomeRoute(null, null)).toBeNull();
    });
  });

  describe("isOperatorSession", () => {
    it("distinguishes operators from pessoa accounts", () => {
      expect(
        isOperatorSession({ account_type: "operador", role: "ADMIN" })
      ).toBe(true);
      expect(isOperatorSession({ account_type: "pessoa", role: "ADMIN" })).toBe(
        false
      );
      expect(isOperatorSession({ perfil: "ADMIN" })).toBe(true);
      expect(isOperatorSession({ perfil: "porteiro" })).toBe(true);
      expect(isOperatorSession({ role: "ALUNO" })).toBe(false);
    });
  });

  describe("getApiBaseUrl", () => {
    it("uses NEXT_PUBLIC_API_URL when configured and falls back to localhost", () => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.ifpe.edu.br");
      expect(getApiBaseUrl()).toBe("https://api.ifpe.edu.br");

      vi.stubEnv("NEXT_PUBLIC_API_URL", "");
      expect(getApiBaseUrl()).toBe("http://localhost:8000");
    });
  });

  describe("performLogout", () => {
    it("clears legacy token from localStorage and redirects to backend logout", () => {
      vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.ifpe.edu.br");
      localStorage.setItem("token", "legacy-jwt-token");

      const mockLocation = { href: "http://localhost:3000/mobile/aluno" };
      Object.defineProperty(window, "location", {
        configurable: true,
        value: mockLocation,
      });

      performLogout();

      expect(localStorage.getItem("token")).toBeNull();
      expect(mockLocation.href).toBe(
        "https://api.ifpe.edu.br/api/v1/auth/logout"
      );
    });
  });
});
